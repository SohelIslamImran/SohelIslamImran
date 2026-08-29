import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
	AnimatePresence,
	motion,
	useMotionTemplate,
	useReducedMotion,
	useSpring,
} from "motion/react";
import type { ExperienceContent, IdentityContent } from "../types/content";
import { cn } from "../lib/utils";

export interface RouteStop {
	label: string;
	detail: string;
	accent?: "blue" | "orange";
}

interface GlassRouteHeroProps {
	identity: IdentityContent;
	experience?: ExperienceContent[];
	portraitSrc?: string;
	portraitAlt?: string;
	stops?: RouteStop[];
}

const defaultStops: RouteStop[] = [
	{ label: "Dhaka", detail: "Origin · UTC+6", accent: "orange" },
	{ label: "Kuno", detail: "Product systems · present" },
	{ label: "World", detail: "Remote by design", accent: "orange" },
];

export function GlassRouteHero({
	identity,
	experience = [],
	portraitSrc,
	portraitAlt = "Portrait of Sohel Islam Imran",
	stops = defaultStops,
}: GlassRouteHeroProps) {
	const [selected, setSelected] = useState(1);
	const sceneRef = useRef<HTMLDivElement>(null);
	const boundsRef = useRef<DOMRect | null>(null);
	const dragRef = useRef<{ pointerId: number; x: number } | null>(null);
	const pointerRef = useRef<{ x: number; y: number } | null>(null);
	const tiltFrameRef = useRef<number | null>(null);
	const reducedMotion = useReducedMotion();
	const rotateX = useSpring(0, { stiffness: 210, damping: 28, mass: 0.7 });
	const rotateY = useSpring(0, { stiffness: 210, damping: 28, mass: 0.7 });
	const sceneTransform = useMotionTemplate`perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

	useEffect(() => {
		return () => {
			if (tiltFrameRef.current !== null) cancelAnimationFrame(tiltFrameRef.current);
			rotateX.stop();
			rotateY.stop();
		};
	}, [rotateX, rotateY]);

	const setTilt = (x: number, y: number) => {
		if (
			!sceneRef.current ||
			reducedMotion ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
			!window.matchMedia("(hover: hover) and (pointer: fine)").matches
		)
			return;
		rotateX.set(y * -4);
		rotateY.set(x * 5);
	};

	const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		event.currentTarget.dataset.interacting = "true";
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
		if ((event.target as Element).closest("button")) return;
		dragRef.current = { pointerId: event.pointerId, x: event.clientX };
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (drag && Math.abs(event.clientX - drag.x) > 28)
			select(selected + (event.clientX < drag.x ? 1 : -1));
		dragRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId))
			event.currentTarget.releasePointerCapture(event.pointerId);
	};

	const select = (index: number) => setSelected(Math.max(0, Math.min(stops.length - 1, index)));
	const current = stops[selected] ?? stops[0];
	const currentKunoRole =
		experience.find((item) => item.company.toLowerCase() === "kuno" && item.current)?.role ??
		identity.role;
	const portrait = portraitSrc ?? "/images/sohel-linkedin-800.webp";

	return (
		<section
			className="hero mx-auto grid min-h-[min(760px,calc(100svh-72px))] w-[min(1180px,calc(100%-40px))] grid-cols-[minmax(0,1.08fr)_minmax(400px,.92fr)] items-center gap-[clamp(40px,6vw,88px)] py-[76px] max-[800px]:block max-[800px]:min-h-0 max-[800px]:py-[58px_30px]"
			aria-labelledby="hero-title"
		>
			<motion.div
				className="hero-copy min-w-0"
				initial={reducedMotion ? false : { opacity: 0, y: 14 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
			>
				<p className="kicker">
					<span className="status-dot" aria-hidden="true" /> {currentKunoRole} · Kuno
				</p>
				<h1
					className="hero-title my-5 max-w-[790px] text-[clamp(3.2rem,4.7vw,5rem)] font-[760] leading-[.97] tracking-[-.06em] [text-wrap:balance] max-[800px]:text-[clamp(2.85rem,12.4vw,4.4rem)]"
					id="hero-title"
				>
					I lead <span className="hero-nowrap inline-block">full-stack</span> product engineering at
					Kuno.
				</h1>
				<p className="hero-intro max-w-[540px] text-[clamp(17px,1.8vw,21px)] leading-[1.55] text-muted">
					I’m {identity.name}, a software engineer in {identity.location}. I work across product
					interfaces, backend services, data, infrastructure, and releases.
				</p>
				<div className="action-row mt-[34px] flex flex-wrap gap-3">
					<a
						className="button button-primary inline-flex min-h-12 items-center gap-[15px] rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground no-underline shadow-[0_10px_24px_var(--theme-accent-glow)] transition-[transform,background-color,box-shadow] duration-180 ease-route hover:-translate-y-0.5"
						href="#experience"
					>
						See the route <span aria-hidden="true">↘</span>
					</a>
					<a
						className="button button-quiet inline-flex min-h-12 items-center gap-[15px] rounded-full border border-line bg-surface-solid px-5 text-sm font-bold text-ink no-underline transition-[transform,background-color,box-shadow] duration-180 ease-route hover:-translate-y-0.5"
						href={`mailto:${identity.email}`}
					>
						Start a conversation <span aria-hidden="true">↗</span>
					</a>
				</div>
			</motion.div>
			<motion.div
				ref={sceneRef}
				className="hero-scene relative min-h-[560px] min-w-0 [perspective:1100px] [transform-style:preserve-3d] max-[800px]:mt-[26px] max-[800px]:min-h-[560px]"
				data-stop={selected}
				style={{ touchAction: "pan-y", transform: sceneTransform }}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={() => {
					dragRef.current = null;
					resetTilt();
				}}
				onLostPointerCapture={resetTilt}
				onPointerLeave={resetTilt}
			>
				<div className="hero-orb" aria-hidden="true" />
				<div className="hero-portrait glass absolute right-[8%] top-[4%] z-[2] w-[min(68%,360px)] rounded-[28px] p-2.5 max-[800px]:right-[7%] max-[800px]:top-[2%] max-[800px]:w-[min(86%,330px)]">
					<img
						src={portrait}
						srcSet={
							portraitSrc
								? undefined
								: "/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
						}
						sizes="(max-width: 800px) min(86vw, 330px), 360px"
						alt={portraitAlt}
						className="portrait-image block aspect-square w-full rounded-[20px] object-cover object-[center_20%]"
						width={800}
						height={800}
						fetchPriority="high"
						decoding="async"
					/>
					<div className="hero-caption flex justify-between gap-3 px-2 pb-1 pt-[15px] text-xs text-muted">
						<span>{identity.location}</span>
						<strong className="hero-caption-strong text-xs text-ink">
							Available for thoughtful work
						</strong>
					</div>
				</div>
				<svg
					className="route-orbit absolute inset-0 h-full w-full overflow-visible"
					viewBox="0 0 620 470"
					role="img"
					aria-label="Interactive route from Dhaka to Kuno to the world"
				>
					<path className="route-ghost" d="M72 380 C180 250 250 350 320 228 S465 102 558 72" />
					<path className="route-line" d="M72 380 C180 250 250 350 320 228 S465 102 558 72" />
					{stops.map((stop, index) => {
						const positions = [
							[72, 380],
							[320, 228],
							[558, 72],
						][index] ?? [320, 228];
						return (
							<g key={stop.label} className={cn("route-node", index === selected && "is-selected")}>
								<circle className="route-halo" cx={positions[0]} cy={positions[1]} r="22" />
								<circle
									className={cn(
										"route-dot",
										stop.accent === "orange" ? "route-dot-orange" : "route-dot-blue",
									)}
									cx={positions[0]}
									cy={positions[1]}
									r="8"
								/>
							</g>
						);
					})}
				</svg>
				<motion.div
					className="route-dock glass absolute bottom-[2%] left-1/2 z-[3] grid w-[min(94%,510px)] -translate-x-1/2 [transform:translateZ(65px)] grid-cols-[minmax(116px,.55fr)_minmax(0,1.45fr)] items-center gap-3 rounded-[20px] p-2 max-[800px]:bottom-0 max-[800px]:w-full max-[800px]:grid-cols-1 max-[800px]:[transform:none]"
					role="group"
					aria-label="Choose a route stop"
					onPointerDown={(event) => event.stopPropagation()}
				>
					<div
						className="route-dock-current grid gap-0.5 px-2.5 py-2 max-[800px]:flex max-[800px]:items-baseline max-[800px]:justify-between max-[800px]:gap-2.5"
						id="route-stop-detail"
						aria-live="polite"
					>
						<AnimatePresence initial={false} mode="wait">
							<motion.span
								className="route-dock-label text-xs font-extrabold text-primary"
								key={current?.label}
								initial={{ opacity: 0, filter: "blur(4px)", transform: "translateY(4px)" }}
								animate={{ opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" }}
								exit={{ opacity: 0, filter: "blur(4px)", transform: "translateY(-4px)" }}
								transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
							>
								{current?.label}
							</motion.span>
						</AnimatePresence>
						<AnimatePresence initial={false} mode="wait">
							<motion.strong
								className="route-dock-detail text-[11px] font-semibold leading-[1.3] text-muted"
								key={`${current?.label}-detail`}
								initial={{ opacity: 0, filter: "blur(4px)", transform: "translateY(4px)" }}
								animate={{ opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" }}
								exit={{ opacity: 0, filter: "blur(4px)", transform: "translateY(-4px)" }}
								transition={{ duration: 0.2, delay: 0.025, ease: [0.22, 1, 0.36, 1] }}
							>
								{current?.detail}
							</motion.strong>
						</AnimatePresence>
					</div>
					<div className="route-dock-stops grid grid-cols-3 gap-1">
						{stops.map((stop, index) => (
							<button
								key={stop.label}
								className="route-stop grid min-w-0 gap-px rounded-[13px] border border-transparent bg-transparent px-2 py-[9px] text-left text-muted transition-[background-color,border-color,transform] duration-180 ease-route hover:-translate-y-px max-[800px]:py-2"
								id={`route-stop-${index}`}
								type="button"
								aria-pressed={selected === index}
								aria-describedby={selected === index ? "route-stop-detail" : undefined}
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
									className="route-stop-index text-[9px] font-extrabold tracking-[.08em] text-primary"
									aria-hidden="true"
								>
									{String(index + 1).padStart(2, "0")}
								</span>
								<strong className="route-stop-label overflow-hidden text-xs text-ellipsis">
									{stop.label}
								</strong>
							</button>
						))}
					</div>
				</motion.div>
			</motion.div>
		</section>
	);
}
