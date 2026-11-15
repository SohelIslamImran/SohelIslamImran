import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { usePrefersReducedMotion } from "@/components/motion";
import { cn } from "@/lib/utils";
import { isAbort, useOnScreen, wait } from "./hooks";

export interface TerminalFacts {
	name: string;
	role: string;
	location: string;
	timeZone: string;
	email: string;
	now?: string;
	projects: { slug: string; title: string; summary: string }[];
	tools: string[];
	/** Shown when someone tries `sudo`. */
	rule?: string;
}

type Line = { id: number; kind: "cmd" | "out" | "muted" | "error" | "ghost"; text: string };

const COMMANDS = [
	"help",
	"whoami",
	"now",
	"ls",
	"open <project>",
	"stack",
	"time",
	"ghost",
	"clear",
];
const QUICK = ["whoami", "ls", "stack", "ghost"];

/**
 * Four frames of a small ghost drifting, as a nod to ghosttime (my terminal
 * animation CLI). Plain ASCII so it renders in any monospace font.
 */
const GHOST_FRAMES = [
	["   .-.   ", "  (o o)  ", "  | O |  ", "  |   |  ", "  '~~~'  "],
	["   .-.   ", "  (o o)  ", "  | o |  ", "  |   |  ", "  ~'~'~  "],
	["   .-.   ", "  (- -)  ", "  | o |  ", "  |   |  ", "  '~~~'  "],
	["   .-.   ", "  (o o)  ", "  | O |  ", "  |   |  ", "  ~'~'~  "],
];

let nextId = 0;
const line = (kind: Line["kind"], text: string): Line => ({ id: (nextId += 1), kind, text });

/**
 * A small working terminal. It types `whoami` once when it first scrolls into
 * view (not under reduced motion), then takes real input: Enter runs a
 * command, ↑/↓ walk the history, Tab completes. Quick-command chips give touch
 * users the same commands. Every answer comes from published content.
 */
