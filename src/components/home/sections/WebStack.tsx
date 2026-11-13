import { useCallback, useEffect, useRef, useState } from "react";
import type { ExperienceContent } from "../../../types/content";
import { usePrefersReducedMotion } from "@/components/motion";
import { cn } from "@/lib/utils";
import { isAbort, useOnScreen, wait } from "./hooks";

/**
 * What one save does behind the window. Generic and illustrative on purpose:
 * no real product screens, endpoints, or data.
 */
const STEPS = [
	{ id: "request", label: "request" },
	{ id: "rule", label: "check rule" },
	{ id: "row", label: "write row" },
	{ id: "response", label: "200 OK" },
] as const;

const LAST = STEPS.length - 1;
/** -1: idle, 0..LAST: that step is running, LAST + 1: saved. */
const SAVED = STEPS.length;
const STEP_MS = 620;
const LOOP_REST_MS = 3400;

const SAVE_CSS = `
.ws-spin { display: inline-block; width: 9px; height: 9px; border-radius: 999px; border: 1.5px solid color-mix(in srgb, currentColor 30%, transparent); border-top-color: currentColor; }
.ws-step-dot { transition: background-color 240ms var(--theme-ease), box-shadow 240ms var(--theme-ease), scale 240ms var(--theme-ease); }
.ws-step[data-state="now"] .ws-step-dot { scale: 1.35; box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent); }
.ws-row { transition: background-color 500ms var(--theme-ease); }
@media (prefers-reduced-motion: no-preference) {
	.ws-spin { animation: ws-spin 760ms linear infinite; }
	.ws-step[data-state="now"] .ws-step-dot { animation: ws-ping 900ms var(--theme-ease) infinite; }
	.ws-toast[data-on] { animation: ws-toast 360ms var(--theme-ease) both; }
}
@keyframes ws-spin { to { rotate: 1turn; } }
@keyframes ws-ping { 50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--theme-accent) 6%, transparent); } }
@keyframes ws-toast { from { opacity: 0; translate: 0 4px; } }
`;

const bar = "block rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_9%,transparent)]";

/**
 * The current role as a living web product: a small, generic settings page in
 * a browser window. Pressing Save (or watching it play once it is on screen)
 * runs one request through the stack in a single status line: request, rule
 * check, row written, response. The role's published highlights sit below.
 */
