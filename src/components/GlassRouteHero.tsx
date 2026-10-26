import {
	useEffect,
	useRef,
	useState,
	type KeyboardEvent,
	type PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "@tanstack/react-router";
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion } from "motion/react";
import type {
	ExperienceContent,
	HeroContent,
	IdentityContent,
	LinkContent,
} from "../types/content";
import { PortfolioImage } from "./PortfolioImage";
import { Eyebrow } from "./ui/portfolio";
import { cn } from "../lib/utils";

export interface RouteStop {
	label: string;
	detail: string;
}

export type RouteStops = readonly [RouteStop, RouteStop, RouteStop];

interface GlassRouteHeroProps {
	identity: IdentityContent;
	hero: HeroContent;
	experience?: ExperienceContent[];
	portraitSrc?: string | null;
	portraitAlt?: string;
	stops?: RouteStops;
}

const defaultStops: RouteStops = [
	{ label: "2020", detail: "First computer · learning web development" },
	{ label: "2021", detail: "Tilleli · React Native product work" },
	{ label: "2023—now", detail: "Kuno · full-stack systems" },
];

const stopPositions = [
	[88, 232],
	[320, 140],
	[556, 56],
] as const;

const routePath = "M 88 232 C 182 206, 236 166, 320 140 C 402 114, 480 76, 556 56";

type HeroActionKind = "internal" | "hash" | "mail" | "tel" | "external";

interface DragState {
	pointerId: number;
	startX: number;
	startValue: number;
	previousX: number;
	previousTime: number;
	lastX: number;
	lastTime: number;
}

function rubberband(value: number, dimension: number, constant = 0.55) {
	if (value <= 0) return 0;
	return (value * dimension * constant) / (dimension + constant * value);
}

interface SceneBounds {
	left: number;
	right: number;
	width: number;
}

function getSceneBounds(card: HTMLDivElement | null, translation: number): SceneBounds | null {
	if (!card) return null;
	const rect = card.getBoundingClientRect();
	return {
		left: rect.left - translation,
		right: rect.right - translation,
		width: rect.width,
	};
}

function clampSceneTranslation(bounds: SceneBounds | null, value: number) {
	if (!bounds) return value;
	const visualViewport = window.visualViewport;
	const viewportLeft = (visualViewport?.offsetLeft ?? 0) + 8;
	const viewportRight =
		(visualViewport?.offsetLeft ?? 0) + (visualViewport?.width ?? window.innerWidth) - 8;
	const minimum = viewportLeft - bounds.left;
	const maximum = viewportRight - bounds.right;
	if (minimum >= maximum) return 0;
	return Math.max(minimum, Math.min(maximum, value));
}

/** How far the card can travel in either direction before it would leave the viewport. */
function sceneSlack(bounds: SceneBounds | null): { left: number; right: number } {
	if (!bounds) return { left: 0, right: 0 };
	const visualViewport = window.visualViewport;
	const viewportLeft = (visualViewport?.offsetLeft ?? 0) + 8;
	const viewportRight =
		(visualViewport?.offsetLeft ?? 0) + (visualViewport?.width ?? window.innerWidth) - 8;
	// Negative values mean the card is already wider than the viewport, so that
	// direction has no slack at all rather than a negative budget.
	return {
		left: Math.max(0, viewportLeft - bounds.left),
		right: Math.max(0, viewportRight - bounds.right),
	};
}

