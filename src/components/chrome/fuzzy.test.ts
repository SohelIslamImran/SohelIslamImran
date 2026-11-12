import { describe, expect, it } from "vitest";
import { fuzzyScore, scoreItem } from "./fuzzy";

describe("fuzzyScore", () => {
	it("matches everything for an empty query", () => {
		expect(fuzzyScore("", "Work")).toBe(0);
	});

	it("matches in-order subsequences and rejects out-of-order ones", () => {
		expect(fuzzyScore("wrk", "Work")).not.toBeNull();
		expect(fuzzyScore("krw", "Work")).toBeNull();
	});

	it("ignores case and accents", () => {
		expect(fuzzyScore("resume", "Résumé")).not.toBeNull();
	});

	it("ranks prefix matches above scattered matches", () => {
		const prefix = fuzzyScore("ex", "Expo in-app updates") ?? -Infinity;
		const scattered = fuzzyScore("ex", "Field notes index") ?? -Infinity;
		expect(prefix).toBeGreaterThan(scattered);
	});

	it("rewards word starts", () => {
		const wordStart = fuzzyScore("iu", "in-app updates") ?? -Infinity;
		const midWord = fuzzyScore("iu", "liquid") ?? -Infinity;
		expect(wordStart).toBeGreaterThan(midWord);
	});
});

describe("scoreItem", () => {
	it("does not match letters scattered through long descriptions", () => {
		expect(
			scoreItem("dark", "SohelIslamImran", "An open-source tool that helps developers ask"),
		).toBeNull();
	});

	it("falls back to keywords", () => {
		expect(scoreItem("dark", "Use dark appearance")).not.toBeNull();
		expect(scoreItem("night", "Dark", "night theme")).not.toBeNull();
		expect(scoreItem("zzz", "Dark", "night theme")).toBeNull();
	});
});
