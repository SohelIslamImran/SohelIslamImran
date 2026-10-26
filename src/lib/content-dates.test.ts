import { describe, expect, it } from "vitest";
import { dateTimeFromPeriod } from "./content-dates";

describe("dateTimeFromPeriod", () => {
	it("reads the start of a range, not the end", () => {
		expect(dateTimeFromPeriod("Mar 2019 — Aug 2021")).toBe("2019-03");
		expect(dateTimeFromPeriod("2021 — Jan 2024")).toBe("2021");
		expect(dateTimeFromPeriod("2021 – Jan 2024")).toBe("2021");
		expect(dateTimeFromPeriod("Jan 2024 — Present")).toBe("2024-01");
	});

	it("handles a bare year and a bare month-year", () => {
		expect(dateTimeFromPeriod("2020")).toBe("2020");
		expect(dateTimeFromPeriod("Since 2019")).toBe("2019");
		expect(dateTimeFromPeriod("September 2023")).toBe("2023-09");
	});

	it("returns undefined when there is no parseable date", () => {
		expect(dateTimeFromPeriod("Present")).toBeUndefined();
		expect(dateTimeFromPeriod("")).toBeUndefined();
		expect(dateTimeFromPeriod("Currently")).toBeUndefined();
	});
});

describe("open-ended periods have no start date", () => {
	it("does not read the trailing year as the start", () => {
		expect(dateTimeFromPeriod("Present — 2021")).toBeUndefined();
		expect(dateTimeFromPeriod("Present — Jan 2024")).toBeUndefined();
		expect(dateTimeFromPeriod("Current")).toBeUndefined();
	});

	it("still reads a normal range start-first", () => {
		expect(dateTimeFromPeriod("Mar 2019 — Present")).toBe("2019-03");
		expect(dateTimeFromPeriod("Dec 2023 — present")).toBe("2023-12");
	});
});
