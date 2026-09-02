import {
	createElement,
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "@tanstack/react-router";
import {
	animate,
	AnimatePresence,
	motion,
	useMotionTemplate,
	useMotionValue,
	useReducedMotion,
	useSpring,
} from "motion/react";
import type {
	ExperienceContent,
	HeroContent,
	IdentityContent,
	LinkContent,
} from "../types/content";
import { cn } from "../lib/utils";
import { ActionRow, StatusBadge, Surface } from "./ui/portfolio";
import { PortfolioImage } from "./PortfolioImage";

export interface RouteStop {
	label: string;
	detail: string;
	accent?: "blue" | "orange";
}

export type RouteStops = readonly [RouteStop, RouteStop, RouteStop];

interface GlassRouteHeroProps {
	identity: IdentityContent;
	hero?: HeroContent;
	experience?: ExperienceContent[];
	portraitSrc?: string | null;
	portraitAlt?: string;
	stops?: RouteStops;
}

const defaultStops: RouteStops = [
	{ label: "Origin", detail: "Personal origin · UTC+6", accent: "orange" },
	{ label: "Kuno", detail: "Product systems · present" },
	{ label: "World", detail: "Remote by design", accent: "orange" },
];

const stopPositions = [
	[72, 380],
	[320, 228],
	[558, 72],
] as const;

function rubberband(value: number, dimension: number, constant = 0.55) {
	if (value <= 0) return 0;
	return (value * dimension * constant) / (dimension + constant * value);
}

function HeroAction({ action, index }: { action: LinkContent; index: number }) {
	const content = (
		<>
			{action.label} <span aria-hidden="true">{action.href.startsWith("#") ? "↘" : "↗"}</span>
		</>
	);

	return createElement(
		action.href.startsWith("/") ? Link : "a",
		{
			...(action.href.startsWith("/") ? { to: action.href } : { href: action.href }),
			className: cn(
				"inline-flex min-h-12 items-center gap-3 rounded-full px-5 text-sm font-bold no-underline shadow-[0_10px_24px_var(--theme-accent-glow)] transition-[transform,translate,scale,rotate,background-color,border-color,box-shadow] duration-180 ease-route hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring active:scale-[.97]",
				index === 0
					? "bg-primary text-primary-foreground shadow-[0_12px_26px_var(--theme-accent-glow)] hover:bg-primary/90 hover:shadow-[0_16px_32px_var(--theme-accent-glow)]"
					: "border border-border bg-surface-solid text-foreground hover:bg-muted",
			),
		},
		content,
	);
}

function renderHeadline(title: string) {
	return title.split(/(\s+)/).map((part, index) =>
		/[-‐‑‒–—]/u.test(part) ? (
			<span className="inline-block whitespace-nowrap" key={`${part}-${index}`}>
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
	const [selected, setSelected] = useState(1);
	const sceneRef = useRef<HTMLDivElement>(null);
	const boundsRef = useRef<DOMRect | null>(null);
	const dragRef = useRef<{
		pointerId: number;
		startX: number;
		previousX: number;
		previousTime: number;
		lastX: number;
		lastTime: number;
	} | null>(null);
	const pointerRef = useRef<{ x: number; y: number } | null>(null);
	const tiltFrameRef = useRef<number | null>(null);
	const reducedMotion = useReducedMotion();
	const dragX = useMotionValue(0);
	const rotateX = useSpring(0, { stiffness: 210, damping: 28, mass: 0.7 });
	const rotateY = useSpring(0, { stiffness: 210, damping: 28, mass: 0.7 });
	const sceneTransform = useMotionTemplate`perspective(1100px) translateX(${dragX}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

	useEffect(() => {
		return () => {
			if (tiltFrameRef.current !== null) cancelAnimationFrame(tiltFrameRef.current);
			rotateX.stop();
			rotateY.stop();
			dragX.stop();
		};
	}, [dragX, rotateX, rotateY]);

	const select = (index: number) => setSelected(Math.max(0, Math.min(stops.length - 1, index)));
	const current = stops[selected] ?? stops[0];
	const currentKunoRole =
		experience.find((item) => item.company.toLowerCase() === "kuno" && item.current)?.role ??
		identity.role;
	const portrait = portraitSrc ?? "/images/sohel-linkedin-800.webp";
	const actions = hero?.actions?.length
		? hero.actions
		: [
				{ label: "See the route", href: "#experience" },
				{ label: "Start a conversation", href: `mailto:${identity.email}`, external: true },
			];

	const setTilt = (x: number, y: number) => {
		if (
			!sceneRef.current ||
			dragRef.current ||
			reducedMotion ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
			!window.matchMedia("(hover: hover) and (pointer: fine)").matches
		)
			return;
		rotateX.set(y * -4);
		rotateY.set(x * 5);
	};

	const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (drag?.pointerId === event.pointerId) {
			const now = performance.now();
			const delta = event.clientX - drag.startX;
			const bound = 96;
			const next =
				Math.sign(delta) *
				(Math.abs(delta) > bound
					? bound + rubberband(Math.abs(delta) - bound, 120)
					: Math.abs(delta));
			dragX.set(next);
			drag.previousX = drag.lastX;
			drag.previousTime = drag.lastTime;
			drag.lastX = event.clientX;
			drag.lastTime = now;
			return;
		}
		if (!boundsRef.current) boundsRef.current = event.currentTarget.getBoundingClientRect();
		const rect = boundsRef.current;
		pointerRef.current = {
			x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
			y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
		};
		if (tiltFrameRef.current !== null) return;
		tiltFrameRef.current = requestAnimationFrame(() => {
			tiltFrameRef.current = null;
			const pointer = pointerRef.current;
			if (pointer) setTilt(pointer.x, pointer.y);
		});
	};

	const resetTilt = () => {
		if (tiltFrameRef.current !== null) {
			cancelAnimationFrame(tiltFrameRef.current);
			tiltFrameRef.current = null;
		}
		pointerRef.current = null;
		boundsRef.current = null;
		delete sceneRef.current?.dataset.interacting;
		rotateX.set(0);
		rotateY.set(0);
	};

	const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!event.isPrimary || (event.target as Element).closest("button,a")) return;
		dragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			previousX: event.clientX,
			previousTime: performance.now(),
			lastX: event.clientX,
			lastTime: performance.now(),
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		const now = performance.now();
		const releaseMoved = event.clientX !== drag.lastX;
		const velocity = releaseMoved
			? ((event.clientX - drag.lastX) / Math.max(16, now - drag.lastTime)) * 1000
			: ((drag.lastX - drag.previousX) / Math.max(16, drag.lastTime - drag.previousTime)) * 1000;
		const distance = event.clientX - drag.startX;
		const projected = distance + velocity * 0.18;
		if (Math.abs(projected) > 28) select(selected + (projected < 0 ? 1 : -1));
		dragRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId))
			event.currentTarget.releasePointerCapture(event.pointerId);
		if (reducedMotion) dragX.set(0);
		else animate(dragX, 0, { type: "spring", duration: 0.36, bounce: 0.12, velocity });
		resetTilt();
	};

	return (
		<section
			className="mx-auto grid min-h-[min(760px,calc(100svh-72px))] w-[min(1180px,calc(100%-40px))] grid-cols-[minmax(0,1.08fr)_minmax(400px,.92fr)] items-center gap-[clamp(40px,6vw,88px)] py-[76px] max-[959px]:block max-[959px]:min-h-0 max-[959px]:w-full max-[959px]:px-5 max-[959px]:py-[clamp(50px,7vw,74px)]"
			aria-labelledby="hero-title"
		>
			<motion.div
				className="min-w-0"
				initial={{ opacity: 0, y: 14 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
			>
				<p className="mb-3.5 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text">
					<span
						className="mr-1.5 inline-block size-2 rounded-full bg-signal align-[1px] shadow-[0_0_0_5px_color-mix(in_srgb,var(--theme-signal)_12%,transparent)]"
						aria-hidden="true"
					/>
					{hero?.eyebrow || `${currentKunoRole} · Kuno`}
				</p>
				<h1
					className="m-0 max-w-[790px] text-[clamp(3.15rem,4.7vw,5rem)] font-[760] leading-[0.95] tracking-[-0.065em] text-balance max-[959px]:text-[clamp(2.85rem,12.4vw,4.4rem)]"
					id="hero-title"
				>
					{renderHeadline(hero?.title || "I lead full-stack product engineering at Kuno.")}
				</h1>
				<p className="mt-5 max-w-[580px] text-[clamp(1.05rem,1.8vw,1.3rem)] leading-[1.55] text-muted-foreground">
					{hero?.intro ||
						`I’m ${identity.name}, a software engineer. I work across product interfaces, backend services, data, infrastructure, and releases.`}
				</p>
				<ActionRow>
					{actions.slice(0, 2).map((action, index) => (
						<HeroAction action={action} index={index} key={action.label} />
					))}
				</ActionRow>
			</motion.div>
			<motion.div
				ref={sceneRef}
				data-slot="hero-scene"
				className="relative min-h-[min(560px,calc(100vw+140px))] min-w-0 cursor-grab [perspective:1100px] [transform-style:preserve-3d] max-[959px]:mt-7 max-[959px]:min-h-[clamp(460px,68vw,540px)] min-[960px]:min-h-[560px] active:cursor-grabbing"
				style={{ touchAction: "pan-y", transform: sceneTransform }}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={finishDrag}
				onPointerCancel={(event) => {
					dragRef.current = null;
					if (reducedMotion) dragX.set(0);
					else animate(dragX, 0, { type: "spring", duration: 0.32, bounce: 0.1 });
					resetTilt();
					if (event.currentTarget.hasPointerCapture(event.pointerId))
						event.currentTarget.releasePointerCapture(event.pointerId);
				}}
				onLostPointerCapture={resetTilt}
				onPointerLeave={resetTilt}
			>
				<div
					className="pointer-events-none absolute inset-[12%_9%_8%] rounded-full border border-primary/20 shadow-[inset_0_0_80px_color-mix(in_srgb,var(--theme-surface-solid)_85%,transparent),0_30px_100px_var(--theme-accent-shadow)] [transform:rotate(-18deg)_scaleY(.7)]"
					aria-hidden="true"
				/>
				<Surface className="absolute right-[8%] top-[4%] z-[2] w-[min(68%,360px)] gap-0 p-2.5 [transform:translateZ(42px)_rotate(2deg)] will-change-transform max-[959px]:right-[7%] max-[959px]:top-[2%] max-[959px]:w-[min(86%,330px)] max-[560px]:w-[min(86%,330px)]">
					<div className="overflow-hidden rounded-[20px]">
						<PortfolioImage
							src={portrait}
							alt={portraitAlt}
							width={800}
							height={800}
							loading="eager"
							fetchPriority="high"
							sizes="(max-width: 959px) min(86vw, 330px), 360px"
							srcSet={
								portraitSrc
									? undefined
									: "/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
							}
							className="block aspect-square w-full rounded-[20px] object-cover object-[center_20%]"
						/>
					</div>
					<div className="flex items-start justify-between gap-3 px-2 pb-1 pt-3.5 text-[11px] leading-[1.35] text-muted-foreground">
						<span>{identity.location}</span>
						<StatusBadge className="shrink-0 whitespace-nowrap py-0.5 text-right text-[10px] leading-[1.25]">
							{identity.availability || "Available for thoughtful work"}
						</StatusBadge>
					</div>
				</Surface>
				<svg
					className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
					viewBox="0 0 620 470"
					role="img"
					aria-label="Interactive route from origin to Kuno to the world"
				>
					<path
						d="M72 380 C180 250 250 350 320 228 S465 102 558 72"
						fill="none"
						stroke="color-mix(in_srgb,var(--theme-surface-solid)_84%,transparent)"
						strokeLinecap="round"
						strokeWidth="15"
						style={{ filter: "blur(2px)" }}
					/>
					<path
						d="M72 380 C180 250 250 350 320 228 S465 102 558 72"
						fill="none"
						stroke="var(--theme-accent)"
						strokeDasharray="7 12"
						strokeDashoffset="380"
						strokeLinecap="round"
						strokeWidth="2"
						className="animate-route-draw motion-reduce:animate-none"
					/>
					{stops.map((stop, index) => {
						const position = stopPositions[index];
						return (
							<g
								key={stop.label}
								className={cn(
									"origin-center transition-transform duration-240 ease-route [transform-box:fill-box]",
									index === selected && "scale-[1.35]",
								)}
								style={{ transformOrigin: "center" } as CSSProperties}
							>
								<circle
									cx={position[0]}
									cy={position[1]}
									r="22"
									fill="color-mix(in_srgb,var(--theme-surface-solid)_72%,transparent)"
									stroke="var(--theme-accent-soft)"
									strokeWidth="1"
								/>
								<circle
									cx={position[0]}
									cy={position[1]}
									r="8"
									fill={stop.accent === "orange" ? "var(--theme-signal)" : "var(--theme-accent)"}
									stroke="var(--theme-surface-solid)"
									strokeWidth="3"
								/>
							</g>
						);
					})}
				</svg>
				<div
					data-material="glass"
					className="absolute bottom-[2%] left-1/2 z-[3] grid w-[min(94%,510px)] -translate-x-1/2 [transform:translateZ(65px)] grid-cols-[minmax(116px,.55fr)_minmax(0,1.45fr)] items-center gap-3 rounded-[20px] border border-border/80 bg-[color-mix(in_srgb,var(--theme-surface-solid)_84%,transparent)] p-2 shadow-accent backdrop-blur-2xl backdrop-saturate-150 max-[959px]:bottom-0 max-[959px]:w-full max-[959px]:grid-cols-1 max-[959px]:[transform:none] max-[560px]:rounded-[18px] max-[560px]:p-1.5"
					role="group"
					aria-label="Choose a route stop"
					onPointerDown={(event) => event.stopPropagation()}
				>
					<div
						className="grid gap-0.5 px-2.5 py-2 max-[959px]:flex max-[959px]:items-baseline max-[959px]:justify-between max-[959px]:gap-2.5"
						id="route-stop-detail"
					>
						<AnimatePresence initial={false} mode="wait">
							<motion.span
								className="text-xs font-extrabold text-primary-text"
								key={current?.label}
								initial={{ opacity: 0, y: 4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -4 }}
								transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
								aria-hidden="true"
							>
								{current?.label}
							</motion.span>
						</AnimatePresence>
						<AnimatePresence initial={false} mode="wait">
							<motion.strong
								className="text-[11px] leading-[1.3] text-muted-foreground"
								key={`${current?.label}-detail`}
								initial={{ opacity: 0, y: 4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -4 }}
								transition={{
									duration: reducedMotion ? 0 : 0.2,
									delay: reducedMotion ? 0 : 0.025,
									ease: [0.22, 1, 0.36, 1],
								}}
								aria-hidden="true"
							>
								{current?.detail}
							</motion.strong>
						</AnimatePresence>
					</div>
					<p className="sr-only" role="status" aria-live="polite">
						{current?.label}. {current?.detail}
					</p>
					<div className="grid grid-cols-3 gap-1">
						{stops.map((stop, index) => (
							<button
								key={stop.label}
								className="grid min-w-0 gap-px rounded-[13px] border border-transparent bg-transparent px-2 py-2.5 text-left text-muted-foreground transition-[background-color,border-color,transform,translate,scale,rotate,color] duration-180 ease-route hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:scale-[.97] aria-pressed:border-primary/30 aria-pressed:bg-primary-soft aria-pressed:text-foreground"
								id={`route-stop-${index}`}
								type="button"
								aria-label={`${stop.label}: ${stop.detail}`}
								aria-describedby={selected === index ? "route-stop-detail" : undefined}
								aria-pressed={selected === index}
								onClick={() => select(index)}
								onKeyDown={(event) => {
									let next = index;
									if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index + 1;
									else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index - 1;
									else if (event.key === "Home") next = 0;
									else if (event.key === "End") next = stops.length - 1;
									else return;
									event.preventDefault();
									next = Math.max(0, Math.min(stops.length - 1, next));
									select(next);
									document.getElementById(`route-stop-${next}`)?.focus();
								}}
							>
								<span
									className="text-[9px] font-extrabold tracking-[.08em] text-primary-text"
									aria-hidden="true"
								>
									{String(index + 1).padStart(2, "0")}
								</span>
								<strong className="truncate text-xs">{stop.label}</strong>
							</button>
						))}
					</div>
				</div>
			</motion.div>
		</section>
	);
}
