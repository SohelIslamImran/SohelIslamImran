import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
	AnimatePresence,
	motion,
	useMotionTemplate,
	useReducedMotion,
	useSpring,
} from "motion/react";
import type { ExperienceContent, IdentityContent } from "../types/content";

export interface PrismRouteStop {
	label: string;
	detail: string;
	accent?: "blue" | "orange";
}

interface GlassRouteHeroProps {
	identity: IdentityContent;
	experience?: ExperienceContent[];
	portraitSrc?: string;
	portraitAlt?: string;
	stops?: PrismRouteStop[];
}

const defaultStops: PrismRouteStop[] = [
	{ label: "Dhaka", detail: "Origin · UTC+6", accent: "orange" },
	{ label: "Kuno", detail: "Product systems · present" },
	{ label: "World", detail: "Remote by design", accent: "orange" },
];

export function GlassRouteHero({
	identity,
	experience = [],
	portraitSrc = "/images/sohel-linkedin-800.webp",
	portraitAlt = "Portrait of Sohel Islam Imran",
	stops = defaultStops,
}: GlassRouteHeroProps) {
	const [selected, setSelected] = useState(1);
	const sceneRef = useRef<HTMLDivElement>(null);
	const boundsRef = useRef<DOMRect | null>(null);
	const dragRef = useRef<{ pointerId: number; x: number } | null>(null);
	const reducedMotion = useReducedMotion();
	const rotateX = useSpring(0, { stiffness: 210, damping: 28, mass: 0.7 });
	const rotateY = useSpring(0, { stiffness: 210, damping: 28, mass: 0.7 });
	const sceneTransform = useMotionTemplate`perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

	useEffect(() => {
		return () => {
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
		setTilt(
			((event.clientX - rect.left) / rect.width - 0.5) * 2,
			((event.clientY - rect.top) / rect.height - 0.5) * 2,
		);
	};

	const resetTilt = () => {
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

	return (
		<section className="hero" aria-labelledby="hero-title">
			<div className="hero-copy">
				<p className="kicker">
					<span className="status-dot" aria-hidden="true" /> {currentKunoRole} · Kuno
				</p>
				<h1 className="hero-title" id="hero-title">
					I lead <span className="hero-nowrap">full-stack</span> product engineering at Kuno.
				</h1>
				<p className="hero-intro">
					I’m {identity.name}, a software engineer in {identity.location}. I work across product
					interfaces, backend services, data, infrastructure, and releases.
				</p>
				<div className="action-row">
					<a className="button button-primary" href="#experience">
						See the route <span aria-hidden="true">↘</span>
					</a>
					<a className="button button-quiet" href={`mailto:${identity.email}`}>
						Start a conversation <span aria-hidden="true">↗</span>
					</a>
				</div>
			</div>
			<motion.div
				ref={sceneRef}
				className="hero-scene"
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
				<div className="hero-portrait glass">
					{portraitSrc ? (
						<img
							src={portraitSrc}
							srcSet="/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
							sizes="(max-width: 800px) min(86vw, 330px), 360px"
							alt={portraitAlt}
							className="portrait-image"
							width={800}
							height={800}
							fetchPriority="high"
							decoding="async"
						/>
					) : (
						<div className="portrait-placeholder" aria-label={portraitAlt}>
							{identity.name.slice(0, 1)}
						</div>
					)}
					<div className="hero-caption">
						<span>{identity.location}</span>
						<strong className="hero-caption-strong">Available for thoughtful work</strong>
					</div>
				</div>
				<svg
					className="route-orbit"
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
							<g
								key={stop.label}
								className={`route-node ${index === selected ? "is-selected" : ""}`}
							>
								<circle className="route-halo" cx={positions[0]} cy={positions[1]} r="22" />
								<circle
									className={`route-dot route-dot-${stop.accent ?? "blue"}`}
									cx={positions[0]}
									cy={positions[1]}
									r="8"
								/>
							</g>
						);
					})}
				</svg>
				<motion.div
					className="route-dock glass"
					role="group"
					aria-label="Choose a route stop"
					onPointerDown={(event) => event.stopPropagation()}
				>
					<div className="route-dock-current" id="prism-route-stop-detail" aria-live="polite">
						<AnimatePresence initial={false} mode="wait">
							<motion.span
								className="route-dock-label"
								key={current?.label}
								initial={{ opacity: 0, filter: "blur(4px)", transform: "translateY(4px)" }}
								animate={{ opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" }}
								exit={{ opacity: 0, filter: "blur(4px)", transform: "translateY(-4px)" }}
								transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
							>
								{current?.label}
							</motion.span>
							<motion.strong
								className="route-dock-detail"
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
					<div className="route-dock-stops">
						{stops.map((stop, index) => (
							<button
								key={stop.label}
								className="route-stop"
								id={`prism-route-stop-${index}`}
								type="button"
								aria-pressed={selected === index}
								aria-describedby={selected === index ? "prism-route-stop-detail" : undefined}
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
									document.getElementById(`prism-route-stop-${next}`)?.focus();
								}}
							>
								<span className="route-stop-index" aria-hidden="true">
									{String(index + 1).padStart(2, "0")}
								</span>
								<strong className="route-stop-label">{stop.label}</strong>
							</button>
						))}
					</div>
				</motion.div>
			</motion.div>
		</section>
	);
}
