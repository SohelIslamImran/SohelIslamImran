import { describe, expect, it } from "vitest";
import { readingProgress } from "./reading-progress";

const chapters = [
	{ top: 100, bottom: 300 },
	{ top: 400, bottom: 700 },
	{ top: 750, bottom: 1150 },
];

describe("readingProgress", () => {
	it.each([
		[0, 0, 0],
		[100, 0, 0],
		[200, 0, 0.5],
		[325, 0, 1],
		[350, 0, 1],
		[375, 1, 0],
		[550, 1, 0.5],
		[950, 2, 0.5],
		[1300, 2, 1],
	])("at %d reads chapter %d at fraction %d", (line, index, fraction) => {
		expect(readingProgress(chapters, line)).toEqual({ index, fraction });
	});

	it("handles an empty story and zero-height chapters", () => {
		expect(readingProgress([], 200)).toEqual({ index: 0, fraction: 0 });
		expect(readingProgress([{ top: 100, bottom: 100 }], 101)).toEqual({
			index: 0,
			fraction: 1,
		});
	});
});
