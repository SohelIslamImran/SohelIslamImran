import { describe, expect, it } from "vitest";
import { isValidLiveVisitors } from "./live-visitors-guard";

describe("isValidLiveVisitors", () => {
	it("accepts a valid live visitors payload", () => {
		expect(
			isValidLiveVisitors({
				count: 2,
				paths: [
					{ value: "/", count: 1 },
					{ value: "/resume", count: 1 },
				],
			}),
		).toBe(true);
		expect(isValidLiveVisitors({ count: 0, paths: [] })).toBe(true);
	});

	it("rejects malformed responses missing numeric count or valid paths", () => {
		expect(isValidLiveVisitors(null)).toBe(false);
		expect(isValidLiveVisitors(undefined)).toBe(false);
		expect(isValidLiveVisitors("<html>error</html>")).toBe(false);
		expect(isValidLiveVisitors({})).toBe(false);
		expect(isValidLiveVisitors({ paths: [] })).toBe(false);
		expect(isValidLiveVisitors({ count: "2", paths: [] })).toBe(false);
		expect(isValidLiveVisitors({ count: Number.NaN, paths: [] })).toBe(false);
		expect(isValidLiveVisitors({ count: -1, paths: [] })).toBe(false);
		expect(isValidLiveVisitors({ count: 1, paths: "bad" })).toBe(false);
		expect(isValidLiveVisitors({ count: 1, paths: [{ value: "/", count: "1" }] })).toBe(false);
	});
});
