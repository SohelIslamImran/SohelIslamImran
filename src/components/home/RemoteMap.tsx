import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
	prefersReducedMotion,
	useEnterViewportOnce,
	usePointerFine,
	usePrefersReducedMotion,
} from "@/components/motion";
import { cn } from "@/lib/utils";
import {
	HOME,
	LAND_DOTS,
	MAP_HEIGHT,
	MAP_WIDTH,
	arcPath,
	dotsPath,
	project,
	type RemoteTeam,
} from "./remote-map";

export interface RemoteMapTeam extends RemoteTeam {
	period?: string;
}

const ALL_LAND = dotsPath(LAND_DOTS);

const MAP_CSS = `
.rmap-arc {
	transition: opacity 220ms var(--theme-ease), stroke-width 220ms var(--theme-ease);
}
.rmap [data-armed] .rmap-arc { stroke-dasharray: 1; stroke-dashoffset: 1; }
.rmap [data-armed] .rmap-destination { scale: 0; }
.rmap-destination, .rmap-ping { transform-box: fill-box; transform-origin: center; }
.rmap [data-armed][data-entered] .rmap-arc {
	animation: rmap-draw 900ms var(--theme-ease) var(--route-delay) both;
}
.rmap [data-armed][data-entered] .rmap-destination {
	animation: rmap-arrive 240ms var(--theme-ease) calc(var(--route-delay) + 900ms) both;
}
.rmap-packet {
	/* The hero dot's travel curve, so the packet reads mid-arc. */
	animation: rmap-packet 900ms cubic-bezier(0.65, 0, 0.35, 1) both;
	filter: drop-shadow(0 0 3px color-mix(in srgb, var(--theme-accent) 70%, transparent));
}
.rmap-ping { opacity: 0; animation: rmap-ping 600ms var(--theme-ease) 900ms forwards; }
.rmap-row-dot { transition: box-shadow 220ms var(--theme-ease); }
.rmap-row[aria-pressed="true"] { background: color-mix(in srgb, var(--theme-ink) 4%, transparent); }
.rmap-row[aria-pressed="true"] .rmap-row-dot { box-shadow: 0 0 0 3px var(--theme-accent-soft); }
@media (hover: hover) and (pointer: fine) {
	.rmap-row:hover { background: color-mix(in srgb, var(--theme-ink) 4%, transparent); }
}
@media (prefers-reduced-motion: reduce) {
	.rmap .rmap-arc, .rmap-row-dot { transition: none; }
	.rmap [data-armed][data-entered] .rmap-arc,
	.rmap [data-armed] .rmap-arc { animation: none; stroke-dasharray: none; stroke-dashoffset: 0; }
	.rmap [data-armed][data-entered] .rmap-destination,
	.rmap [data-armed] .rmap-destination { animation: none; scale: 1; }
	.rmap :is(.rmap-packet, .rmap-ping) { display: none; }
}
@keyframes rmap-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes rmap-arrive { from { scale: 0; } to { scale: 1; } }
@keyframes rmap-packet {
	from { stroke-dashoffset: 1.08; opacity: 1; }
	/* The last dash spans 0.92–1 while it fades, with the preceding dash off the path. */
	96% { stroke-dashoffset: 0.16; opacity: 1; }
	to { stroke-dashoffset: 0.16; opacity: 0; }
}
@keyframes rmap-ping {
	from { opacity: 0.5; scale: 1; }
	to { opacity: 0; scale: 2.75; }
}
`;

const toPercent = (value: number, total: number) => `${((value / total) * 100).toFixed(2)}%`;

