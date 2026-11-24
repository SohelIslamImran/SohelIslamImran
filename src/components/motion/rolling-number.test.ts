import { describe, expect, it } from "vitest";
import { rollingDigits } from "./rolling-number";

describe("rollingDigits", () => {
	it("zero-pads to the default width of two digits", () => {
		expect(rollingDigits(3)).toEqual([0, 3]);
		expect(rollingDigits(12)).toEqual([1, 2]);
	});

	it("respects custom padding widths", () => {
		expect(rollingDigits(7, 1)).toEqual([7]);
		expect(rollingDigits(7, 3)).toEqual([0, 0, 7]);
		expect(rollingDigits(7, 4)).toEqual([0, 0, 0, 7]);
	});

	it("grows past pad when the value has more digits", () => {
		expect(rollingDigits(10, 1)).toEqual([1, 0]);
		expect(rollingDigits(128, 2)).toEqual([1, 2, 8]);
		expect(rollingDigits(1000, 2)).toEqual([1, 0, 0, 0]);
	});

	it("handles zero", () => {
		expect(rollingDigits(0)).toEqual([0, 0]);
		expect(rollingDigits(0, 1)).toEqual([0]);
		expect(rollingDigits(0, 3)).toEqual([0, 0, 0]);
		expect(rollingDigits(-0, 2)).toEqual([0, 0]);
	});

	it("returns null for invalid inputs", () => {
		expect(rollingDigits(-1)).toBeNull();
		expect(rollingDigits(-42, 3)).toBeNull();
		expect(rollingDigits(1.5)).toBeNull();
		expect(rollingDigits(0.01)).toBeNull();
		expect(rollingDigits(Number.NaN)).toBeNull();
		expect(rollingDigits(Number.POSITIVE_INFINITY)).toBeNull();
		expect(rollingDigits(Number.NEGATIVE_INFINITY)).toBeNull();
	});

	it("returns null for integers that print in exponent notation", () => {
		expect(rollingDigits(1e21)).toBeNull();
		expect(rollingDigits(Number.MAX_VALUE)).toBeNull();
		expect(rollingDigits(1e20)).toHaveLength(21);
	});
});
