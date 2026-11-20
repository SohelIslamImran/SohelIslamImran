import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { CapabilityContent } from "../types/content";
import { useEnterViewportOnce, usePrefersReducedMotion } from "@/components/motion";
import { Section, SectionHeading, TagList } from "@/components/ui/portfolio";
import { cn } from "@/lib/utils";
import { plateSag, supportsFor } from "./home/supports";

/** The one-time intro on first view: the build, then which support comes out, and for how long. */
const BUILD_START_MS = 380;
const BUILD_STEP_MS = 300;
const DEMO_ID = "delivery";
const DEMO_DELAY_MS = 900;
const DEMO_HOLD_MS = 1900;
const DEMO_KEY = "how-i-work-demo";

/**
 * How I work, as one object anyone can read: a plate ("Your product") resting
 * on one support per capability. Take a support out and it slides away, the
 * plate tilts toward the gap with a hairline crack, and the headline says in
 * plain words what users would feel without it; below, the capability's own
 * copy says what Sohel does about it. Put it back and everything settles.
 *
 * - The supports' labels are toggle buttons (aria-pressed), one out at a time.
 * - On first view (once per session, never with reduced motion) the object
 *   builds itself: the supports rise from the floor one at a time, left to
 *   right, and the plate, sagging toward its unsupported end, levels off as
 *   each one lands while the label counts them in. Then the Release support
 *   comes out on its own for a moment and goes back, so the idea is shown
 *   before anyone has to discover it. The build only runs when the section
 *   starts below the fold, so nothing is ever taken down in front of anyone;
 *   any click finishes it at once.
 * - Every readout is in the server HTML (stacked in one cell, so the height
 *   never changes); with reduced motion nothing slides or tilts.
 */
