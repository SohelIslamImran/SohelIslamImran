import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/components/motion";
import { cn } from "@/lib/utils";
import { isAbort, useOnScreen, wait } from "./hooks";

type Platform = "android" | "ios";
type Step =
	| "idle"
	| "checking"
	| "available"
	| "downloading"
	| "ready"
	| "restarting"
	| "done"
	| "store";

/** The visible step list for each platform, in order. */
const STAGES: Record<Platform, { id: string; label: string; steps: Step[] }[]> = {
	android: [
		{ id: "check", label: "Check", steps: ["checking", "available"] },
		{ id: "download", label: "Download", steps: ["downloading", "ready"] },
		{ id: "restart", label: "Restart", steps: ["restarting", "done"] },
	],
	ios: [
		{ id: "check", label: "Check", steps: ["checking", "available"] },
		{ id: "store", label: "App Store", steps: ["store"] },
	],
};

const ANNOUNCE: Record<Step, string> = {
	idle: "",
	checking: "Checking for an update.",
	available: "An update is available.",
	downloading: "Downloading the update.",
	ready: "Update downloaded. Restart to finish.",
	restarting: "Restarting the app.",
	done: "The app is up to date.",
	store: "Opening the App Store page.",
};

function stageIndex(platform: Platform, step: Step) {
	return STAGES[platform].findIndex((stage) => stage.steps.includes(step));
}

/**
 * A 3D phone that plays the flow expo-in-app-updates gives an Expo app:
 * Android checks Play Core, downloads in the background, and restarts; iOS
 * looks the version up and sends people to the App Store. It plays itself
 * while on screen (never under reduced motion) and can be replayed, switched
 * between platforms, and stepped by keyboard. The device art is decorative;
 * the step list beside it carries the meaning.
 */
