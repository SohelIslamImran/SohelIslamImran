import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion";
import { cn } from "@/lib/utils";
import { isAbort, useOnScreen, wait } from "./hooks";

export type StageState = "idle" | "running" | "passed" | "reverted";
export type PipelineStatus = "idle" | "running" | "released" | "rolled-back";

export interface PipelineStage {
	id: string;
	title: string;
	check: string;
}

/** The change the pipeline ships: a real, visible edit to the page around it. */
export interface PipelineRelease {
	/** Version live before the change, e.g. "v1.4". */
	from: string;
	/** Version the change ships as, e.g. "v1.5". */
	to: string;
	/** What the change does, in a few words. */
	change: string;
}

const STATUS_TEXT: Record<PipelineStatus, string> = {
	idle: "Ready to ship",
	running: "Checks running",
	released: "Released",
	"rolled-back": "Rolled back",
};

function StageIcon({ state }: { state: StageState }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"relative grid size-7 shrink-0 place-items-center rounded-full border text-[12px] font-semibold transition-[background-color,border-color,color,scale] duration-300 ease-trace",
				state === "idle" && "border-line-strong bg-surface-solid text-muted-foreground",
				state === "running" && "border-primary-line bg-primary-soft text-primary-text",
				state === "passed" &&
					"scale-110 border-transparent bg-success text-[var(--theme-surface-solid)]",
				state === "reverted" && "border-line-strong bg-surface-raised text-muted-foreground",
			)}
		>
			{state === "running" ? <span className="pipeline-spinner" /> : null}
			{state === "passed" ? "✓" : null}
			{state === "reverted" ? "↺" : null}
		</span>
	);
}

/** The live version, crossfading when it changes. Fixed width, so nothing moves. */
function VersionTag({ version, reduceMotion }: { version: string; reduceMotion: boolean }) {
	return (
		<span className="relative inline-grid min-w-[4.5ch] overflow-hidden text-foreground">
			<AnimatePresence initial={false} mode="popLayout">
				<motion.span
					key={version}
					initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: "80%" }}
					animate={{ opacity: 1, y: 0 }}
					exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: "-80%" }}
					transition={{ duration: reduceMotion ? 0.12 : 0.42, ease: [0.22, 1, 0.36, 1] }}
					className="[grid-area:1/1]"
				>
					{version}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

/**
 * A small release pipeline. Each stage is one way I work, and its check is
 * the principle I hold there. "Ship a change" runs the checks in order and
 * then really ships `release`: `onShippedChange` lets the section show the
 * change on the page. The rollback switch takes it back out. It runs once by
 * itself when first seen (not under reduced motion). Announces each result
 * politely. `onStatesChange` lets the page light the matching notes below.
 */
