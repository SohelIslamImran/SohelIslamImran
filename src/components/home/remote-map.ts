import { WORLD_COLS, WORLD_ROWS, WORLD_STEP, WORLD_TOP_LAT } from "./world-dots";

/** One grid cell is this many view-box units wide and tall. */
const CELL = 10;
const UNITS_PER_DEGREE = CELL / WORLD_STEP;
const DEG = Math.PI / 180;

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
	timeZone: string;
}

/** Home, where the arcs start. */
export const HOME: Place & { city: string; timeZone: string } = {
	city: "Dhaka",
	lat: 23.81,
	lon: 90.41,
	timeZone: "Asia/Dhaka",
};

/** Teams I worked with remotely. Locations confirmed by Sohel on 2026-11-18. */
export const REMOTE_TEAMS: readonly RemoteTeam[] = [
	{ company: "Kuno", city: "Paris", lat: 48.86, lon: 2.35, timeZone: "Europe/Paris" },
	{
		company: "Tilleli",
		city: "New Jersey",
		lat: 40.06,
		lon: -74.41,
		timeZone: "America/New_York",
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

/** Where the sun is overhead (a simple model, good to a degree or two). */
export function subsolarPoint(date: Date): Place {
	const start = Date.UTC(date.getUTCFullYear(), 0, 0);
	const day = (date.getTime() - start) / 86_400_000;
	const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));
	const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
	return { lat: declination, lon: -15 * (hours - 12) };
}

/** Cosine of the sun's angle from overhead: above 0 is day. */
export function sunHeight(place: Place, sun: Place): number {
	return (
		Math.sin(place.lat * DEG) * Math.sin(sun.lat * DEG) +
		Math.cos(place.lat * DEG) * Math.cos(sun.lat * DEG) * Math.cos((place.lon - sun.lon) * DEG)
	);
}

/** Splits the land into the half the sun is on and the half it isn't. */
export function splitByDaylight(date: Date): { day: string; night: string } {
	const sun = subsolarPoint(date);
	const day: LandDot[] = [];
	const night: LandDot[] = [];
	for (const dot of LAND_DOTS) (sunHeight(dot, sun) > 0 ? day : night).push(dot);
	return { day: dotsPath(day), night: dotsPath(night) };
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

/** UTC offset of `timeZone` at `date`, in minutes east of UTC. Null when unknown. */
function offsetMinutes(timeZone: string, date: Date): number | null {
	try {
		const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
			.formatToParts(date)
			.find((part) => part.type === "timeZoneName")?.value;
		if (!name) return null;
		if (name === "GMT") return 0;
		const match = /GMT([+-])(\d{2}):(\d{2})/u.exec(name);
		if (!match) return null;
		const minutes = Number(match[2]) * 60 + Number(match[3]);
		return match[1] === "-" ? -minutes : minutes;
	} catch {
		return null;
	}
}

/** "5h behind", "11h behind", or null when either zone is unknown. */
export function timeGap(timeZone: string, homeZone: string, date: Date): string | null {
	const there = offsetMinutes(timeZone, date);
	const here = offsetMinutes(homeZone, date);
	if (there === null || here === null) return null;
	const minutes = here - there;
	if (minutes === 0) return "same time";
	const hours = Math.floor(Math.abs(minutes) / 60);
	const rest = Math.abs(minutes) % 60;
	const text = hours === 0 ? `${rest}m` : rest ? `${hours}h ${rest}m` : `${hours}h`;
	return minutes > 0 ? `${text} behind` : `${text} ahead`;
}