export function UpdatePhone({
	className,
	compact = false,
}: {
	className?: string;
	compact?: boolean;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const onScreen = useOnScreen(rootRef);
	const reduceMotion = usePrefersReducedMotion();
	const [platform, setPlatform] = useState<Platform>("android");
	const [step, setStep] = useState<Step>("available");
	const [progress, setProgress] = useState(0);
	const [announce, setAnnounce] = useState("");
	const [manual, setManual] = useState(false);
	const [runId, setRunId] = useState(0);
	const controller = useRef<AbortController | null>(null);

	const run = useCallback(
		async (target: Platform, signal: AbortSignal, speak: boolean, loop: boolean) => {
			const show = (next: Step) => {
				setStep(next);
				if (speak) setAnnounce(ANNOUNCE[next]);
			};
			do {
				setProgress(0);
				show("idle");
				await wait(700, signal);
				show("checking");
				await wait(1100, signal);
				show("available");
				await wait(1500, signal);
				if (target === "android") {
					show("downloading");
					for (let value = 0; value <= 100; value += 4) {
						setProgress(value);
						await wait(56, signal);
					}
					show("ready");
					await wait(1500, signal);
					show("restarting");
					await wait(1000, signal);
					show("done");
				} else {
					show("store");
				}
				await wait(2600, signal);
				speak = false;
			} while (loop);
		},
		[],
	);

	// Autoplay: loop the chosen platform while on screen.
	useEffect(() => {
		if (reduceMotion || !onScreen) return;
		const abort = new AbortController();
		controller.current = abort;
		run(platform, abort.signal, manual, true).catch((error) => {
			if (!isAbort(error)) throw error;
		});
		return () => abort.abort();
	}, [reduceMotion, onScreen, platform, run, runId, manual]);

	const choosePlatform = (next: Platform) => {
		setManual(true);
		setPlatform(next);
		if (reduceMotion) {
			setStep("available");
			setAnnounce(`${next === "android" ? "Android" : "iOS"} flow. ${ANNOUNCE.available}`);
		}
		setRunId((value) => value + 1);
	};

	/** Reduced motion and keyboard friendly: advance one step per press. */
	const stepForward = () => {
		setManual(true);
		const order: Step[] =
			platform === "android"
				? ["checking", "available", "downloading", "ready", "restarting", "done"]
				: ["checking", "available", "store"];
		const next = order[(order.indexOf(step) + 1) % order.length] ?? "checking";
		if (next === "downloading") setProgress(60);
		if (next === "ready" || next === "done") setProgress(100);
		setStep(next);
		setAnnounce(ANNOUNCE[next]);
	};

	const replay = () => {
		setManual(true);
		setRunId((value) => value + 1);
	};

	const current = stageIndex(platform, step);
	const sheetUp = step === "available" || step === "downloading";
	const snackbar = step === "ready";

	return (
		<div
			ref={rootRef}
			className={cn("grid min-w-0", compact ? "justify-items-center gap-3" : "gap-6", className)}
		>
			<div
				className="phone-stage"
				aria-hidden="true"
				data-par="1"
				data-size={compact ? "sm" : undefined}
			>
				<div className="phone" data-platform={platform} data-step={step}>
					<div className="phone-edge" />
					<div className="phone-body">
						<div className="phone-screen">
							<div className="phone-notch" />
							<div className="phone-app">
								<div className="flex items-center justify-between px-3.5 pt-9">
									<span className="h-2 w-14 rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_22%,transparent)]" />
									<span className="size-5 rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_10%,transparent)]" />
								</div>
								<div className="mx-3.5 mt-4 h-[74px] rounded-[14px] bg-primary-soft" />
								<div className="mx-3.5 mt-3 grid gap-2">
									{[88, 64, 76, 52].map((width) => (
										<span
											key={width}
											className="h-2 rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_9%,transparent)]"
											style={{ width: `${width}%` }}
										/>
									))}
								</div>
								<div className="mx-3.5 mt-4 grid grid-cols-2 gap-2">
									<span className="h-14 rounded-[12px] bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)]" />
									<span className="h-14 rounded-[12px] bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)]" />
								</div>
								{step === "checking" ? (
									<div className="absolute inset-x-0 top-9 flex justify-center">
										<span className="phone-pill">
											<span className="phone-spinner" /> Checking for updates
										</span>
									</div>
								) : null}
								{step === "done" ? (
									<div className="absolute inset-x-0 top-9 flex justify-center">
										<span className="phone-pill">
											<span className="text-success">✓</span> Up to date
										</span>
									</div>
								) : null}
							</div>
							<div className="phone-splash" data-on={step === "restarting" ? "" : undefined}>
								<span className="phone-spinner" />
							</div>
							<div className="phone-store" data-on={step === "store" ? "" : undefined}>
								<span className="mono-label text-muted-foreground">App Store</span>
								<span className="mt-3 size-12 rounded-[12px] bg-primary-soft" />
								<span className="mt-2 h-2 w-20 rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_22%,transparent)]" />
								<span className="mt-4 rounded-full bg-primary px-4 py-1 text-[11px] font-semibold text-primary-foreground">
									Update
								</span>
							</div>
						</div>
					</div>
					{/* Layers that float in front of the glass. */}
					<div className="phone-sheet" data-on={sheetUp ? "" : undefined}>
						<span className="mx-auto mb-2.5 block h-1 w-8 rounded-full bg-line-strong" />
						<span className="block text-[12.5px] font-semibold text-foreground">
							Update available
						</span>
						<span className="mt-0.5 block text-[10.5px] leading-snug text-muted-foreground">
							A new version is ready.
						</span>
						{step === "downloading" ? (
							<span className="mt-3 block">
								<span className="block h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_10%,transparent)]">
									<span
										className="block h-full origin-left rounded-full bg-primary"
										style={{ transform: `scaleX(${progress / 100})` }}
									/>
								</span>
								<span className="mt-1.5 block text-right font-mono text-[10px] text-muted-foreground tabular-nums">
									{progress}%
								</span>
							</span>
						) : (
							<span className="mt-3 block rounded-full bg-primary py-1.5 text-center text-[11px] font-semibold text-primary-foreground">
								{platform === "android" ? "Update" : "Open App Store"}
							</span>
						)}
					</div>
					<div className="phone-snack" data-on={snackbar ? "" : undefined}>
						<span>Update downloaded.</span>
						<span className="font-semibold text-primary-text">Restart</span>
					</div>
				</div>
			</div>

			<div className={cn("grid min-w-0", compact ? "justify-items-center gap-2" : "gap-4")}>
				<div className={cn("flex flex-wrap items-center gap-1", compact && "justify-center")}>
					<div
						role="group"
						aria-label="Platform"
						className="inline-flex rounded-full border border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] p-1"
					>
						{(["android", "ios"] as const).map((item) => (
							<button
								key={item}
								type="button"
								aria-pressed={platform === item}
								onClick={() => choosePlatform(item)}
								className={cn(
									"pressable min-h-9 rounded-full px-3.5 text-[13.5px] font-medium transition-[background-color,color,scale] duration-200",
									platform === item
										? "bg-surface-solid text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.12)]"
										: "text-muted-foreground pointer-fine:hover:text-foreground",
								)}
							>
								{item === "android" ? "Android" : "iOS"}
							</button>
						))}
					</div>
					<button
						type="button"
						onClick={reduceMotion ? stepForward : replay}
						className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-medium text-primary-text transition-[background-color,scale] duration-200 pointer-fine:hover:bg-primary-soft"
					>
						<span aria-hidden="true">{reduceMotion ? "→" : "↻"}</span>
						{reduceMotion ? "Next step" : "Replay"}
					</button>
				</div>
				<ol
					className={cn(
						"m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0",
						compact && "justify-center",
					)}
				>
					{STAGES[platform].map((stage, index) => (
						<li key={stage.id} className="flex items-center gap-2">
							{index > 0 ? <span aria-hidden="true" className="h-px w-4 bg-line-strong" /> : null}
							<span
								aria-current={index === current ? "step" : undefined}
								className={cn(
									"mono-label inline-flex items-center gap-1.5 transition-colors duration-300",
									index < current || (index === current && (step === "done" || step === "store"))
										? "text-success"
										: index === current
											? "text-primary-text"
											: "text-muted-foreground",
								)}
							>
								<span
									aria-hidden="true"
									className={cn(
										"size-1.5 rounded-full bg-current",
										index > current && "opacity-40",
									)}
								/>
								{stage.label}
							</span>
						</li>
					))}
				</ol>
				<p className="sr-only" aria-live="polite">
					{announce}
				</p>
			</div>
		</div>
	);
}
