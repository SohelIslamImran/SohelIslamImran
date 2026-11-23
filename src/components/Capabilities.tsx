import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { CapabilityContent } from "../types/content";
import { prefersReducedMotion, usePointerFine, usePrefersReducedMotion } from "@/components/motion";
import { Section, SectionHeading, TagList } from "@/components/ui/portfolio";
import { cn } from "@/lib/utils";
import { plateSag, supportsFor } from "./home/supports";

const BUILD_START_MS = 260;
const BUILD_STEP_MS = 320;
/** The final support's landing effect lasts 380ms + 900ms. */
const BUILD_SETTLE_MS = 1280;
const BUILD_IN_VIEW = 0.6;

type Phase = "standing" | "armed" | "building";

/**
 * How I work, as one object anyone can read: a plate ("Your product") resting
 * on one support per capability. Take a support out and it slides away, the
 * plate tilts toward the gap with a hairline crack, and the headline says in
 * plain words what users would feel without it; below, the capability's own
 * copy says what Sohel does about it. Put it back and everything settles.
 *
 * - The supports' labels are toggle buttons (aria-pressed), one out at a time.
 * - On their first entrance, the supports rise from the floor one by one, with
 *   an impact line per landing and a sweep across the plate at the end.
 * - Once built, the object keeps the visitor's selection across scrolls.
 * - Every readout is in the server HTML (stacked in one cell, so the height
 *   never changes), and the server HTML shows the finished object.
 */
export function HowIWork({ capabilities }: { capabilities: CapabilityContent[] }) {
	const baseId = useId();
	const supports = supportsFor(capabilities);
	const count = supports.length;
	const reducedMotion = usePrefersReducedMotion();
	const pointerFine = usePointerFine();
	const [goneId, setGoneId] = useState<string | null>(null);
	const gone = supports.findIndex((support) => support.id === goneId);
	if (goneId !== null && gone < 0) setGoneId(null);
	const [hovered, setHovered] = useState<string | null>(null);
	const [phase, setPhase] = useState<Phase>("standing");
	const [buildPlaced, setBuildPlaced] = useState(0);
	const [buildSkipped, setBuildSkipped] = useState(false);
	const [announce, setAnnounce] = useState(false);
	const sceneRef = useRef<HTMLDivElement>(null);
	const checkedScene = useRef(false);
	const controlRefs = useRef(new Map<string, HTMLButtonElement>());
	const hasSupports = count > 0;

	useEffect(() => {
		const scene = sceneRef.current;
		if (!scene) {
			setPhase("standing");
			return;
		}
		if (checkedScene.current) return;
		checkedScene.current = true;
		if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
		if (scene.getBoundingClientRect().top >= window.innerHeight) setPhase("armed");
	}, [hasSupports]);

	useEffect(() => {
		const scene = sceneRef.current;
		if (!scene || phase !== "armed" || reducedMotion) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry || entry.intersectionRatio < BUILD_IN_VIEW) return;
				observer.disconnect();
				const nextPhase = prefersReducedMotion() ? "standing" : "building";
				setPhase((current) => (current === "armed" ? nextPhase : current));
			},
			{ threshold: BUILD_IN_VIEW },
		);
		observer.observe(scene);
		return () => observer.disconnect();
	}, [phase, reducedMotion]);

	useEffect(() => {
		if (reducedMotion && phase !== "standing") {
			setPhase("standing");
			return;
		}
		if (phase !== "building") return;
		const delay =
			buildPlaced === 0 ? BUILD_START_MS : buildPlaced < count ? BUILD_STEP_MS : BUILD_SETTLE_MS;
		const timer = window.setTimeout(() => {
			if (buildPlaced < count) setBuildPlaced(buildPlaced + 1);
			else setPhase("standing");
		}, delay);
		return () => window.clearTimeout(timer);
	}, [phase, buildPlaced, count, reducedMotion]);

	if (!hasSupports) return null;

	const takeOver = () => {
		setBuildSkipped(phase !== "standing");
		setPhase("standing");
		setAnnounce(true);
	};
	const toggle = (id: string) => {
		takeOver();
		setGoneId((value) => (value === id ? null : id));
	};
	const restore = () => {
		takeOver();
		setGoneId(null);
		// The restore button hides itself, so focus goes back to that support's toggle.
		if (goneId !== null) controlRefs.current.get(goneId)?.focus();
	};

	const placed = reducedMotion || phase === "standing" ? count : buildPlaced;
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
				data-intro={phase === "building" && !reducedMotion ? "" : undefined}
				data-armed={phase === "armed" && !reducedMotion ? "" : undefined}
				data-build-skipped={buildSkipped ? "" : undefined}
			>
				<div
					aria-hidden="true"
					className="hw-glow pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[420px] w-[min(900px,100%)] rounded-full"
				/>

				{/* Readout: one state per support plus the whole one, stacked in one cell. */}
				<div
					className="hw-readouts grid min-w-0"
					aria-live={announce ? "polite" : "off"}
					aria-atomic="true"
				>
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
				<div ref={sceneRef} aria-hidden="true" className="hw-scene mt-[clamp(28px,4vw,44px)]">
					<div className="hw-plate">
						<span className="hw-plate-name">Your product</span>
						<span className="hw-plate-status">
							<span className="hw-plate-dot" />
							<span className="hw-plate-ok">Everything works</span>
							<span className="hw-plate-wait">Not ready yet</span>
							<span className="hw-plate-bad">Something’s wrong</span>
						</span>
						<span className="hw-sweep" />
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
								data-hover={
									pointerFine && support.id === hovered && index !== gone ? "" : undefined
								}
							>
								<span className="hw-ghost" />
								<span className="hw-pillar-body">
									<span className="hw-pillar-index">{String(index + 1).padStart(2, "0")}</span>
								</span>
								<span className="hw-impact" />
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
							ref={(node) => {
								if (node) controlRefs.current.set(support.id, node);
								else controlRefs.current.delete(support.id);
							}}
							type="button"
							aria-pressed={index === gone}
							data-pending={index >= placed ? "" : undefined}
							onClick={() => toggle(support.id)}
							onPointerEnter={(event) => {
								if (pointerFine && event.pointerType === "mouse") setHovered(support.id);
							}}
							onPointerLeave={() => setHovered(null)}
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
							"hw-restore inline-flex min-h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-[13px] font-medium text-ink-soft pointer-fine:hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
