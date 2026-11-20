import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { ExperienceContent } from "../../../types/content";
import { usePrefersReducedMotion } from "@/components/motion";
import { cn } from "@/lib/utils";
import { isAbort, useOnScreen, wait } from "./hooks";

/**
 * One invite, end to end. Generic and illustrative on purpose: no real
 * product screens, endpoints, or data.
 */
const EMAIL = "maya@acme.co";
const SEATS = 3;
const TOTAL_MS = 84;

/** The request's spans, in milliseconds from the start of the request. */
const SPANS = [
	{ id: "auth", name: "auth.can(invite)", start: 5, duration: 4 },
	{ id: "seats", name: "pg.seats.count", start: 11, duration: 9 },
	{ id: "insert", name: "pg.invites.insert", start: 23, duration: 17 },
	{ id: "queue", name: "redis.enqueue(email)", start: 44, duration: 5 },
] as const;

const LAST = SPANS.length - 1;
/** -2: idle, -1: typing, 0..LAST: that span is running, LAST + 1: done. */
const IDLE = -2;
const TYPING = -1;
const DONE = SPANS.length;
const TYPE_MS = 52;
const SPAN_MS = 520;
const LOOP_REST_MS = 3600;
const ANNOUNCE =
	"Invite sent. Permission checked, seats counted, invite row written, email job queued. 201 Created in 84 milliseconds.";

const STACK_CSS = `
.ws-spin { display: inline-block; width: 9px; height: 9px; border-radius: 999px; border: 1.5px solid color-mix(in srgb, currentColor 30%, transparent); border-top-color: currentColor; }
.ws-bar { transform-origin: left center; transition: scale 0ms linear, opacity 200ms var(--theme-ease); }
.ws-bar[data-state="now"], .ws-bar[data-state="done"] { scale: 1 1; opacity: 1; }
.ws-bar[data-state="idle"] { scale: 0 1; opacity: 0; }
.ws-newrow { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 420ms var(--theme-ease); }
.ws-newrow[data-on] { grid-template-rows: 1fr; }
.ws-caret { opacity: 1; }
@media (prefers-reduced-motion: no-preference) {
	.ws-spin { animation: ws-spin 760ms linear infinite; }
	.ws-bar[data-state="now"] { transition: scale var(--d, 520ms) cubic-bezier(0.3, 0.7, 0.4, 1), opacity 160ms var(--theme-ease); }
	.ws-caret[data-blink] { animation: ws-blink 1s steps(1, end) infinite; }
	.ws-pop { animation: ws-pop 360ms var(--theme-ease) both; }
}
@media (prefers-reduced-motion: reduce) {
	.ws-newrow { transition: none; }
}
@keyframes ws-spin { to { rotate: 1turn; } }
@keyframes ws-blink { 50% { opacity: 0; } }
@keyframes ws-pop { from { opacity: 0; scale: 0.92; } }
`;

const bar = "block rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_9%,transparent)]";

const MEMBERS = [
	{
		initials: "AK",
		tone: "bg-[color-mix(in_srgb,#f59e0b_26%,var(--theme-surface-solid))] text-[color-mix(in_srgb,#b45309_80%,var(--theme-ink))]",
		role: "Admin",
		width: "w-[46%]",
	},
	{
		initials: "JL",
		tone: "bg-[color-mix(in_srgb,#10b981_24%,var(--theme-surface-solid))] text-[color-mix(in_srgb,#047857_80%,var(--theme-ink))]",
		role: "Member",
		width: "w-[38%]",
	},
	{
		initials: "RS",
		tone: "bg-[color-mix(in_srgb,#a855f7_22%,var(--theme-surface-solid))] text-[color-mix(in_srgb,#7e22ce_78%,var(--theme-ink))]",
		role: "Member",
		width: "w-[52%]",
	},
] as const;

/**
 * The current role as a living web product: a small team page where one
 * teammate gets invited. The email types itself, Invite is pressed, and a
 * trace card floating beside the window shows what the request did, span by
 * span (permission check, seat count, row written, email job queued), before
 * the new teammate slides into the list. It plays while on screen; pressing
 * Invite replays it once. The role's published highlights sit below.
 */
