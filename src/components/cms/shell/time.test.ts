import { describe, expect, it } from "vitest";
import { formatRelativeFromNow, formatUtcTimestamp, parseCmsTimestamp } from "./time";

describe("parseCmsTimestamp", () => {
	it("reads zone-less D1 timestamps as UTC", () => {
		expect(parseCmsTimestamp("2026-11-22 11:17:00")).toBe(Date.UTC(2026, 10, 22, 11, 17, 0));
		expect(parseCmsTimestamp("2026-11-22T11:17")).toBe(Date.UTC(2026, 10, 22, 11, 17, 0));
	});

	it("keeps explicit zones", () => {
		expect(parseCmsTimestamp("2026-11-22T11:17:00Z")).toBe(Date.UTC(2026, 10, 22, 11, 17, 0));
		expect(parseCmsTimestamp("2026-11-22T17:17:00+06:00")).toBe(Date.UTC(2026, 10, 22, 11, 17, 0));
	});
});

describe("formatters", () => {
	it("format zone-less timestamps in UTC", () => {
		expect(formatUtcTimestamp("2026-11-22 11:17:00")).toBe("2026-11-22 11:17 UTC");
		expect(formatRelativeFromNow("2026-11-22 11:17:00", Date.UTC(2026, 10, 22, 11, 19, 0))).toBe(
			"2m ago",
		);
	});
});
