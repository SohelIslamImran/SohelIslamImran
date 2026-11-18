import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
	HOME,
	LAND_DOTS,
	MAP_HEIGHT,
	MAP_WIDTH,
	arcPath,
	dotsPath,
	project,
	splitByDaylight,
	timeGap,
	type RemoteTeam,
} from "./remote-map";

export interface RemoteMapTeam extends RemoteTeam {
	period?: string;
}

const ALL_LAND = dotsPath(LAND_DOTS);

/**
 * Arcs fly from home to each team; the packet travels along a dash measured in
 * path lengths (`pathLength="1"`), so every arc takes the same time. Motion
 * only runs when the visitor allows it.
 */
const MAP_CSS = `
.rmap-arc { opacity: 0.7; transition: opacity 300ms var(--theme-ease); }
.rmap[data-focus] .rmap-arc { opacity: 0.14; }
.rmap[data-focus] .rmap-arc[data-on] { opacity: 0.95; }
.rmap-packet { opacity: 0; stroke-dasharray: 0.07 2; stroke-dashoffset: 0.07; }
.rmap-pulse { opacity: 0; transform-box: fill-box; transform-origin: center; }
.rmap-row { transition: color 200ms var(--theme-ease); }
.rmap[data-focus] .rmap-row:not([data-on]) { color: var(--color-muted-foreground); }
@media (prefers-reduced-motion: no-preference) {
	.rmap-packet { opacity: 1; animation: rmap-fly 3.8s var(--theme-ease) infinite; }
	.rmap-pulse { animation: rmap-pulse 3.8s ease-out infinite; }
}
@keyframes rmap-fly {
	0% { stroke-dashoffset: 0.07; }
	55%, 100% { stroke-dashoffset: -1; }
}
@keyframes rmap-pulse {
	0%, 50% { opacity: 0; transform: scale(1); }
	56% { opacity: 0.7; transform: scale(1); }
	100% { opacity: 0; transform: scale(3.2); }
}
`;

const toPercent = (value: number, total: number) => `${((value / total) * 100).toFixed(2)}%`;

/**
 * A dotted map of the world with an arc from home to every team I have worked
 * with remotely. After mount the land splits into day and night for the
 * current minute, and each team shows its time gap from home. The server
 * sends the plain map, so hydration always matches.
 */
export function RemoteMap({ teams, className }: { teams: RemoteMapTeam[]; className?: string }) {
	const [now, setNow] = useState<Date | null>(null);
	const [focus, setFocus] = useState<string | null>(null);

	useEffect(() => {
		const tick = () => setNow(new Date());
		tick();
		const timer = window.setInterval(tick, 60_000);
		return () => window.clearInterval(timer);
	}, []);

	const land = useMemo(() => (now ? splitByDaylight(now) : null), [now]);
	const home = project(HOME);

	return (
		<div className={cn("rmap min-w-0", className)} data-focus={focus ?? undefined}>
			<style dangerouslySetInnerHTML={{ __html: MAP_CSS }} />
			<div className="relative">
				<svg
					viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
					className="block h-auto w-full overflow-visible"
					aria-hidden="true"
				>
					<g fill="none" strokeLinecap="round" strokeWidth={5}>
						{land ? (
							<>
								<path d={land.night} stroke="currentColor" className="text-muted-foreground/20" />
								<path d={land.day} stroke="currentColor" className="text-muted-foreground/80" />
							</>
						) : (
							<path d={ALL_LAND} stroke="currentColor" className="text-muted-foreground/50" />
						)}
					</g>
					{teams.map((team, index) => {
						const d = arcPath(HOME, team);
						const point = project(team);
						const delay = `${index * 1.9}s`;
						return (
							<g key={team.company} className="text-primary-text">
								<path
									d={d}
									fill="none"
									stroke="currentColor"
									strokeWidth={2.5}
									className="rmap-arc"
									data-on={focus === team.company ? "" : undefined}
								/>
								<path
									d={d}
									pathLength={1}
									fill="none"
									stroke="currentColor"
									strokeWidth={6}
									strokeLinecap="round"
									className="rmap-packet"
									style={{ animationDelay: delay }}
								/>
								<circle
									cx={point.x}
									cy={point.y}
									r={9}
									fill="none"
									stroke="currentColor"
									strokeWidth={2.5}
									className="rmap-pulse"
									style={{ animationDelay: delay }}
								/>
								<circle cx={point.x} cy={point.y} r={8} fill="currentColor" />
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
					{ key: "home", label: HOME.city, place: HOME },
					...teams.map((team) => ({ key: team.company, label: team.city, place: team })),
				].map(({ key, label, place }) => {
					const point = project(place);
					return (
						<span
							key={key}
							aria-hidden="true"
							className={cn(
								"mono-label pointer-events-none absolute mt-2.5 -translate-x-1/2 text-[10.5px] whitespace-nowrap",
								key === "home" ? "text-foreground" : "text-ink-soft",
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
			<ul className="m-0 mt-7 grid list-none gap-2.5 p-0">
				{teams.map((team) => {
					const gap = now ? timeGap(team.timeZone, HOME.timeZone, now) : null;
					return (
						<li
							key={team.company}
							className="rmap-row flex min-w-0 items-start gap-3 text-[14.5px] leading-snug text-foreground"
							data-on={focus === team.company ? "" : undefined}
							onPointerEnter={() => setFocus(team.company)}
							onPointerLeave={() => setFocus(null)}
						>
							<span
								aria-hidden="true"
								className="mt-[0.45em] size-2 shrink-0 rounded-full bg-primary"
							/>
							<span className="min-w-0 flex-1">
								<span className="font-medium">{team.company}</span>
								<span className="text-muted-foreground"> · {team.city}</span>
								{team.period ? (
									<span className="mt-0.5 block text-[13px] text-muted-foreground">
										{team.period}
									</span>
								) : null}
							</span>
							{gap ? (
								<span className="mono-label mt-[0.2em] shrink-0 text-muted-foreground">{gap}</span>
							) : null}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
