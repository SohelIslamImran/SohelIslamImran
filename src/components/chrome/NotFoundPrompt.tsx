import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
	accentOptions,
	applyAccent,
	applyThemeMode,
	useAppearance,
	type AccentId,
} from "../AccentSwitcher";
import { useCopyToClipboard } from "../motion/CopyButton";
import { cn } from "@/lib/utils";
import type { Destination } from "./lost-routes";
import { usePublicContent } from "./public-content";
import {
	completeTerminalInput,
	matchTerminalCommand,
	normalizeTerminalInput,
	resolveOpenTarget,
	runTerminalCommand,
	type TerminalLine,
} from "./terminal";
import { terminalContextFromContent, withCurrentClock } from "./terminal-context";
import { TerminalLineText } from "./TerminalLineText";
import { toggleXray } from "./xray";

type PromptEntry = (TerminalLine | { kind: "cmd"; text: string; description?: undefined }) & {
	id: number;
};

/** Keeps the trace log card from growing without limit. */
const MAX_ENTRIES = 40;
let entryId = 0;

/**
 * The 404 prompt: the palette's terminal, wired into the trace log. `open …`
 * reroutes the lost request; help, ls, whoami and the rest answer inline.
 */
export function NotFoundPrompt({
	destinations,
	onReroute,
}: {
	destinations: readonly Destination[];
	onReroute: (path: string) => void;
}) {
	const id = useId();
	const { content } = usePublicContent(true);
	const appearance = useAppearance();
	const { copy } = useCopyToClipboard();
	const [command, setCommand] = useState("open ");
	const [output, setOutput] = useState<PromptEntry[]>([]);
	const outputRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const context = useMemo(
		() =>
			terminalContextFromContent(content, {
				theme: appearance.theme,
				accent: appearance.accent,
				accents: accentOptions,
			}),
		[appearance.accent, appearance.theme, content],
	);

	useEffect(() => {
		const element = outputRef.current;
		if (element) element.scrollTop = element.scrollHeight;
		// The card grows with its first output; keep the field in view.
		if (output.length > 0) inputRef.current?.scrollIntoView({ block: "nearest" });
	}, [output]);

	const print = (lines: readonly (TerminalLine | PromptEntry)[]) =>
		setOutput((current) =>
			[...current, ...lines.map((line) => ({ ...line, id: (entryId += 1) }) as PromptEntry)].slice(
				-MAX_ENTRIES,
			),
		);

	const submit = () => {
		const input = normalizeTerminalInput(command);
		setCommand("");
		if (!input) return;
		const live = withCurrentClock(context);
		// A bare destination ("work", "/work/kuno") reads as "open …".
		const bareTarget =
			!matchTerminalCommand(input) &&
			(resolveOpenTarget(input, live) || destinations.some((item) => item.path === input));
		const line = bareTarget ? `open ${input}` : input;
		const [head = ""] = line.split(" ");
		const isOpen = matchTerminalCommand(line) === "open";
		const argument = line.slice(head.length).trim();
		const destination = isOpen ? destinations.find((item) => item.path === argument) : undefined;
		const result = destination
			? {
					lines: [{ kind: "muted" as const, text: `Opening ${destination.path} …` }],
					effect: { type: "navigate" as const, path: destination.path },
				}
			: runTerminalCommand(line, live);
		const effect = result.effect;
		if (effect?.type === "clear") {
			setOutput([]);
			return;
		}
		const lines: TerminalLine[] =
			isOpen && argument && !effect
				? [{ kind: "error", text: "No such route. Try open work." }]
				: effect?.type === "exit"
					? [{ kind: "muted", text: "Nothing to exit here. Try open home." }]
					: // The palette's help mentions search and exit, which this prompt lacks.
						result.lines
							.filter((item) => !("description" in item && item.text === "exit"))
							.map((item) =>
								item.text.startsWith("Plain words still search.")
									? { ...item, text: "A bare destination works too: try work." }
									: item,
							);
		print([{ kind: "cmd", text: line } as PromptEntry, ...lines]);
		switch (effect?.type) {
			case "navigate":
				onReroute(effect.path);
				return;
			case "external":
				if (/^mailto:/iu.test(effect.href)) window.location.href = effect.href;
				else window.open(effect.href, "_blank", "noopener,noreferrer");
				return;
			case "theme":
				void applyThemeMode(effect.mode, inputRef.current);
				return;
			case "accent":
				void applyAccent(effect.id as AccentId, inputRef.current);
				return;
			case "copy":
				void copy(effect.text).then((ok) =>
					print([
						ok
							? { kind: "accent", text: "Copied." }
							: { kind: "error", text: "Could not reach the clipboard." },
					]),
				);
				return;
			case "xray": {
				const on = toggleXray();
				print([{ kind: "accent", text: on ? "X-ray on." : "X-ray off." }]);
				return;
			}
		}
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== "Tab" || event.shiftKey) return;
		// Nothing typed yet (empty, or just the default "open "): Tab moves focus.
		if (!command.trim() || /^\s*open\s*$/iu.test(command)) return;
		let completed: string | null = null;
		if (/^\s*open\s+/iu.test(command)) {
			const prefix = command.replace(/^\s*open\s+/iu, "").toLowerCase();
			const match = destinations.find(
				(item) => item.path.startsWith(prefix) || item.label.toLowerCase().startsWith(prefix),
			);
			if (match) completed = `open ${match.path}`;
		}
		completed ??= completeTerminalInput(command, context);
		if (completed && completed !== command) {
			event.preventDefault();
			setCommand(completed);
		}
	};

	return (
		<>
			<div
				ref={outputRef}
				role="log"
				aria-live="polite"
				aria-label="Prompt output"
				className={cn(
					"max-h-[11.9em] overflow-y-auto lg:max-h-[6.6em] overscroll-contain [overflow-wrap:anywhere]",
					output.length > 0 && "mt-1",
				)}
			>
				{output.map((line) =>
					line.kind === "cmd" ? (
						<p key={line.id} className="m-0 mt-1.5 text-foreground first:mt-0">
							<span aria-hidden="true" className="text-primary-text">
								❯{" "}
							</span>
							<span className="sr-only">Command: </span>
							{line.text}
						</p>
					) : (
						<p
							key={line.id}
							className={cn(
								"m-0 whitespace-pre-wrap",
								line.kind === "out" && "text-ink-soft",
								line.kind === "muted" && "text-muted-foreground",
								line.kind === "error" && "text-destructive",
								line.kind === "accent" && "text-primary-text",
							)}
						>
							<TerminalLineText text={line.text} description={line.description} />
						</p>
					),
				)}
			</div>
			<form
				className="mt-3"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<label htmlFor={`${id}-prompt`} className="mono-label block text-muted-foreground">
					Send the request somewhere real
				</label>
				<div className="relative mt-2">
					<span
						aria-hidden="true"
						className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary-text"
					>
						❯
					</span>
					<input
						ref={inputRef}
						id={`${id}-prompt`}
						aria-describedby={`${id}-hint`}
						value={command}
						onChange={(event) => setCommand(event.target.value)}
						onKeyDown={onKeyDown}
						autoComplete="off"
						autoCapitalize="none"
						autoCorrect="off"
						spellCheck={false}
						enterKeyHint="go"
						className="min-h-11 w-full min-w-0 rounded-inner border border-line bg-surface-solid pr-3 pl-8 font-mono focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
					/>
				</div>
				<p id={`${id}-hint`} className="m-0 mt-2 text-[12px] text-muted-foreground">
					Tab completes a route. Enter runs it; help lists the rest. The reroute links also work.
				</p>
			</form>
		</>
	);
}
