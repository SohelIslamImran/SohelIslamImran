import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { cn } from "../../lib/utils";
import { usePrefersReducedMotion } from "../motion";
import { ghostChar, ghostRows } from "./poster-art";

const FRAME_MS = 90;
/** One run: the ghost draws in row by row, then the shimmer rolls through it. */
const DRAW_FRAMES = ghostRows.length * 2;
const RUN_FRAMES = DRAW_FRAMES + 64;
const COLUMNS = ghostRows[0]?.length ?? 16;
const RUN_COMMANDS = new Set(["ghosttime", "npx ghosttime", "bunx ghosttime"]);

type State = "idle" | "playing" | "paused" | "blurred" | "done";

/** Plain-text rows for one frame, plus which cells the shimmer band lights. */
function frameRows(frame: number, still: boolean) {
	const shown = still ? ghostRows.length : Math.min(ghostRows.length, Math.ceil(frame / 2));
	const band = still ? -99 : frame - DRAW_FRAMES;
	return ghostRows.map((_row, rowIndex) =>
		Array.from({ length: COLUMNS }, (_unused, column) => {
			const char = rowIndex < shown ? ghostChar(rowIndex, column) : null;
			const distance = column + rowIndex * 0.6 - (band % 34);
			return { char: char ?? " ", lit: !!char && distance >= 0 && distance < 3.2 };
		}),
	);
}

/**
 * A small replay of ghosttime in the browser. Type `ghosttime` (or press
 * Replay) to run it. Like the real CLI, it pauses when the window loses focus
 * and resumes when focus returns; it also stops off-screen. Under reduced
 * motion it shows a still frame. Runs a few seconds, then waits.
 */
