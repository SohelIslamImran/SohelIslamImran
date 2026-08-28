import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ExperienceContent, IdentityContent } from "../../app/types/content";

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
	portraitSrc = "/images/sohel-linkedin.png",
	portraitAlt = "Portrait of Sohel Islam Imran",
	stops = defaultStops,
}: GlassRouteHeroProps) {
	const [selected, setSelected] = useState(1);
	const sceneRef = useRef<HTMLDivElement>(null);
	const boundsRef = useRef<DOMRect | null>(null);
	const frameRef = useRef<number | null>(null);
	const pointerRef = useRef({ x: 0, y: 0 });
	const dragRef = useRef<{ pointerId: number; x: number } | null>(null);

	const setTilt = (x: number, y: number) => {
		if (!sceneRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		pointerRef.current = { x, y };
		if (frameRef.current !== null) return;
		frameRef.current = window.requestAnimationFrame(() => {
			const point = pointerRef.current;
			sceneRef.current?.style.setProperty("--tilt-x", `${(point.y * -5).toFixed(2)}deg`);
			sceneRef.current?.style.setProperty("--tilt-y", `${(point.x * 7).toFixed(2)}deg`);
			frameRef.current = null;
		});
	};

	const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!boundsRef.current) boundsRef.current = event.currentTarget.getBoundingClientRect();
		const rect = boundsRef.current;
		setTilt(
			((event.clientX - rect.left) / rect.width - 0.5) * 2,
			((event.clientY - rect.top) / rect.height - 0.5) * 2,
		);
	};

	const resetTilt = () => {
		boundsRef.current = null;
		setTilt(0, 0);
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
		<section className="prism-hero" aria-labelledby="prism-hero-title">
			<div className="prism-hero__copy">
				<p className="prism-kicker">
					<span className="prism-status-dot" aria-hidden="true" /> {currentKunoRole} · Kuno
				</p>
				<h1 id="prism-hero-title">I make complex product systems feel simple.</h1>
				<p className="prism-hero__intro">
					{identity.name} leads full-stack product work across interfaces, services, data, and
					delivery—from {identity.location} for teams working everywhere.
				</p>
				<div className="prism-actions">
					<a className="prism-button prism-button--primary" href="#experience">
						See the route <span aria-hidden="true">↘</span>
					</a>
					<a className="prism-button prism-button--quiet" href={`mailto:${identity.email}`}>
						Start a conversation <span aria-hidden="true">↗</span>
					</a>
				</div>
			</div>
			<div
				ref={sceneRef}
				className="prism-hero__scene"
				style={{ touchAction: "pan-y" }}
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
				<div className="prism-hero__orb" aria-hidden="true" />
				<div className="prism-hero__portrait prism-glass-card">
					{portraitSrc ? (
						<img
							src={portraitSrc}
							alt={portraitAlt}
							width={800}
							height={800}
							fetchPriority="high"
						/>
					) : (
						<div className="prism-portrait-placeholder" aria-label={portraitAlt}>
							{identity.name.slice(0, 1)}
						</div>
					)}
					<div className="prism-hero__portrait-caption">
						<span>{identity.location}</span>
						<strong>Available for thoughtful work</strong>
					</div>
				</div>
				<svg
					className="prism-route"
					viewBox="0 0 620 470"
					role="img"
					aria-label="Interactive route from Dhaka to Kuno to the world"
				>
					<path
						className="prism-route__ghost"
						d="M72 380 C180 250 250 350 320 228 S465 102 558 72"
					/>
					<path
						className="prism-route__line"
						d="M72 380 C180 250 250 350 320 228 S465 102 558 72"
					/>
					{stops.map((stop, index) => {
						const positions = [
							[72, 380],
							[320, 228],
							[558, 72],
						][index] ?? [320, 228];
						return (
							<g
								key={stop.label}
								className={`prism-node ${index === selected ? "is-selected" : ""}`}
							>
								<circle className="prism-node__halo" cx={positions[0]} cy={positions[1]} r="22" />
								<circle
									className={`prism-node__dot prism-node__dot--${stop.accent ?? "blue"}`}
									cx={positions[0]}
									cy={positions[1]}
									r="8"
								/>
							</g>
						);
					})}
				</svg>
				<div
					className="prism-hero__control prism-glass-card"
					role="group"
					aria-label="Choose a route stop"
					onPointerDown={(event) => event.stopPropagation()}
				>
					<div className="prism-hero__control-copy">
						<span>Now exploring</span>
						<strong>{current?.label}</strong>
						<small>{current?.detail}</small>
					</div>
					<div className="prism-hero__controls">
						<button
							type="button"
							aria-label="Previous route stop"
							onClick={() => select(selected - 1)}
						>
							←
						</button>
						<div className="prism-stop-buttons">
							{stops.map((stop, index) => (
								<button
									key={stop.label}
									type="button"
									aria-label={`Explore ${stop.label}`}
									aria-pressed={selected === index}
									onClick={() => select(index)}
									onKeyDown={(event) => {
										const key = event.key;
										if (key === "ArrowRight" || key === "ArrowDown") {
											event.preventDefault();
											select(index + 1);
										} else if (key === "ArrowLeft" || key === "ArrowUp") {
											event.preventDefault();
											select(index - 1);
										} else if (key === "Home") {
											event.preventDefault();
											select(0);
										} else if (key === "End") {
											event.preventDefault();
											select(stops.length - 1);
										}
									}}
								>
									{index + 1}
								</button>
							))}
						</div>
						<button type="button" aria-label="Next route stop" onClick={() => select(selected + 1)}>
							→
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}