export function ReleasePipeline({
	stages,
	release,
	onStatesChange,
	onShippedChange,
	className,
}: {
	stages: PipelineStage[];
	release: PipelineRelease;
	onStatesChange?: (states: StageState[]) => void;
	onShippedChange?: (shipped: boolean) => void;
	className?: string;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const onScreen = useOnScreen(rootRef, "-15% 0px");
	const reduceMotion = usePrefersReducedMotion();
	const [states, setStates] = useState<StageState[]>(() => stages.map(() => "idle"));
	const [status, setStatus] = useState<PipelineStatus>("idle");
	const [announce, setAnnounce] = useState("");
	const [shipped, setShipped] = useState(false);
	const controller = useRef<AbortController | null>(null);
	const autoRan = useRef(false);
	const count = stages.length;

	useEffect(() => {
		onStatesChange?.(states);
	}, [states, onStatesChange]);

	useEffect(() => {
		onShippedChange?.(shipped);
	}, [shipped, onShippedChange]);

	useEffect(() => () => controller.current?.abort(), []);

	const ship = async () => {
		autoRan.current = true;
		controller.current?.abort();
		const abort = new AbortController();
		controller.current = abort;
		const fast = reduceMotion;
		setStatus("running");
		setAnnounce(`Shipping ${release.to}. Checks running.`);
		let next: StageState[] = stages.map(() => "idle");
		setStates(next);
		try {
			for (let index = 0; index < count; index += 1) {
				next = next.map((state, position) => (position === index ? "running" : state));
				setStates(next);
				await wait(fast ? 0 : 640, abort.signal);
				next = next.map((state, position) => (position === index ? "passed" : state));
				setStates(next);
				await wait(fast ? 0 : 140, abort.signal);
			}
			setStatus("released");
			setShipped(true);
			setAnnounce(`All checks passed. ${release.to} is live. ${release.change}.`);
		} catch (error) {
			if (!isAbort(error)) throw error;
		}
	};

	const rollback = async (on: boolean) => {
		controller.current?.abort();
		const abort = new AbortController();
		controller.current = abort;
		const fast = reduceMotion;
		try {
			if (on) {
				let next = [...states];
				for (let index = count - 1; index >= 0; index -= 1) {
					next = next.map((state, position) => (position === index ? "reverted" : state));
					setStates(next);
					await wait(fast ? 0 : 110, abort.signal);
				}
				setStatus("rolled-back");
				setShipped(false);
				setAnnounce(`Rolled back. ${release.from} is live again and the change is gone.`);
			} else {
				let next = [...states];
				for (let index = 0; index < count; index += 1) {
					next = next.map((state, position) => (position === index ? "passed" : state));
					setStates(next);
					await wait(fast ? 0 : 110, abort.signal);
				}
				setStatus("released");
				setShipped(true);
				setAnnounce(`${release.to} is live again.`);
			}
		} catch (error) {
			if (!isAbort(error)) throw error;
		}
	};

	// Run once by itself the first time the pipeline is in view.
	useEffect(() => {
		if (!onScreen || autoRan.current || reduceMotion) return;
		// Mark it only when the run starts, so leaving view during the delay
		// lets it try again next time.
		const timer = window.setTimeout(() => {
			if (autoRan.current) return;
			void ship();
		}, 400);
		return () => window.clearTimeout(timer);
		// `ship` reads current state; the auto run happens once.
	}, [onScreen, reduceMotion]);

	const passed = states.filter((state) => state === "passed").length;
	const progress = count ? passed / count : 0;
	const rolledBack = status === "rolled-back";
	const canRollback = status === "released" || rolledBack;
	const live = shipped ? release.to : release.from;

	return (
		<div
			ref={rootRef}
			className={cn(
				"pipeline relative isolate min-w-0 overflow-hidden rounded-tile border border-line bg-surface-solid shadow-surface",
				className,
			)}
			data-status={status}
		>
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[clamp(20px,3vw,32px)] py-4">
				<div className="grid min-w-0 gap-1.5">
					<p className="mono-label m-0 flex items-center gap-2.5 text-muted-foreground">
						<span
							aria-hidden="true"
							className={cn(
								"size-2 rounded-full transition-colors duration-300",
								status === "released" && "bg-success",
								status === "running" && "bg-primary motion-safe:animate-ping-soft",
								status === "idle" && "bg-line-strong",
								rolledBack && "bg-signal",
							)}
						/>
						<span>Live</span>
						<span className="normal-case">
							<VersionTag version={live} reduceMotion={reduceMotion} />
						</span>
						<span aria-hidden="true">·</span>
						<span className="text-foreground">{STATUS_TEXT[status]}</span>
					</p>
					<p className="m-0 min-w-0 pl-[18px] text-[14px] leading-snug text-muted-foreground">
						{rolledBack ? <span className="text-foreground">Reverted: </span> : null}
						<span className={cn(rolledBack && "line-through decoration-1 opacity-75")}>
							<span
								className={cn(
									"font-mono text-[12.5px]",
									rolledBack ? "text-muted-foreground" : "text-primary-text",
								)}
							>
								{release.to}
							</span>{" "}
							{release.change}
						</span>
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<label
						className={cn(
							"inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full px-3 text-[14px] font-medium transition-opacity",
							!canRollback && "cursor-not-allowed opacity-50",
						)}
					>
						<span className="text-ink-soft">Roll back</span>
						<button
							type="button"
							role="switch"
							aria-checked={rolledBack}
							disabled={!canRollback}
							onClick={() => void rollback(!rolledBack)}
							className="pipeline-switch"
						/>
					</label>
					<button
						type="button"
						onClick={() => void ship()}
						disabled={status === "running"}
						className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-medium text-primary-foreground transition-[scale,opacity,box-shadow] duration-200 disabled:opacity-60 pointer-fine:hover:shadow-accent"
					>
						<span aria-hidden="true">↑</span>
						{status === "idle"
							? "Ship a change"
							: rolledBack
								? `Ship ${release.to} again`
								: "Ship again"}
					</button>
				</div>
			</div>

			<ol
				className="pipeline-track relative m-0 grid list-none gap-0 p-[clamp(20px,3vw,32px)] md:gap-4"
				style={{ "--count": count, "--p": progress } as CSSProperties}
			>
				<span aria-hidden="true" className="pipeline-rail" />
				<span aria-hidden="true" className="pipeline-fill" />
				{stages.map((stage, index) => {
					const state = states[index] ?? "idle";
					return (
						<li
							key={stage.id}
							data-state={state}
							className="pipeline-stage relative flex min-w-0 gap-4 py-3 md:flex-col md:gap-3 md:py-0"
						>
							<StageIcon state={state} />
							<div className="min-w-0">
								<p className="mono-label m-0 text-muted-foreground">
									Stage{" "}
									<span className="text-primary-text">{String(index + 1).padStart(2, "0")}</span>
									<span className="sr-only">, {stage.title}</span>
								</p>
								<p
									className={cn(
										"mt-1.5 mb-0 text-[15px] leading-snug font-medium transition-colors duration-300",
										state === "passed" ? "text-foreground" : "text-muted-foreground",
									)}
								>
									<span className="sr-only">Check: </span>
									{stage.check}
								</p>
							</div>
						</li>
					);
				})}
			</ol>
			<p className="sr-only" aria-live="polite">
				{announce}
			</p>
		</div>
	);
}