export function GhostReplay() {
	const reduceMotion = usePrefersReducedMotion();
	const rootRef = useRef<HTMLDivElement>(null);
	const inputId = useId();
	const [frame, setFrame] = useState(0);
	const [state, setState] = useState<State>("idle");
	const [value, setValue] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [onScreen, setOnScreen] = useState(false);
	const autoplayed = useRef(false);

	const play = useCallback(() => {
		setMessage(null);
		if (reduceMotion) {
			setFrame(RUN_FRAMES);
			setState("done");
			return;
		}
		setFrame(0);
		setState("playing");
	}, [reduceMotion]);

	// First time it scrolls into view, run once (not under reduced motion).
	useEffect(() => {
		const root = rootRef.current;
		if (!root || typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(
			([entry]) => setOnScreen(entry?.isIntersecting ?? false),
			{ threshold: 0.4 },
		);
		observer.observe(root);
		return () => observer.disconnect();
	}, []);
	useEffect(() => {
		if (!onScreen || autoplayed.current) return;
		autoplayed.current = true;
		play();
	}, [onScreen, play]);

	// The ghosttime trick: pause when the window loses focus, resume when it returns.
	useEffect(() => {
		const onBlur = () => setState((current) => (current === "playing" ? "blurred" : current));
		const onFocus = () => setState((current) => (current === "blurred" ? "playing" : current));
		window.addEventListener("blur", onBlur);
		window.addEventListener("focus", onFocus);
		return () => {
			window.removeEventListener("blur", onBlur);
			window.removeEventListener("focus", onFocus);
		};
	}, []);

	useEffect(() => {
		if (state !== "playing" || !onScreen) return;
		const timer = window.setInterval(() => {
			setFrame((current) => Math.min(current + 1, RUN_FRAMES));
		}, FRAME_MS);
		return () => window.clearInterval(timer);
	}, [state, onScreen]);
	useEffect(() => {
		if (frame >= RUN_FRAMES) setState((current) => (current === "playing" ? "done" : current));
	}, [frame]);

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const command = value.trim().replace(/\s+/g, " ");
		setValue("");
		if (!command) return;
		if (RUN_COMMANDS.has(command.toLowerCase())) play();
		else if (command === "clear") {
			setFrame(0);
			setState("idle");
			setMessage(null);
		} else if (command === "help") setMessage("Try: ghosttime");
		else setMessage(`command not found: ${command.slice(0, 32)}`);
	};

	// Idle (and without JS) shows the finished ghost, so the artwork is always there.
	const rows = frameRows(frame, reduceMotion || state === "idle" || state === "done");
	const status =
		state === "playing"
			? "Playing"
			: state === "blurred"
				? "Paused: the window lost focus"
				: state === "paused"
					? "Paused"
					: state === "done"
						? reduceMotion
							? "Still frame (reduced motion)"
							: "Done"
						: "Ready";

	return (
		<div data-slot="ghost-replay" className="grid min-w-0 gap-4">
			<div
				ref={rootRef}
				className="min-w-0 overflow-hidden rounded-tile border border-line bg-surface-solid shadow-surface"
			>
				<div className="flex min-w-0 items-center gap-3 border-b border-line px-4 py-2.5">
					<span aria-hidden="true" className="flex gap-1.5">
						<span className="size-2.5 rounded-full bg-[#ff5f57]" />
						<span className="size-2.5 rounded-full bg-[#febc2e]" />
						<span className="size-2.5 rounded-full bg-[#28c840]" />
					</span>
					<span className="mono-label min-w-0 flex-1 truncate text-center text-muted-foreground">
						ghosttime
					</span>
					<span aria-live="polite" className="mono-label shrink-0 text-muted-foreground">
						<span
							aria-hidden="true"
							className={cn(
								"mr-1.5 inline-block size-1.5 translate-y-[-1px] rounded-full",
								state === "playing" ? "bg-success" : "bg-line-strong",
							)}
						/>
						{status}
					</span>
				</div>
				<div className="grid min-w-0 gap-3 px-4 pt-4 pb-3 font-mono text-[13px] sm:px-6 sm:pt-5">
					<p className="m-0 min-w-0 text-foreground">
						<span className="text-primary-text">$</span> ghosttime
					</p>
					<pre
						aria-hidden="true"
						className="m-0 grid h-[calc(12*1.15em+16px)] content-start justify-center overflow-hidden py-2 text-[clamp(14px,3.8vw,24px)] leading-[1.15] font-semibold tracking-[0.12em] text-[color-mix(in_srgb,var(--theme-ink)_55%,transparent)]"
					>
						{rows.map((row, rowIndex) => (
							// Rows are fixed positions in a fixed grid.
							// oxlint-disable-next-line no-array-index-key
							<span key={rowIndex} className="block whitespace-pre">
								{row.map((cell, column) =>
									cell.lit ? (
										// oxlint-disable-next-line no-array-index-key
										<span key={column} className="text-primary-text">
											{cell.char}
										</span>
									) : (
										cell.char
									),
								)}
							</span>
						))}
					</pre>
					<p className="sr-only">An ASCII ghost drawn in the terminal.</p>
					{message ? <p className="m-0 text-muted-foreground">{message}</p> : null}
				</div>
				<form
					onSubmit={submit}
					className="focus-within:outline-2 focus-within:outline-solid focus-within:outline-ring focus-within:outline-offset-2 flex min-w-0 items-center gap-2 border-t border-line px-4 py-2 font-mono text-[14px] sm:px-6"
				>
					<label htmlFor={inputId} className="text-primary-text">
						<span aria-hidden="true">$</span>
						<span className="sr-only">Command</span>
					</label>
					<input
						id={inputId}
						value={value}
						onChange={(event) => setValue(event.target.value)}
						placeholder="type ghosttime, press Enter"
						autoComplete="off"
						autoCapitalize="off"
						spellCheck={false}
						enterKeyHint="go"
						className="min-h-11 min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-hidden placeholder:text-muted-foreground sm:text-[14px]"
					/>
				</form>
			</div>
			<div className="flex min-w-0 flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={play}
					className="pressable inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-[14px] font-medium text-foreground transition-[background-color,scale] duration-200 ease-trace pointer-fine:hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 16 16"
						className="size-4"
						fill="none"
						stroke="currentColor"
						strokeWidth={1.6}
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" />
						<path d="M2.5 2.5v3h3" />
					</svg>
					Replay
				</button>
				{!reduceMotion && (state === "playing" || state === "paused" || state === "blurred") ? (
					<button
						type="button"
						aria-pressed={state !== "playing"}
						onClick={() => setState((current) => (current === "playing" ? "paused" : "playing"))}
						className="pressable inline-flex min-h-11 items-center rounded-full px-4 text-[14px] font-medium text-ink-soft transition-[background-color,scale] duration-200 ease-trace pointer-fine:hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]"
					>
						{state === "playing" ? "Pause" : "Resume"}
					</button>
				) : null}
				{reduceMotion ? null : (
					<p className="m-0 min-w-0 flex-1 text-caption text-muted-foreground sm:text-right">
						Switch to another window while it plays and it pauses, like the real one.
					</p>
				)}
			</div>
		</div>
	);
}