export function HowIWork({ capabilities }: { capabilities: CapabilityContent[] }) {
	const baseId = useId();
	const supports = supportsFor(capabilities);
	const count = supports.length;
	const reducedMotion = usePrefersReducedMotion();
	/** Index of the support that is out, or -1. */
	const [gone, setGone] = useState(-1);
	const [hovered, setHovered] = useState(-1);
	/** How many supports stand. Complete in the server HTML; the intro rebuilds it. */
	const [placed, setPlaced] = useState(count);
	/** True while the intro build is queued or running. */
	const [intro, setIntroState] = useState(false);
	// Mirrored in a ref: the viewport callback below is the first render's.
	const introRef = useRef(false);
	const setIntro = (value: boolean) => {
		introRef.current = value;
		setIntroState(value);
	};
	const touched = useRef(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const timers = useRef<number[]>([]);

	useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

	// Take the supports down before anyone sees them, but only when the section
	// is still below the fold and the intro hasn't played this session.
	useEffect(() => {
		const root = rootRef.current;
		if (reducedMotion || !root || count === 0) {
			setIntro(false);
			setPlaced(count);
			return;
		}
		try {
			if (sessionStorage.getItem(DEMO_KEY)) return;
		} catch {
			return;
		}
		if (root.getBoundingClientRect().top < window.innerHeight) return;
		setIntro(true);
		setPlaced(0);
	}, [reducedMotion, count]);

	const later = (ms: number, run: () => void) => {
		timers.current.push(
			window.setTimeout(() => {
				if (!touched.current) run();
			}, ms),
		);
	};

	useEnterViewportOnce(
		rootRef,
		() => {
			if (reducedMotion) return;
			try {
				if (sessionStorage.getItem(DEMO_KEY)) return;
				sessionStorage.setItem(DEMO_KEY, "1");
			} catch {
				// Without storage the intro may simply play again next visit.
			}
			let at = 0;
			if (introRef.current) {
				for (let step = 1; step <= count; step += 1) {
					later(BUILD_START_MS + (step - 1) * BUILD_STEP_MS, () => setPlaced(step));
				}
				at = BUILD_START_MS + count * BUILD_STEP_MS;
				later(at + 700, () => setIntro(false));
			}
			const demo = supports.findIndex((support) => support.capability.id === DEMO_ID);
			if (demo < 0) return;
			later(at + DEMO_DELAY_MS, () => {
				setGone(demo);
				later(DEMO_HOLD_MS, () => setGone(-1));
			});
		},
		{ rootMargin: "0px 0px -35% 0px" },
	);

	if (count === 0) return null;

	/** Any interaction ends the intro: everything stands again at once. */
	const interrupt = () => {
		touched.current = true;
		setPlaced(count);
		setIntro(false);
	};
	const toggle = (index: number) => {
		interrupt();
		setGone((value) => (value === index ? -1 : index));
	};
	const restore = () => {
		interrupt();
		setGone(-1);
	};

	const building = placed < count;
	// While building, the plate pivots on its supported (left) end and sags
	// toward the right, less with every support that lands.
	const missing = building ? (count - placed) / count : 0;
	const { tilt, drop } = building
		? { tilt: Number((missing * 2.4).toFixed(2)), drop: Number((missing * 12).toFixed(1)) }
		: plateSag(gone, count);
	const out = supports[gone];
	const crackAt = gone < 0 ? 50 : ((gone + 0.5) / count) * 100;

	return (
		<Section
			aria-labelledby="approach-title"
			id="how-i-work"
			spacing="compact"
			className="text-foreground"
		>
			<SectionHeading
				id="approach-title"
				index="03"
				eyebrow="How I work"
				title="What it takes to ship a feature."
				description="Every feature rests on a few things going right. Take one out to see what your users would feel, and what I do about it."
			/>

			<div
				ref={rootRef}
				data-slot="supports"
				className="hw relative isolate min-w-0 overflow-hidden rounded-tile border border-line bg-surface-solid px-[clamp(20px,4vw,56px)] pt-[clamp(28px,4vw,52px)] pb-[clamp(20px,3vw,36px)] shadow-raised"
				style={
					{
						"--n": count,
						"--tilt": `${tilt}deg`,
						"--drop": `${drop}px`,
						"--crack": `${crackAt}%`,
						"--pivot": building
							? "0%"
							: gone < 0
								? "50%"
								: gone < (count - 1) / 2
									? "100%"
									: gone > (count - 1) / 2
										? "0%"
										: "50%",
					} as CSSProperties
				}
				data-broken={gone >= 0 ? "" : undefined}
				data-building={building ? "" : undefined}
				data-intro={intro ? "" : undefined}
			>
				<div
					aria-hidden="true"
					className="hw-glow pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[420px] w-[min(900px,100%)] rounded-full"
				/>

				{/* Readout: one state per support plus the whole one, stacked in one cell. */}
				<div className="hw-readouts grid min-w-0" aria-live="polite" aria-atomic="true">
					<div className="hw-readout" data-on={gone < 0 ? "" : undefined} inert={gone >= 0}>
						<p
							className={cn(
								"mono-label m-0 flex items-center gap-2 transition-colors duration-300",
								building ? "text-primary-text" : "text-success",
							)}
						>
							<span
								aria-hidden="true"
								className={cn(
									"size-1.5 rounded-full transition-colors duration-300",
									building ? "bg-primary" : "bg-success",
								)}
							/>
							{/* The count is visual only, so the live region doesn't read every step. */}
							<span aria-hidden="true">
								{building ? `${placed} of ${count} in place` : `All ${count} in place`}
							</span>
							<span className="sr-only">All {count} in place</span>
						</p>
						<p className="hw-line m-0 mt-4">Your users never notice any of this.</p>
						<p className="m-0 mt-4 max-w-[58ch] text-body text-ink-soft">
							That’s the point. Take a support out below to see why each one matters.
						</p>
					</div>
					{supports.map((support, index) => (
						<div
							key={support.id}
							className="hw-readout"
							data-on={index === gone ? "" : undefined}
							inert={index !== gone}
						>
							<p className="mono-label m-0 flex items-center gap-2 text-signal">
								<span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
								Without {support.label.toLowerCase()}
							</p>
							<p className="hw-line m-0 mt-4">{support.without}</p>
							<div className="mt-5 grid min-w-0 gap-1.5 border-l-2 border-primary-line/50 pl-4">
								<p className="m-0 text-small text-muted-foreground">
									What I do about it ·{" "}
									<span className="font-semibold text-foreground">{support.capability.title}</span>
								</p>
								{support.capability.description ? (
									<p className="m-0 max-w-[62ch] text-small text-ink-soft">
										{support.capability.description}
									</p>
								) : null}
								{support.capability.tools.length > 0 ? (
									<TagList items={support.capability.tools} className="mt-1.5" />
								) : null}
							</div>
						</div>
					))}
				</div>

				{/* The object. Decorative; the buttons below are the controls. */}
				<div aria-hidden="true" className="hw-scene mt-[clamp(28px,4vw,44px)]">
					<div className="hw-plate">
						<span className="hw-plate-name">Your product</span>
						<span className="hw-plate-status">
							<span className="hw-plate-dot" />
							<span className="hw-plate-ok">Everything works</span>
							<span className="hw-plate-wait">Not ready yet</span>
							<span className="hw-plate-bad">Something’s wrong</span>
						</span>
						<svg className="hw-crack" viewBox="0 0 24 40" preserveAspectRatio="none">
							<path pathLength={1} d="M11 0 L14 12 L9 22 L13 31 L12 40" />
						</svg>
					</div>
					<div className="hw-pillars">
						{supports.map((support, index) => (
							<span
								key={support.id}
								className="hw-pillar"
								data-out={index === gone ? "" : undefined}
								data-pending={index >= placed ? "" : undefined}
								data-hover={index === hovered && index !== gone ? "" : undefined}
							>
								<span className="hw-ghost" />
								<span className="hw-pillar-body">
									<span className="hw-pillar-index">{String(index + 1).padStart(2, "0")}</span>
								</span>
							</span>
						))}
					</div>
					<span className="hw-floor" />
				</div>

				{/* Controls, under their supports on wide screens. */}
				<div
					role="group"
					aria-labelledby={`${baseId}-controls`}
					className="hw-controls mt-4 grid min-w-0 gap-2"
				>
					<p id={`${baseId}-controls`} className="sr-only">
						Take a support out
					</p>
					{supports.map((support, index) => (
						<button
							key={support.id}
							type="button"
							aria-pressed={index === gone}
							data-pending={index >= placed ? "" : undefined}
							onClick={() => toggle(index)}
							onPointerEnter={(event) => {
								if (event.pointerType === "mouse") setHovered(index);
							}}
							onPointerLeave={() => setHovered(-1)}
							className="hw-control group/control"
						>
							<span className="flex min-w-0 items-center justify-between gap-2">
								<span className="truncate text-[15px] font-semibold tracking-tight">
									{support.label}
								</span>
								<span aria-hidden="true" className="hw-control-icon">
									<svg viewBox="0 0 16 16" fill="none">
										<path
											d="M8 3v10M4 9l4 4 4-4"
											stroke="currentColor"
											strokeWidth="1.6"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</span>
							</span>
							<span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">
								{index === gone ? "Out · tap to put back" : support.capability.title}
							</span>
						</button>
					))}
				</div>

				<div className="mt-5 flex min-h-9 items-center justify-center">
					<button
						type="button"
						onClick={restore}
						tabIndex={gone >= 0 ? 0 : -1}
						aria-hidden={gone < 0 || undefined}
						className={cn(
							"hw-restore inline-flex min-h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-[13px] font-medium text-ink-soft hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
							gone < 0 && "pointer-events-none",
						)}
						data-on={gone >= 0 ? "" : undefined}
					>
						<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-3.5">
							<path
								d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v2.6h2.6"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						Put {out ? out.label.toLowerCase() : "it"} back
					</button>
				</div>
			</div>
		</Section>
	);
}
