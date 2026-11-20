import { describe, expect, it } from "vitest";
import {
	HOME,
	LAND_DOTS,
	MAP_HEIGHT,
	MAP_WIDTH,
	REMOTE_TEAMS,
	arcPath,
	dotsPath,
	project,
} from "./remote-map";

const nearestDot = (lat: number, lon: number) =>
	LAND_DOTS.reduce((best, dot) =>
		Math.hypot(dot.lat - lat, dot.lon - lon) < Math.hypot(best.lat - lat, best.lon - lon)
			? dot
			: best,
	);

describe("remote map", () => {
	it("decodes land where the continents are and leaves the oceans empty", () => {
		expect(LAND_DOTS.length).toBeGreaterThan(2000);
		const onLand = (lat: number, lon: number) =>
			LAND_DOTS.some((dot) => Math.abs(dot.lat - lat) < 1.3 && Math.abs(dot.lon - lon) < 1.3);
		expect(onLand(23.75, 88.75)).toBe(true); // Bengal
		expect(onLand(47.5, 1.25)).toBe(true); // France
		expect(onLand(40, -76.25)).toBe(true); // Pennsylvania
		expect(onLand(0, -30)).toBe(false); // Atlantic
		expect(onLand(-20, 75)).toBe(false); // Indian Ocean
	});

	it("puts every place inside the map, on the dot grid", () => {
		for (const place of [HOME, ...REMOTE_TEAMS]) {
			const point = project(place);
			expect(point.x).toBeGreaterThan(0);
			expect(point.x).toBeLessThan(MAP_WIDTH);
			expect(point.y).toBeGreaterThan(0);
			expect(point.y).toBeLessThan(MAP_HEIGHT);
		}
		const dot = nearestDot(HOME.lat, HOME.lon);
		expect(project(dot)).toEqual({ x: dot.x, y: dot.y });
	});

	it("draws one dot per land cell", () => {
		const path = dotsPath(LAND_DOTS);
		expect(path.match(/h0/g)?.length).toBe(LAND_DOTS.length);
		expect(path.startsWith("M")).toBe(true);
	});

	it("curves each arc above the straight line between its ends", () => {
		const [paris] = REMOTE_TEAMS;
		const path = arcPath(HOME, paris!);
		expect(path.match(/-?[\d.]+/g)).toHaveLength(6);
		const controlY = Number(path.split("Q")[1]!.split(" ")[1]);
		expect(controlY).toBeLessThan(Math.min(project(HOME).y, project(paris!).y));
	});
});