export function WebStack({ role, className }: { role: ExperienceContent; className?: string }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const onScreen = useOnScreen(rootRef);
	const reduceMotion = usePrefersReducedMotion();
	// Server HTML shows a finished invite, so everything reads complete without JS.
	const [phase, setPhase] = useState<number>(DONE);
	const [typed, setTyped] = useState(EMAIL.length);
	const [pressed, setPressed] = useState(false);
	const [manual, setManual] = useState(false);
	const [runId, setRunId] = useState(0);
	const [announce, setAnnounce] = useState("");

	const play = useCallback(async (signal: AbortSignal, loop: boolean, speak: boolean) => {
		do {
			setPhase(IDLE);
			setTyped(0);
			await wait(loop ? 800 : 140, signal);
			setPhase(TYPING);
			for (let count = 1; count <= EMAIL.length; count += 1) {
				setTyped(count);
				await wait(TYPE_MS, signal);
			}
			await wait(220, signal);
			setPressed(true);
			await wait(160, signal);
			setPressed(false);
			for (let span = 0; span <= LAST; span += 1) {
				setPhase(span);
				await wait(SPAN_MS, signal);
			}
			setPhase(DONE);
			if (speak) setAnnounce(ANNOUNCE);
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

	const invite = () => {
		if (reduceMotion) {
			setTyped(EMAIL.length);
			setPhase(DONE);
			setAnnounce(ANNOUNCE);
			return;
		}
		setAnnounce("");
		setManual(true);
		setRunId((value) => value + 1);
	};

	const running = phase >= 0 && phase < DONE;
	const done = phase === DONE;
	const inserted = phase > 2 || done;
	const queued = done;
	const seatsLeft = inserted ? SEATS - 1 : SEATS;
	const highlights = role.highlights.map((item) => item.trim()).filter(Boolean);
	const spanState = (index: number) => (phase > index ? "done" : phase === index ? "now" : "idle");
	const totalRun = (LAST + 1) * SPAN_MS;

	return (
		<div ref={rootRef} className={cn("grid min-w-0 gap-6", className)}>
			<style dangerouslySetInnerHTML={{ __html: STACK_CSS }} />
			<div className="grid min-w-0 items-start gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
				{/* The app */}
				<div
					role="group"
					aria-label="A small web app: invite a teammate"
					data-par="1"
					className="relative z-0 w-full min-w-0 overflow-hidden rounded-[16px] border border-line-strong bg-surface-solid shadow-[0_24px_50px_-28px_color-mix(in_srgb,var(--theme-ink)_45%,transparent)]"
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
							/settings/team
						</span>
					</div>
					<div className="grid min-w-0 gap-2.5 p-3 sm:pr-6">
						<div className="flex min-w-0 items-center justify-between gap-2">
							<span className="text-[12px] font-semibold tracking-tight text-foreground">Team</span>
							<span
								key={seatsLeft}
								className="ws-pop font-mono text-[9.5px] text-muted-foreground tabular-nums"
							>
								{seatsLeft} seats left
							</span>
						</div>
						<div className="flex min-w-0 items-center gap-1.5">
							<span
								aria-hidden="true"
								className="flex h-7 min-w-0 flex-1 items-center rounded-[8px] border border-line px-2 font-mono text-[10.5px] text-ink-soft"
							>
								{typed === 0 ? (
									<span className="truncate text-muted-foreground">name@company.com</span>
								) : (
									<span className="truncate">{EMAIL.slice(0, typed)}</span>
								)}
								{phase === IDLE || phase === TYPING ? (
									<span
										className="ws-caret ml-px h-3 w-px shrink-0 bg-[var(--theme-accent-line)]"
										data-blink={phase === IDLE ? "" : undefined}
									/>
								) : null}
							</span>
							<span
								aria-hidden="true"
								className="hidden h-7 shrink-0 items-center gap-1 rounded-[8px] border border-line px-2 text-[10.5px] text-ink-soft min-[400px]:inline-flex"
							>
								Member
								<svg viewBox="0 0 10 10" className="size-2" fill="none">
									<path
										d="M2 3.5l3 3 3-3"
										stroke="currentColor"
										strokeWidth="1.3"
										strokeLinecap="round"
									/>
								</svg>
							</span>
							<button
								type="button"
								onClick={invite}
								data-pressed={pressed || undefined}
								className="pressable relative inline-flex h-7 min-w-[62px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-[11.5px] font-semibold text-primary-foreground transition-[scale,opacity] duration-150 before:absolute before:-inset-2 before:content-[''] data-pressed:scale-[0.94]"
							>
								{running ? <span aria-hidden="true" className="ws-spin" /> : null}
								Invite
								<span className="sr-only"> (demo: runs one invite through the stack)</span>
							</button>
						</div>
						<ul
							aria-hidden="true"
							className="m-0 grid h-[100px] list-none content-start overflow-hidden p-0"
						>
							<li className="ws-newrow" data-on={inserted ? "" : undefined}>
								<span className="min-h-0 overflow-hidden">
									<span className="flex h-[25px] items-center gap-2 border-b border-line">
										<span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-primary-soft text-[8.5px] font-semibold text-primary-text">
											M
										</span>
										<span className="min-w-0 flex-1 truncate font-mono text-[10px] text-foreground">
											{EMAIL}
										</span>
										<span
											className={cn(
												"inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[9.5px] font-medium",
												queued ? "bg-success/12 text-success" : "bg-primary-soft text-primary-text",
											)}
										>
											{queued ? "✓ Invited" : "Sending…"}
										</span>
									</span>
								</span>
							</li>
							{MEMBERS.map((member) => (
								<li
									key={member.initials}
									className="flex h-[25px] shrink-0 items-center gap-2 border-b border-line last:border-b-0"
								>
									<span
										className={cn(
											"grid size-[18px] shrink-0 place-items-center rounded-full text-[8.5px] font-semibold",
											member.tone,
										)}
									>
										{member.initials}
									</span>
									<span className={cn(bar, "h-1.5", member.width)} />
									<span className="ml-auto shrink-0 text-[9.5px] text-muted-foreground">
										{member.role}
									</span>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* The request behind it */}
				<figure
					data-par="2"
					className="relative z-[1] m-0 min-w-0 rounded-[14px] border border-line-strong bg-[color-mix(in_srgb,var(--theme-surface-solid)_92%,transparent)] p-3 shadow-[0_28px_60px_-30px_color-mix(in_srgb,var(--theme-ink)_55%,transparent)] backdrop-blur-md sm:-ml-4 sm:mt-12"
				>
					<figcaption className="flex min-w-0 items-center justify-between gap-2 font-mono text-[10px]">
						<span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
							<span
								aria-hidden="true"
								className="size-1.5 shrink-0 rounded-full bg-[var(--theme-accent-line)]"
							/>
							<span className="truncate uppercase tracking-[0.08em]">Trace</span>
						</span>
						<span
							key={done ? "done" : "run"}
							className={cn(
								"ws-pop shrink-0 tabular-nums",
								done ? "text-success" : running ? "text-primary-text" : "text-muted-foreground",
							)}
						>
							{done ? `201 · ${TOTAL_MS}ms` : running ? "running…" : "waiting"}
						</span>
					</figcaption>
					<ol
						aria-label={`What one invite does, ${TOTAL_MS} milliseconds in total`}
						className="m-0 mt-2.5 grid list-none gap-1.5 p-0 font-mono text-[10px]"
					>
						<SpanRow
							name="POST /invites"
							start={0}
							duration={TOTAL_MS}
							depth={0}
							state={done ? "done" : running ? "now" : "idle"}
							runMs={totalRun}
						/>
						{SPANS.map((span, index) => (
							<SpanRow
								key={span.id}
								name={span.name}
								start={span.start}
								duration={span.duration}
								depth={1}
								state={spanState(index)}
								runMs={SPAN_MS - 80}
							/>
						))}
					</ol>
				</figure>
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

function SpanRow({
	name,
	start,
	duration,
	depth,
	state,
	runMs,
}: {
	name: string;
	start: number;
	duration: number;
	depth: 0 | 1;
	state: "idle" | "now" | "done";
	runMs: number;
}) {
	return (
		<li className="grid min-w-0 grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_2.2rem] items-center gap-2">
			<span
				className={cn(
					"min-w-0 truncate transition-colors duration-300",
					depth === 1 && "pl-2.5",
					state === "idle"
						? "text-muted-foreground"
						: state === "now"
							? "text-primary-text"
							: "text-ink-soft",
				)}
			>
				{name}
			</span>
			<span
				aria-hidden="true"
				className="relative h-2 min-w-0 rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]"
			>
				<span
					data-state={state}
					className={cn(
						"ws-bar absolute inset-y-0 rounded-full",
						depth === 0
							? "bg-[color-mix(in_srgb,var(--theme-accent)_35%,transparent)]"
							: "bg-[var(--theme-accent-line)]",
					)}
					style={
						{
							left: `${(start / TOTAL_MS) * 100}%`,
							width: `max(3px, ${(duration / TOTAL_MS) * 100}%)`,
							"--d": `${runMs}ms`,
						} as CSSProperties
					}
				/>
			</span>
			<span
				className={cn(
					"text-right tabular-nums transition-opacity duration-300",
					state === "done" ? "text-muted-foreground opacity-100" : "opacity-0",
				)}
			>
				{duration}ms
			</span>
		</li>
	);
}
