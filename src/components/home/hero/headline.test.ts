import { describe, expect, it } from "vitest";
import { groupShortWords, splitHeadline } from "./headline";

describe("splitHeadline", () => {
	it("accents the clause after the last comma", () => {
		expect(splitHeadline("I build every layer of a product, from interface to release.")).toEqual({
			lead: ["I", "build", "every", "layer", "of", "a", "product,"],
			accent: ["from", "interface", "to", "release."],
		});
	});

	it("uses the last comma when there are several", () => {
		expect(splitHeadline("Screens, services, and releases.").accent).toEqual(["and", "releases."]);
	});

	it("falls back to the last word without a comma", () => {
		expect(splitHeadline("I build product systems end to end.")).toEqual({
			lead: ["I", "build", "product", "systems", "end", "to"],
			accent: ["end."],
		});
	});

	it("keeps short titles plain", () => {
		expect(splitHeadline("Hello there")).toEqual({ lead: ["Hello", "there"], accent: [] });
	});

	it("ignores a trailing or leading comma", () => {
		expect(splitHeadline("I build the whole product,").accent).toEqual(["product,"]);
		expect(splitHeadline(", and more").accent).toEqual([]);
	});

	it("collapses whitespace and handles empty input", () => {
		expect(splitHeadline("  a,\n  b  ")).toEqual({ lead: ["a,"], accent: ["b"] });
		expect(splitHeadline("   ")).toEqual({ lead: [], accent: [] });
	});
});

describe("groupShortWords", () => {
	it("keeps short words with the word after them", () => {
		const groups = groupShortWords(["I", "build", "every", "layer", "of", "a", "product,"]);
		expect(groups).toEqual([
			{ start: 0, words: ["I", "build"] },
			{ start: 2, words: ["every"] },
			{ start: 3, words: ["layer"] },
			{ start: 4, words: ["of", "a", "product,"] },
		]);
	});

	it("caps a run of short words at three per group", () => {
		expect(groupShortWords(["I", "do", "it", "in", "an", "interface"]).map((g) => g.words)).toEqual(
			[
				["I", "do", "it"],
				["in", "an", "interface"],
			],
		);
	});

	it("leaves a short final word in its own group", () => {
		expect(groupShortWords(["go", "to"])).toEqual([{ start: 0, words: ["go", "to"] }]);
		expect(groupShortWords([])).toEqual([]);
	});
});
