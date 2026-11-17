import { describe, expect, it } from "vitest";
import { splitHeadline } from "./headline";

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