function getHeroActionKind(action: LinkContent): HeroActionKind {
	const href = action.href.trim();
	const lowerHref = href.toLowerCase();
	if (lowerHref.startsWith("mailto:")) return "mail";
	if (lowerHref.startsWith("tel:")) return "tel";
	if (href.startsWith("#")) return "hash";
	if (/^(?:https?:)?\/\//iu.test(href)) return "external";
	return "internal";
}

function HeroAction({ action, index }: { action: LinkContent; index: number }) {
	const href = action.href.trim();
	const kind = getHeroActionKind(action);
	// U+2709 is missing from the display font and falls back to a glyph that
	// reads as a close control, so use a plain at-sign for email.
	const affordance =
		kind === "mail"
			? "@"
			: kind === "tel"
				? "☎"
				: kind === "hash"
					? "↓"
					: kind === "external"
						? "↗"
						: "→";
	const content = (
		<>
			{action.label} <span aria-hidden="true">{affordance}</span>
			{kind === "external" ? <span className="sr-only">, opens in a new tab</span> : null}
		</>
	);
	const className = cn(
		"inline-flex min-h-12 min-w-12 max-w-full touch-manipulation items-center gap-3 rounded-full px-5 text-sm font-bold no-underline shadow-[0_10px_24px_var(--theme-accent-glow)] transition-[background-color,border-color,box-shadow,translate,scale] duration-200 ease-route motion-safe:pointer-fine:hover:-translate-y-0.5 focus-visible:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:active:scale-[.97]",
		index === 0
			? "bg-primary text-primary-foreground shadow-[0_12px_26px_var(--theme-accent-glow)] hover:bg-primary hover:shadow-[0_16px_32px_var(--theme-accent-glow)]"
			: "border border-border bg-surface-solid text-foreground hover:bg-muted",
	);

	if (kind === "internal") {
		return (
			<Link className={className} to={href}>
				{content}
			</Link>
		);
	}

	return (
		<a
			className={className}
			href={href}
			target={kind === "external" ? "_blank" : undefined}
			rel={kind === "external" ? "noopener noreferrer" : undefined}
		>
			{content}
		</a>
	);
}

/** Past stops share the accent; the selected one takes the signal color, so the
 *  highlight always marks "where you are" instead of a fixed milestone. */
function getStopAccent(isCurrent: boolean) {
	return isCurrent ? "var(--theme-signal)" : "var(--theme-accent)";
}

function getReleaseVelocity(drag: DragState, clientX: number, now: number) {
	const releaseElapsed = now - drag.lastTime;
	if (clientX !== drag.lastX && releaseElapsed > 0) {
		return ((clientX - drag.lastX) * 1000) / Math.max(16, releaseElapsed);
	}
	const sampleElapsed = drag.lastTime - drag.previousTime;
	if (sampleElapsed > 0) {
		return ((drag.lastX - drag.previousX) * 1000) / Math.max(16, sampleElapsed);
	}
	return 0;
}

/**
 * The hero title is CMS-editable, so a hyphenated token such as
 * "Full-stack-product" must not be allowed to break at every hyphen. Marking the
 * token nowrap keeps it intact while still allowing breaks at the spaces.
 */
function renderHeadline(title: string) {
	return title.split(/(\s+)/u).map((part, index) =>
		/[-\u2010\u2011\u2012\u2013\u2014]/u.test(part) ? (
			<span className="whitespace-nowrap" key={`${part}-${index}`}>
				{part}
			</span>
		) : (
			part
		),
	);
}

export function GlassRouteHero({
	identity,
	hero,
	experience = [],
	portraitSrc,
	portraitAlt = "Portrait of Sohel Islam Imran",
	stops = defaultStops,
}: GlassRouteHeroProps) {
	const [selected, setSelected] = useState(() => stops.length - 1);
	const sceneRef = useRef<HTMLDivElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);
	const stopRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const boundsRef = useRef<SceneBounds | null>(null);
	const dragRef = useRef<DragState | null>(null);
	const reducedMotion = useReducedMotion();
	const reduceMotion = reducedMotion === true;
	const dragX = useMotionValue(0);
	const sceneTransform = useMotionTemplate`translateX(${dragX}px)`;

	useEffect(() => {
		return () => dragX.stop();
	}, [dragX]);

	useEffect(() => {
		if (!reduceMotion) return;
		dragX.stop();
		dragX.jump(0);
	}, [dragX, reduceMotion]);

	const select = (index: number) => setSelected(Math.max(0, Math.min(stops.length - 1, index)));
	const current = stops[selected] ?? stops[0];
	const portrait = portraitSrc ?? "/images/sohel-linkedin-800.webp";
	const latestRole = experience.find((item) => item.current) ?? experience[0];
	const heroActions = hero.actions.slice(0, 2);

	const returnScene = (velocity: number) => {
		dragX.stop();
		if (reduceMotion) {
			dragX.jump(0);
			return;
		}
		animate(dragX, 0, { type: "spring", duration: 0.34, bounce: 0, velocity });
	};

	const onScenePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		if (reduceMotion) {
			cancelDrag(event.pointerId);
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}
			return;
		}
		const now = performance.now();
		drag.previousX = drag.lastX;
		drag.previousTime = drag.lastTime;
		drag.lastX = event.clientX;
		drag.lastTime = now;
		const delta = event.clientX - drag.startX;
		const width = Math.max(
			1,
			boundsRef.current?.width ?? sceneRef.current?.getBoundingClientRect().width ?? 640,
		);
		// A fixed travel budget is silently clipped by the viewport clamp on narrow
		// screens, so the card barely follows the pointer there. Scale the budget
		// to the slack that actually exists in the direction being dragged.
		const slack = sceneSlack(boundsRef.current);
		const travel = Math.min(Math.max(width * 0.2, 96), 160, Math.max(slack.left, slack.right, 1));
		const atStart = selected === 0 && delta > 0;
		const atEnd = selected === stops.length - 1 && delta < 0;
		if (atStart || atEnd) {
			const sign = delta < 0 ? -1 : 1;
			const offset = Math.min(24, rubberband(Math.abs(delta), travel, 0.4));
			dragX.jump(clampSceneTranslation(boundsRef.current, drag.startValue + sign * offset));
			return;
		}
		const limit =
			delta < 0 ? Math.min(travel, slack.left || travel) : Math.min(travel, slack.right || travel);
		dragX.jump(
			clampSceneTranslation(
				boundsRef.current,
				Math.max(
					drag.startValue - limit,
					Math.min(drag.startValue + limit, drag.startValue + delta),
				),
			),
		);
	};

	const onScenePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!event.isPrimary || dragRef.current || event.button !== 0 || reduceMotion) return;
		const target = event.target as Element | null;
		if (target?.closest("button, a")) return;
		dragX.stop();
		const bounds = getSceneBounds(cardRef.current, dragX.get());
		if (!bounds) return;
		boundsRef.current = bounds;
		const now = performance.now();
		dragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startValue: dragX.get(),
			previousX: event.clientX,
			previousTime: now,
			lastX: event.clientX,
			lastTime: now,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const endDrag = (clientX: number) => {
		const drag = dragRef.current;
		if (!drag) return;
		const now = performance.now();
		const velocity = getReleaseVelocity(drag, clientX, now);
		const width = Math.max(
			1,
			boundsRef.current?.width ?? sceneRef.current?.getBoundingClientRect().width ?? 640,
		);
		const delta = clientX - drag.startX;
		const distanceThreshold = Math.max(28, width * 0.16);
		const velocityThreshold = 500;
		dragRef.current = null;
		boundsRef.current = null;
		if (
			(delta < -distanceThreshold || velocity < -velocityThreshold) &&
			selected < stops.length - 1
		) {
			select(selected + 1);
		} else if ((delta > distanceThreshold || velocity > velocityThreshold) && selected > 0) {
			select(selected - 1);
		}
		returnScene(velocity);
	};

	function cancelDrag(pointerId: number) {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== pointerId) return;
		const velocity = getReleaseVelocity(drag, drag.lastX, performance.now());
		dragRef.current = null;
		boundsRef.current = null;
		returnScene(velocity);
	}

	const onScenePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (dragRef.current?.pointerId !== event.pointerId) return;
		endDrag(event.clientX);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const onScenePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (dragRef.current?.pointerId !== event.pointerId) return;
		cancelDrag(event.pointerId);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const onSceneLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
		cancelDrag(event.pointerId);
	};

	return (
		<section
			className="relative min-w-0 overflow-visible pb-12 pt-[clamp(28px,5vw,56px)]"
			aria-labelledby="hero-title"
			data-slot="route-hero"
		>
			<div className="mx-auto grid w-full max-w-[1240px] grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)] items-center gap-[clamp(28px,5vw,64px)] max-[960px]:grid-cols-1">
				<div className="min-w-0">
					<Eyebrow className="mb-4">
						<span data-slot="hero-eyebrow">{hero.eyebrow}</span>
					</Eyebrow>
					<h1
						aria-label={hero.title}
						className="m-0 min-w-0 max-w-[20ch] break-words text-pretty text-[clamp(2.6rem,6vw,5.4rem)] font-[760] leading-[0.98] tracking-[-0.06em] [overflow-wrap:anywhere]"
						id="hero-title"
						data-slot="hero-title"
					>
						{renderHeadline(hero.title)}
					</h1>
					<p
						className="mt-6 min-w-0 w-full max-w-[min(100%,48ch)] break-words whitespace-normal text-pretty text-[clamp(1.05rem,1.8vw,1.25rem)] leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]"
						data-slot="hero-intro"
					>
						{hero.intro}
					</p>
					{heroActions.length > 0 ? (
						<div className="mt-8 flex min-w-0 max-w-full flex-wrap gap-3">
							{heroActions.map((action, index) => (
								<HeroAction action={action} index={index} key={`${action.href}-${action.label}`} />
							))}
						</div>
					) : null}
				</div>

				<div
					ref={sceneRef}
					className="relative isolate min-w-0 w-full touch-pan-y select-none py-4 max-[960px]:mx-auto max-[960px]:max-w-[620px]"
					data-slot="route-scene"
					style={{ touchAction: "pan-y" }}
					onPointerDown={onScenePointerDown}
					onPointerMove={onScenePointerMove}
					onPointerUp={onScenePointerUp}
					onPointerCancel={onScenePointerCancel}
					onLostPointerCapture={onSceneLostPointerCapture}
					onDragStart={(event) => event.preventDefault()}
				>
					<motion.div
						ref={cardRef}
						data-material="glass"
						className="relative min-w-0 max-w-full rounded-[28px] border border-border/70 bg-[color-mix(in_srgb,var(--theme-surface-solid)_92%,transparent)] p-6 shadow-float backdrop-blur-2xl backdrop-saturate-150 transition-shadow duration-200 ease-route motion-reduce:transition-none max-[560px]:p-4.5"
						style={{ transform: sceneTransform }}
					>
						<div className="flex min-w-0 flex-wrap items-center gap-4 border-b border-border/60 pb-4 max-[560px]:gap-3">
							<div
								className="relative aspect-[4/5] w-[104px] shrink-0 overflow-hidden rounded-[20px] border border-border/70 bg-muted shadow-[0_10px_28px_var(--theme-shadow)] max-[560px]:w-[84px]"
								draggable={false}
							>
								<PortfolioImage
									src={portrait}
									alt={portraitAlt}
									width={400}
									height={500}
									className="size-full object-cover object-[center_18%]"
									loading="eager"
									fetchPriority="high"
									sizes="(max-width: 560px) 84px, 104px"
									srcSet={
										portraitSrc
											? undefined
											: "/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
									}
								/>
							</div>
							<div className="min-w-0 flex-1">
								<strong className="block text-[15px] font-[760] leading-tight tracking-[-0.02em] text-foreground">
									{identity.name}
								</strong>
								<span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
									{latestRole?.role ?? identity.role}
								</span>
								<span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground [font-variant-numeric:tabular-nums]">
									{experience.length > 0 ? `${experience.length} roles` : "5+ years"}
								</span>
							</div>
						</div>

						<div className="relative my-5 aspect-[640/300] min-w-0 w-full max-[560px]:my-4">
							<svg
								aria-hidden="true"
								className="pointer-events-none size-full"
								focusable="false"
								viewBox="0 0 640 300"
								preserveAspectRatio="xMidYMid meet"
								fill="none"
							>
								<path
									d={routePath}
									stroke="currentColor"
									strokeWidth="3"
									strokeDasharray="6 6"
									strokeLinecap="round"
									className="text-muted-foreground/60"
								/>
								<path
									d={routePath}
									stroke="var(--theme-accent)"
									strokeWidth="4"
									strokeLinecap="round"
									pathLength={1}
									strokeDasharray={1}
									strokeDashoffset={1 - selected / Math.max(1, stops.length - 1)}
									className="transition-[stroke-dashoffset] duration-200 ease-route motion-reduce:transition-none"
								/>
								{stops.map((stop, index) => {
									const pos = stopPositions[index] ?? [0, 0];
									const isCurrent = selected === index;
									const accent = getStopAccent(isCurrent);
									return (
										<g key={stop.label}>
											{isCurrent ? (
												<circle
													cx={pos[0]}
													cy={pos[1]}
													r="22"
													fill="none"
													stroke={accent}
													strokeOpacity="0.32"
													strokeWidth="2"
												/>
											) : null}
											<circle
												cx={pos[0]}
												cy={pos[1]}
												r={isCurrent ? 14 : 10}
												fill={accent}
												fillOpacity={isCurrent ? 1 : 0.95}
												stroke={isCurrent ? "var(--theme-surface-solid)" : accent}
												strokeWidth={isCurrent ? 4 : 3.5}
											/>
											{/* Year under each stop turns the curve into a readable timeline. */}
											<text
												x={pos[0]}
												y={pos[1] + 40}
												textAnchor="middle"
												className="fill-current text-[26px] font-semibold"
												fill={isCurrent ? "var(--theme-signal)" : "var(--theme-muted)"}
												opacity={isCurrent ? 1 : 0.75}
											>
												{stop.label.replace(/\s*—.*$/u, "")}
											</text>
										</g>
									);
								})}
							</svg>
						</div>

						<div className="rounded-[20px] border border-border/70 bg-surface-solid p-4">
							<div className="flex min-w-0 max-w-full flex-wrap items-center justify-between gap-x-2 gap-y-2">
								<span className="min-w-0 max-w-full break-words whitespace-normal text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text [overflow-wrap:anywhere]">
									Route Milestone
								</span>
								<div
									className="ml-auto flex min-w-0 max-w-full flex-wrap justify-end gap-1.5 max-[640px]:ml-0 max-[640px]:w-full max-[640px]:justify-start"
									role="group"
									aria-label="Route milestones"
								>
									{stops.map((stop, index) => {
										const isSelected = selected === index;
										return (
											<button
												key={stop.label}
												ref={(element) => {
													stopRefs.current[index] = element;
												}}
												type="button"
												aria-pressed={isSelected}
												aria-label={`Milestone ${index + 1} of ${stops.length}, ${stop.label}`}
												tabIndex={isSelected ? 0 : -1}
												className="grid size-11 min-h-11 min-w-11 touch-manipulation cursor-pointer place-items-center rounded-full border border-transparent transition-[background-color,border-color] duration-200 ease-route hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:bg-muted aria-pressed:border-primary/30 aria-pressed:bg-primary/10 motion-reduce:transition-none"
												onPointerDown={(event) => {
													event.stopPropagation();
													if (!event.isPrimary) event.preventDefault();
												}}
												onClick={() => select(index)}
												onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
													let next = index;
													if (event.key === "ArrowRight") next = index + 1;
													else if (event.key === "ArrowLeft") next = index - 1;
													else if (event.key === "Home") next = 0;
													else if (event.key === "End") next = stops.length - 1;
													else return;
													event.preventDefault();
													event.stopPropagation();
													next = Math.max(0, Math.min(stops.length - 1, next));
													if (next === index) return;
													select(next);
													stopRefs.current[next]?.focus();
												}}
											>
												<span
													aria-hidden="true"
													className={cn(
														"size-2.5 rounded-full ring-1 transition-[width,background-color,--tw-ring-color] duration-200 ease-route motion-reduce:transition-none",
														isSelected
															? "w-6 bg-primary ring-primary/40"
															: "bg-muted-foreground ring-muted-foreground/30",
													)}
												/>
											</button>
										);
									})}
								</div>
							</div>
							<div className="mt-2.5 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)]">
								<strong className="block min-w-0 max-w-full break-words whitespace-normal text-lg font-bold tracking-tight text-foreground [overflow-wrap:anywhere] [text-wrap:pretty]">
									{current.label}
								</strong>
								<span className="block min-w-0 max-w-full break-words whitespace-normal text-sm text-muted-foreground [overflow-wrap:anywhere] [text-wrap:pretty]">
									{current.detail}
								</span>
							</div>
							{/* The single announcement for a selection change. The button labels
						    carry only position and year, so without this the detail would
						    never be spoken once a drag changes the stop. */}
							<p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
								{current.label}: {current.detail}
							</p>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
