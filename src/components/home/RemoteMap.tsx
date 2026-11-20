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

const toPercent = (value: number, total: number) => `${((value / total) * 100).toFixed(2)}%`;

/** Dotted map of the routes between home and the teams I worked with. */
export function RemoteMap({ teams, className }: { teams: RemoteMapTeam[]; className?: string }) {
	const home = project(HOME);

	return (
		<div className={cn("rmap min-w-0", className)}>
			<div className="relative">
				<svg
					viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
					className="block h-auto w-full overflow-visible"
					aria-hidden="true"
				>
					<g fill="none" strokeLinecap="round" strokeWidth={5}>
						<path d={ALL_LAND} stroke="currentColor" className="text-muted-foreground/50" />
					</g>
					{teams.map((team) => {
						const point = project(team);
						return (
							<g key={team.company} className="text-primary-text">
								<path
									d={arcPath(HOME, team)}
									fill="none"
									stroke="currentColor"
									strokeWidth={3}
									opacity={0.75}
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
				{teams.map((team) => (
					<li
						key={team.company}
						className="flex min-w-0 items-start gap-3 text-[14.5px] leading-snug text-foreground"
					>
						<span
							aria-hidden="true"
							className="mt-[0.45em] size-2 shrink-0 rounded-full bg-primary"
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
					</li>
				))}
			</ul>
		</div>
	);
}