export function WebStack({ role, className }: { role: ExperienceContent; className?: string }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const onScreen = useOnScreen(rootRef);
	const reduceMotion = usePrefersReducedMotion();
	// Server HTML shows a finished save, so the line reads complete without JS.
	const [phase, setPhase] = useState<number>(SAVED);
	const [manual, setManual] = useState(false);
	const [runId, setRunId] = useState(0);
	const [announce, setAnnounce] = useState("");

	const play = useCallback(async (signal: AbortSignal, loop: boolean, speak: boolean) => {
		do {
			setPhase(-1);
			await wait(loop ? 900 : 120, signal);
			for (let step = 0; step <= LAST; step += 1) {
				setPhase(step);
				await wait(STEP_MS, signal);
			}
			setPhase(SAVED);
			if (speak) setAnnounce("Saved. Request sent, rule checked, row written, 200 OK.");
			await wait(LOOP_REST_MS, signal);
		} while (loop);
	}, []);

	useEffect(() => {
		if (reduceMotion || !onScreen) return;
		const abort = new AbortController();
		play(abort.signal, !manual, manual).catch((error) => {
			if (!isAbort(error)) throw error;
		});
		return () => abort.abort();
	}, [reduceMotion, onScreen, manual, runId, play]);

	const save = () => {
		if (reduceMotion) {
			setPhase(SAVED);
			setAnnounce("Saved. Request sent, rule checked, row written, 200 OK.");
			return;
		}
		setAnnounce("");
		setManual(true);
		setRunId((value) => value + 1);
	};

	const busy = phase >= 0 && phase < SAVED;
	const saved = phase === SAVED;
	const highlights = role.highlights.map((item) => item.trim()).filter(Boolean);

	return (
		<div ref={rootRef} className={cn("grid min-w-0 gap-6", className)}>
			<style dangerouslySetInnerHTML={{ __html: SAVE_CSS }} />
			<div className="grid min-w-0 justify-items-center gap-3">
				<div
					role="group"
					aria-label="A small web app"
					data-par="1"
					className="w-full max-w-[420px] overflow-hidden rounded-[16px] border border-line-strong bg-surface-solid shadow-[0_24px_50px_-28px_color-mix(in_srgb,var(--theme-ink)_45%,transparent)]"
				>
					<div
						aria-hidden="true"
						className="flex h-7 items-center gap-[5px] border-b border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,var(--theme-surface-solid))] px-2.5"
					>
						{[0, 1, 2].map((dot) => (
							<span
								key={dot}
								className="size-[7px] rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_18%,transparent)]"
							/>
						))}
						<span className="ml-2.5 flex-1 truncate rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] px-2.5 py-0.5 font-mono text-[9.5px] leading-[1.4] text-muted-foreground">
							/settings
						</span>
					</div>
					<div className="grid grid-cols-[44px_minmax(0,1fr)] sm:grid-cols-[64px_minmax(0,1fr)]">
						<div aria-hidden="true" className="grid content-start gap-2 border-r border-line p-2.5">
							<span className={cn(bar, "h-1.5 w-full bg-primary-soft")} />
							<span className={cn(bar, "h-1.5 w-4/5")} />
							<span className={cn(bar, "h-1.5 w-3/5")} />
							<span className={cn(bar, "h-1.5 w-4/5")} />
						</div>
						<div className="grid min-w-0 gap-2.5 p-3">
							<div aria-hidden="true" className="grid gap-1.5">
								<span
									className={cn(
										bar,
										"h-2 w-2/5 bg-[color-mix(in_srgb,var(--theme-ink)_20%,transparent)]",
									)}
								/>
								<span className="flex h-7 items-center gap-1 rounded-[8px] border border-line px-2">
									<span className={cn(bar, "h-1.5 w-1/2")} />
									<span className="h-3 w-px bg-[var(--theme-accent-line)]" />
								</span>
							</div>
							<div
								aria-hidden="true"
								className="ws-row flex h-7 items-center justify-between gap-2 rounded-[8px] px-2"
								style={{
									backgroundColor:
										phase === 2
											? "color-mix(in srgb, var(--theme-accent) 12%, transparent)"
											: "color-mix(in srgb, var(--theme-ink) 4%, transparent)",
								}}
							>
								<span className={cn(bar, "h-1.5 w-1/3")} />
								<span className="size-3 rounded-full border border-line-strong" />
							</div>
							<div className="flex min-w-0 items-center justify-end gap-2.5">
								<span
									aria-hidden="true"
									className="ws-toast mr-auto inline-flex items-center gap-1 truncate text-[11px] text-muted-foreground"
									data-on={saved ? "" : undefined}
								>
									{saved ? (
										<>
											<span className="text-success">✓</span> Saved
										</>
									) : busy ? (
										"Saving…"
									) : (
										"Unsaved changes"
									)}
								</span>
								<button
									type="button"
									onClick={save}
									className="pressable relative inline-flex h-7 min-w-[64px] items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-[11.5px] font-semibold text-primary-foreground transition-[scale,opacity] duration-200 before:absolute before:-inset-2 before:content-['']"
								>
									{busy ? <span aria-hidden="true" className="ws-spin" /> : null}
									Save
									<span className="sr-only"> (demo: runs one request through the stack)</span>
								</button>
							</div>
						</div>
					</div>
				</div>

				<ol
					aria-label="What one save does"
					className="m-0 flex max-w-full list-none flex-nowrap items-center gap-x-3 p-0 font-mono text-[11px] whitespace-nowrap sm:text-[11.5px]"
				>
					{STEPS.map((step, index) => {
						const state = phase > index ? "done" : phase === index ? "now" : "idle";
						return (
							<li
								key={step.id}
								className="ws-step flex shrink-0 items-center gap-3"
								data-state={state}
							>
								{index > 0 ? (
									<span aria-hidden="true" className="h-px w-4 bg-line-strong max-sm:hidden" />
								) : null}
								<span
									className={cn(
										"inline-flex items-center gap-1.5 transition-colors duration-300",
										state === "idle" && "text-muted-foreground",
										state === "now" && "text-primary-text",
										state === "done" && (index === LAST ? "text-success" : "text-ink-soft"),
									)}
								>
									<span
										aria-hidden="true"
										className={cn(
											"ws-step-dot size-1.5 rounded-full",
											state === "idle"
												? "bg-[color-mix(in_srgb,var(--theme-ink)_22%,transparent)]"
												: state === "now"
													? "bg-[var(--theme-accent-line)]"
													: "bg-current",
										)}
									/>
									{step.label}
								</span>
							</li>
						);
					})}
				</ol>
				<p className="sr-only" aria-live="polite">
					{announce}
				</p>
			</div>

			{highlights.length > 0 ? (
				<ul aria-label="What I work on" className="m-0 grid list-none gap-2.5 p-0">
					{highlights.map((item) => (
						<li
							key={item}
							className="grid grid-cols-[14px_minmax(0,1fr)] gap-2 text-[15px] leading-[1.5] text-ink-soft"
						>
							<span
								aria-hidden="true"
								className="mt-[0.7em] h-px w-2.5 bg-[var(--theme-accent-line)]"
							/>
							{item}
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
