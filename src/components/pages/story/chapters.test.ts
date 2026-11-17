import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../../../content/initial";
import { chapterItems, classifySource, layerEntries, splitStoryTitle } from "./chapters";

describe("story chapters", () => {
	it("keeps stable, unique chapter anchors", () => {
		const items = chapterItems([
			{ id: "01", eyebrow: "", title: "One", paragraphs: ["a"] },
			{ id: "01", eyebrow: "", title: "", paragraphs: [" ", "b"] },
		]);
		expect(items.map((item) => item.domId)).toEqual(["chapter-01", "chapter-01-2"]);
		expect(items[1].label).toBe("Chapter 2");
		expect(items[1].paragraphs).toEqual(["b"]);
		expect(items[1].numeral).toBe("01");
	});

	it("reads the descent from the published story without borrowing layers", () => {
		const items = chapterItems(INITIAL_PORTFOLIO_CONTENT.story.chapters);
		// Learning chapters come before any product layer.
		expect(items[0].layers).toEqual([]);
		// Layers reached only ever grow.
		for (let i = 1; i < items.length; i++) {
			expect(items[i].reached.length).toBeGreaterThanOrEqual(items[i - 1].reached.length);
		}
	});

	it("points each layer at the first chapter that names it", () => {
		const items = chapterItems(INITIAL_PORTFOLIO_CONTENT.story.chapters);
		for (const entry of layerEntries(items)) {
			if (!entry.chapter) continue;
			const index = items.indexOf(entry.chapter);
			expect(entry.chapter.layers).toContain(entry.id);
			for (const earlier of items.slice(0, index)) expect(earlier.layers).not.toContain(entry.id);
		}
	});

	it("splits a two-sentence title and classifies sources", () => {
		expect(splitStoryTitle("A. B")).toEqual({ lead: "A.", rest: "B" });
		expect(classifySource("https://example.com").external).toBe(true);
		expect(classifySource("/work").external).toBe(false);
	});
});
