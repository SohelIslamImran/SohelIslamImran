import { WORLD_COLS, WORLD_ROWS, WORLD_STEP, WORLD_TOP_LAT } from "./world-dots";

/** One grid cell is this many view-box units wide and tall. */
const CELL = 10;
const UNITS_PER_DEGREE = CELL / WORLD_STEP;

export const MAP_WIDTH = WORLD_COLS * CELL;
export const MAP_HEIGHT = WORLD_ROWS.length * CELL;

export interface Place {
	lat: number;
	lon: number;
}

export interface RemoteTeam extends Place {
	/** Matches `ExperienceContent.company`. */
	company: string;
	city: string;
}

/** Home, where the arcs start. */
export const HOME: Place = {
	lat: 23.81,
	lon: 90.41,
};

/** Teams I worked with remotely. Locations confirmed by Sohel on 2026-11-18. */
export const REMOTE_TEAMS: readonly RemoteTeam[] = [
	{ company: "Kuno", city: "Paris", lat: 48.86, lon: 2.35 },
	{
		company: "Tilleli",
		city: "New Jersey",
		lat: 40.06,
		lon: -74.41,
	},
];

/** Equirectangular position in view-box units, matching the dot grid. */
export function project({ lat, lon }: Place): { x: number; y: number } {
	return {
		x: (lon + 180) * UNITS_PER_DEGREE,
		y: (WORLD_TOP_LAT - lat) * UNITS_PER_DEGREE + CELL / 2,
	};
}

export interface LandDot extends Place {
	x: number;
	y: number;
}

/** Every land cell, decoded once at module load. */
export const LAND_DOTS: readonly LandDot[] = WORLD_ROWS.flatMap((row, rowIndex) => {
	const dots: LandDot[] = [];
	for (let column = 0; column < WORLD_COLS; column += 1) {
		const nibble = Number.parseInt(row[column >> 2] ?? "0", 16);
		if (!(nibble & (8 >> (column & 3)))) continue;
		dots.push({
			lat: WORLD_TOP_LAT - rowIndex * WORLD_STEP,
			lon: -180 + WORLD_STEP / 2 + column * WORLD_STEP,
			x: column * CELL + CELL / 2,
			y: rowIndex * CELL + CELL / 2,
		});
	}
	return dots;
});

/**
 * One path of zero-length segments; with a round line cap each becomes a dot.
 * Relative moves keep the markup small.
 */
export function dotsPath(dots: readonly LandDot[]): string {
	let path = "";
	let x = 0;
	let y = 0;
	for (const dot of dots) {
		path += path ? `m${dot.x - x} ${dot.y - y}h0` : `M${dot.x} ${dot.y}h0`;
		x = dot.x;
		y = dot.y;
	}
	return path;
}

/** A curved flight path from `from` to `to`, lifted by a share of its length. */
export function arcPath(from: Place, to: Place, lift = 0.32): string {
	const a = project(from);
	const b = project(to);
	const length = Math.hypot(b.x - a.x, b.y - a.y);
	const cx = (a.x + b.x) / 2;
	const cy = (a.y + b.y) / 2 - length * lift;
	const round = (value: number) => Math.round(value * 10) / 10;
	return `M${round(a.x)} ${round(a.y)}Q${round(cx)} ${round(cy)} ${round(b.x)} ${round(b.y)}`;
}