export function MiniTerminal({ facts, className }: { facts: TerminalFacts; className?: string }) {
	const inputId = useId();
	const navigate = useNavigate();
	const rootRef = useRef<HTMLDivElement>(null);
	const logRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const onScreen = useOnScreen(rootRef, "0px");
	const reduceMotion = usePrefersReducedMotion();
	const [lines, setLines] = useState<Line[]>([line("muted", "Type help to see what I answer.")]);
	const [value, setValue] = useState("");
	const [typing, setTyping] = useState(false);
	const history = useRef<string[]>([]);
	const cursor = useRef(-1);
	const introDone = useRef(false);
	const ghostAbort = useRef<AbortController | null>(null);
	const navTimer = useRef<number | undefined>(undefined);

	useEffect(() => {
		const log = logRef.current;
		if (log) log.scrollTop = log.scrollHeight;
	}, [lines]);

	useEffect(
		() => () => {
			ghostAbort.current?.abort();
			window.clearTimeout(navTimer.current);
		},
		[],
	);
	useEffect(() => {
		if (!onScreen) ghostAbort.current?.abort();
	}, [onScreen]);

	const print = (...next: Line[]) => setLines((current) => [...current, ...next].slice(-60));

	const playGhost = async () => {
		ghostAbort.current?.abort();
		const abort = new AbortController();
		ghostAbort.current = abort;
		const id = (nextId += 1);
		const frames = reduceMotion ? [GHOST_FRAMES[0] ?? []] : GHOST_FRAMES;
		const cycles = reduceMotion ? 1 : 3;
		print({ id, kind: "ghost", text: (frames[0] ?? []).join("\n") });
		try {
			for (let round = 0; round < cycles * frames.length; round += 1) {
				const frame = frames[round % frames.length] ?? [];
				const shift = reduceMotion ? 0 : Math.round(Math.sin(round / 2) * 2) + 2;
				const text = frame.map((row) => " ".repeat(shift) + row).join("\n");
				setLines((current) => current.map((item) => (item.id === id ? { ...item, text } : item)));
				await wait(160, abort.signal);
			}
			print(line("muted", "boo. ghosttime plays the real one in your terminal."));
		} catch (error) {
			if (!isAbort(error)) throw error;
		}
	};

	const execute = (raw: string) => {
		const input = raw.trim();
		const echo = line("cmd", input);
		if (!input) {
			print(echo);
			return;
		}
		history.current = [input, ...history.current.filter((item) => item !== input)].slice(0, 20);
		cursor.current = -1;
		const [command = "", ...args] = input.split(/\s+/u);
		const name = command.toLowerCase();
		switch (name) {
			case "help":
				print(echo, line("out", COMMANDS.join("   ")));
				return;
			case "whoami":
				print(echo, line("out", `${facts.name} · ${facts.role}`), line("muted", facts.location));
				return;
			case "now":
				print(echo, line("out", facts.now || facts.role));
				return;
			case "ls":
				print(
					echo,
					...facts.projects.map((project) => line("out", project.slug)),
					line("muted", "Try: open " + (facts.projects[0]?.slug ?? "<project>")),
				);
				return;
			case "open":
			case "cd": {
				const target = (args[0] ?? "").toLowerCase().replace(/\/$/u, "");
				const project = facts.projects.find(
					(item) => item.slug.toLowerCase() === target || item.title.toLowerCase() === target,
				);
				if (!project) {
					print(
						echo,
						line("error", target ? `No project called ${target}. Try ls.` : "open what? Try ls."),
					);
					return;
				}
				print(echo, line("out", project.summary), line("muted", `Opening /work/${project.slug} …`));
				window.clearTimeout(navTimer.current);
				navTimer.current = window.setTimeout(() => {
					void navigate({ to: "/work/$slug", params: { slug: project.slug } });
				}, 650);
				return;
			}
			case "stack":
				print(echo, line("out", facts.tools.join(" · ")));
				return;
			case "time":
			case "date": {
				let text = "";
				try {
					text = new Intl.DateTimeFormat("en-GB", {
						timeZone: facts.timeZone,
						weekday: "short",
						hour: "2-digit",
						minute: "2-digit",
						timeZoneName: "short",
					}).format(new Date());
				} catch {
					text = "Clock unavailable.";
				}
				print(echo, line("out", text));
				return;
			}
			case "email":
			case "contact":
				print(echo, line("out", facts.email || "See the contact section below."));
				return;
			case "ghost":
			case "ghosttime":
				print(echo);
				void playGhost();
				return;
			case "sudo":
				print(
					echo,
					line("error", "Permission denied."),
					...(facts.rule ? [line("muted", facts.rule)] : []),
				);
				return;
			case "clear":
				setLines([]);
				return;
			default:
				print(echo, line("error", `command not found: ${name}. Type help.`));
		}
	};

	// Type `whoami` once, the first time the terminal is seen.
	useEffect(() => {
		if (!onScreen || introDone.current || reduceMotion) return;
		introDone.current = true;
		const abort = new AbortController();
		(async () => {
			setTyping(true);
			await wait(500, abort.signal);
			const word = "whoami";
			for (let index = 1; index <= word.length; index += 1) {
				setValue(word.slice(0, index));
				await wait(85 + Math.random() * 60, abort.signal);
			}
			await wait(260, abort.signal);
			setValue("");
			setTyping(false);
			execute(word);
		})().catch((error) => {
			setTyping(false);
			setValue("");
			if (!isAbort(error)) throw error;
		});
		return () => abort.abort();
		// `execute` reads the latest facts; the intro runs once.
	}, [onScreen, reduceMotion]);

	const onSubmit = (event: FormEvent) => {
		event.preventDefault();
		if (typing) return;
		execute(value);
		setValue("");
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "ArrowUp" || event.key === "ArrowDown") {
			const list = history.current;
			if (list.length === 0) return;
			event.preventDefault();
			const step = event.key === "ArrowUp" ? 1 : -1;
			cursor.current = Math.max(-1, Math.min(list.length - 1, cursor.current + step));
			setValue(cursor.current === -1 ? "" : (list[cursor.current] ?? ""));
		} else if (event.key === "Tab" && value.trim()) {
			const [head = "", arg] = value.split(/\s+/u);
			const pool =
				arg !== undefined
					? facts.projects.map((item) => `${head} ${item.slug}`)
					: ["help", "whoami", "now", "ls", "open ", "stack", "time", "ghost", "clear"];
			const match = pool.find((item) => item.startsWith(value) && item !== value);
			if (match) {
				event.preventDefault();
				setValue(match);
			}
		} else if (event.key === "l" && event.ctrlKey) {
			event.preventDefault();
			setLines([]);
		}
	};

	return (
		<div ref={rootRef} className={cn("terminal flex min-h-0 min-w-0 flex-col", className)}>
			<div className="flex items-center gap-1.5 border-b border-line px-4 py-3" aria-hidden="true">
				<span className="size-2.5 rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_16%,transparent)]" />
				<span className="size-2.5 rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_16%,transparent)]" />
				<span className="size-2.5 rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_16%,transparent)]" />
				<span className="mono-label ml-auto text-muted-foreground">~/sohel — zsh</span>
			</div>
			{/*
			 * One fixed-height scroller holds the output and the prompt, so the prompt
			 * always sits on the line after the last output, like a real terminal.
			 * Clicking anywhere in it focuses the prompt.
			 */}
			<div
				ref={logRef}
				onClick={() => inputRef.current?.focus({ preventScroll: true })}
				className="h-[244px] min-w-0 overflow-y-auto overscroll-contain px-4 pt-3 pb-2 font-mono text-[12.5px] leading-[1.6]"
			>
				<div role="log" aria-live="polite" aria-label="Terminal output" className="min-w-0">
					{lines.map((item) =>
						item.kind === "cmd" ? (
							<p key={item.id} className="m-0 text-foreground [overflow-wrap:anywhere]">
								<span aria-hidden="true" className="text-primary-text">
									❯{" "}
								</span>
								<span className="sr-only">Command: </span>
								{item.text}
							</p>
						) : item.kind === "ghost" ? (
							<div key={item.id}>
								<pre aria-hidden="true" className="m-0 my-1 font-mono text-primary-text">
									{item.text}
								</pre>
								<span className="sr-only">A small ASCII ghost drifts by.</span>
							</div>
						) : (
							<p
								key={item.id}
								className={cn(
									"m-0 [overflow-wrap:anywhere] whitespace-pre-wrap",
									item.kind === "out" && "text-ink-soft",
									item.kind === "muted" && "text-muted-foreground",
									item.kind === "error" && "text-destructive",
								)}
							>
								{item.text}
							</p>
						),
					)}
				</div>
				<form
					onSubmit={onSubmit}
					className="focus-within:outline-2 focus-within:outline-solid focus-within:outline-ring focus-within:outline-offset-2 flex items-center gap-2 font-mono text-[12.5px]"
				>
					<label htmlFor={inputId} className="text-primary-text">
						<span aria-hidden="true">❯</span>
						<span className="sr-only">Terminal command</span>
					</label>
					<input
						ref={inputRef}
						id={inputId}
						value={value}
						onChange={(event) => setValue(event.target.value)}
						onKeyDown={onKeyDown}
						readOnly={typing}
						autoComplete="off"
						autoCapitalize="off"
						autoCorrect="off"
						spellCheck={false}
						enterKeyHint="send"
						placeholder={typing ? "" : "help"}
						className="terminal-input min-h-7 min-w-0 flex-1 bg-transparent text-[16px] text-foreground caret-[var(--theme-accent-line)] outline-hidden placeholder:text-muted-foreground/70 sm:text-[12.5px]"
					/>
				</form>
			</div>
			<div className="mt-auto flex flex-wrap gap-1.5 border-t border-line px-3 py-2.5">
				{QUICK.map((command) => (
					<button
						key={command}
						type="button"
						onClick={() => {
							if (!typing) execute(command);
						}}
						className="pressable min-h-11 rounded-full px-3.5 font-mono text-[12px] text-muted-foreground transition-[background-color,color,scale] duration-200 pointer-fine:hover:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] pointer-fine:hover:text-foreground"
					>
						<span className="sr-only">Run </span>
						{command}
					</button>
				))}
			</div>
		</div>
	);
}
