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
	splitByDaylight,
	subsolarPoint,
	sunHeight,
	timeGap,
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

	it("splits land into day and night by where the sun is", () => {
		const noonUtcJune = new Date(Date.UTC(2026, 5, 21, 12, 0));
		const sun = subsolarPoint(noonUtcJune);
		expect(sun.lon).toBeCloseTo(0, 5);
		expect(sun.lat).toBeGreaterThan(23);
		expect(sunHeight({ lat: 48.86, lon: 2.35 }, sun)).toBeGreaterThan(0);
		expect(sunHeight({ lat: -33.87, lon: 151.21 }, sun)).toBeLessThan(0);
		const split = splitByDaylight(noonUtcJune);
		const count = (path: string) => path.match(/h0/g)?.length ?? 0;
		expect(count(split.day) + count(split.night)).toBe(LAND_DOTS.length);
	});

	it("curves each arc above the straight line between its ends", () => {
		const [paris] = REMOTE_TEAMS;
		const path = arcPath(HOME, paris!);
		expect(path.match(/-?[\d.]+/g)).toHaveLength(6);
		const controlY = Number(path.split("Q")[1]!.split(" ")[1]);
		expect(controlY).toBeLessThan(Math.min(project(HOME).y, project(paris!).y));
	});

	it("reports the time gap from home, following daylight saving", () => {
		const winter = new Date(Date.UTC(2026, 0, 15, 12));
		const summer = new Date(Date.UTC(2026, 6, 15, 12));
		expect(timeGap("Europe/Paris", HOME.timeZone, winter)).toBe("5h behind");
		expect(timeGap("Europe/Paris", HOME.timeZone, summer)).toBe("4h behind");
		expect(timeGap("America/New_York", HOME.timeZone, winter)).toBe("11h behind");
		expect(timeGap("America/New_York", HOME.timeZone, summer)).toBe("10h behind");
		expect(timeGap("Asia/Kolkata", HOME.timeZone, winter)).toBe("30m behind");
		expect(timeGap("Asia/Dhaka", HOME.timeZone, winter)).toBe("same time");
		expect(timeGap("Not/AZone", HOME.timeZone, winter)).toBeNull();
	});
});
