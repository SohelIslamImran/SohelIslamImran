import { describe, expect, it } from "vitest";
import { stackSlot } from "./undo-stack";

describe("stackSlot", () => {
	it("keeps a single removal neutral and interactive", () => {
		expect(stackSlot(0, 1, false)).toEqual({
			y: 0,
			scale: 1,
			opacity: 1,
			interactive: true,
		});
	});

	it("collapses multiple removals with two peeking edges behind the front card", () => {
		expect(stackSlot(0, 4, false)).toEqual({
			y: 0,
			scale: 1,
			opacity: 1,
			interactive: true,
		});
		expect(stackSlot(1, 4, false)).toEqual({
			y: -8,
			scale: 0.97,
			opacity: 0.9,
			interactive: false,
		});
		expect(stackSlot(2, 4, false)).toEqual({
			y: -16,
			scale: 0.94,
			opacity: 0.75,
			interactive: false,
		});
		expect(stackSlot(3, 4, false)).toEqual({
			y: -16,
			scale: 0.94,
			opacity: 0,
			interactive: false,
		});
	});

	it("spreads collapsed peeks by an extra 4 px per step when hovered", () => {
		expect(stackSlot(0, 4, false, true).y).toBe(0);
		expect(stackSlot(1, 4, false, true).y).toBe(-12);
		expect(stackSlot(2, 4, false, true).y).toBe(-24);
		expect(stackSlot(3, 4, false, true)).toMatchObject({ y: -24, opacity: 0, interactive: false });
	});

	it("makes every card interactive with neutral transforms when expanded", () => {
		for (let index = 0; index < 4; index++) {
			expect(stackSlot(index, 4, true)).toEqual({
				y: 0,
				scale: 1,
				opacity: 1,
				interactive: true,
			});
		}
	});
});
