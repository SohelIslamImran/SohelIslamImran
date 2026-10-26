import { describe, expect, it } from "vitest";
import { measureScrollEdges } from "./useScrollEdges";

describe("measureScrollEdges", () => {
	it("reports no overflow when the strip fits", () => {
		// Showing the fade or the scroll hint here is what painted a gradient over
		// the selected chip and advertised scrolling on strips that already fit.
		expect(measureScrollEdges(0, 550, 550)).toEqual({
			overflows: false,
			canScrollLeft: false,
			canScrollRight: false,
		});
	});

	it("shows only the trailing edge at the start of a scrollable strip", () => {
		expect(measureScrollEdges(0, 432, 340)).toEqual({
			overflows: true,
			canScrollLeft: false,
			canScrollRight: true,
		});
	});

	it("shows only the leading edge once scrolled to the end", () => {
		expect(measureScrollEdges(92, 432, 340)).toEqual({
			overflows: true,
			canScrollLeft: true,
			canScrollRight: false,
		});
	});

	it("shows both edges mid-scroll", () => {
		expect(measureScrollEdges(40, 432, 340)).toEqual({
			overflows: true,
			canScrollLeft: true,
			canScrollRight: true,
		});
	});

	it("ignores sub-pixel rounding at the boundaries", () => {
		expect(measureScrollEdges(0.4, 340.5, 340).overflows).toBe(false);
		expect(measureScrollEdges(92, 432, 340).canScrollRight).toBe(false);
	});
});