/** Dotted map of the routes between home and the teams I worked with. */
export function RemoteMap({ teams, className }: { teams: RemoteMapTeam[]; className?: string }) {
	const home = project(HOME);
	const mapRef = useRef<SVGSVGElement>(null);
	const [armed, setArmed] = useState(false);
	const [entered, setEntered] = useState(false);
	const reducedMotion = usePrefersReducedMotion();
	const pointerFine = usePointerFine();
	const [hovered, setHovered] = useState<string | null>(null);
	const [focused, setFocused] = useState<string | null>(null);
	const [pin, setPin] = useState<{ company: string; packet: number | null } | null>(null);
	const pinCount = useRef(0);
	const interactive = teams.length > 1;
	const active = interactive ? ((pointerFine ? hovered : null) ?? focused ?? pin?.company) : null;

	useEffect(() => {
		const map = mapRef.current;
		if (!map || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
		if (map.getBoundingClientRect().top >= window.innerHeight) setArmed(true);
	}, []);
	useEnterViewportOnce(
		mapRef,
		(visibleOnMount) => {
			if (!visibleOnMount) setEntered(true);
		},
		{ rootMargin: "0px" },
	);

	useEffect(() => {
		if (reducedMotion) {
			setArmed(false);
			setPin((current) => current && { ...current, packet: null });
		}
	}, [reducedMotion]);

	const togglePin = (company: string) => {
		const packet = reducedMotion ? null : ++pinCount.current;
		setPin((current) => (current?.company === company ? null : { company, packet }));
	};

	return (
		<div className={cn("rmap min-w-0", className)}>
			<style href="trace-home-remote-map" precedence="default">
				{MAP_CSS}
			</style>
			<div className="relative">
				<svg
					ref={mapRef}
					data-armed={armed && !reducedMotion ? "" : undefined}
					data-entered={armed && entered && !reducedMotion ? "" : undefined}
					viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
					className="block h-auto w-full overflow-visible"
					aria-hidden="true"
				>
					<g fill="none" strokeLinecap="round" strokeWidth={5}>
						<path d={ALL_LAND} stroke="currentColor" className="text-muted-foreground/50" />
					</g>
					{teams.map((team, index) => {
						const point = project(team);
						const path = arcPath(HOME, team);
						const highlighted = active === team.company;
						const packet =
							interactive && !reducedMotion && pin?.company === team.company ? pin.packet : null;
						return (
							<g
								key={team.company}
								className="text-primary-text"
								style={{ "--route-delay": `${index * 160}ms` } as CSSProperties}
							>
								<path
									d={path}
									pathLength={1}
									className="rmap-arc"
									fill="none"
									stroke="currentColor"
									strokeWidth={highlighted ? 3.5 : 3}
									opacity={highlighted ? 1 : active ? 0.2 : 0.75}
								/>
								<circle
									className="rmap-destination"
									cx={point.x}
									cy={point.y}
									r={8}
									fill="currentColor"
									onAnimationEnd={index === teams.length - 1 ? () => setArmed(false) : undefined}
								/>
								{highlighted ? (
									<circle
										cx={point.x}
										cy={point.y}
										r={14}
										fill="none"
										stroke="var(--theme-accent-line)"
										strokeWidth={1.5}
									/>
								) : null}
								{packet !== null ? (
									<g key={packet}>
										<path
											className="rmap-packet"
											d={path}
											pathLength={1}
											fill="none"
											stroke="var(--theme-accent-line)"
											strokeWidth={6}
											strokeLinecap="round"
											strokeDasharray="0.08 1"
										/>
										<circle
											className="rmap-ping"
											cx={point.x}
											cy={point.y}
											r={8}
											fill="none"
											stroke="var(--theme-accent-line)"
											strokeWidth={1.5}
											onAnimationEnd={() =>
												setPin((current) =>
													current?.packet === packet ? { ...current, packet: null } : current,
												)
											}
										/>
									</g>
								) : null}
							</g>
						);
					})}
					<circle cx={home.x} cy={home.y} r={10} className="fill-foreground" />
					<circle
						cx={home.x}
						cy={home.y}
						r={17}
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						className="text-foreground/40"
					/>
				</svg>
				{[
					{ key: "home", label: "Home", place: HOME },
					...teams.map((team) => ({ key: team.company, label: team.city, place: team })),
				].map(({ key, label, place }) => {
					const point = project(place);
					return (
						<span
							key={key}
							aria-hidden="true"
							className={cn(
								"mono-label pointer-events-none absolute mt-2.5 -translate-x-1/2 text-[10.5px] whitespace-nowrap",
								key === "home" || key === active ? "text-foreground" : "text-ink-soft",
							)}
							style={{
								left: toPercent(point.x, MAP_WIDTH),
								top: toPercent(point.y, MAP_HEIGHT),
							}}
						>
							{label}
						</span>
					);
				})}
			</div>
			<ul aria-label="Remote teams" className="m-0 mt-7 grid list-none gap-2.5 p-0">
				{teams.map((team) => {
					const row = (
						<>
							<span
								aria-hidden="true"
								className="rmap-row-dot mt-[0.45em] size-2 shrink-0 rounded-full bg-primary"
							/>
							<span className="min-w-0">
								<span className="font-medium">{team.company}</span>
								<span className="text-muted-foreground"> · {team.city}</span>
								{team.period ? (
									<span className="mt-0.5 block text-[13px] text-muted-foreground">
										{team.period}
									</span>
								) : null}
							</span>
						</>
					);
					const rowClass =
						"flex min-w-0 items-start gap-3 text-left text-[14.5px] leading-snug text-foreground";
					return (
						<li key={team.company}>
							{interactive ? (
								<button
									type="button"
									aria-pressed={pin?.company === team.company}
									className={cn(
										"rmap-row min-h-11 w-full cursor-pointer rounded-inner px-2 py-1",
										rowClass,
									)}
									onPointerEnter={(event) => {
										if (pointerFine && event.pointerType !== "touch") setHovered(team.company);
									}}
									onPointerLeave={() => setHovered(null)}
									onFocus={(event) => {
										setFocused(event.currentTarget.matches(":focus-visible") ? team.company : null);
									}}
									onBlur={() => setFocused(null)}
									onClick={() => togglePin(team.company)}
									onKeyDown={(event) => {
										if (event.currentTarget.matches(":focus-visible")) setFocused(team.company);
										if (event.key === "Escape") setPin(null);
									}}
								>
									{row}
								</button>
							) : (
								<div className={rowClass}>{row}</div>
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
