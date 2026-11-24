import { describe, expect, it } from "vitest";
import { mergeTagBatch } from "./field-logic";

describe("mergeTagBatch", () => {
	it("detects a single case-insensitive duplicate and names the field", () => {
		const result = mergeTagBatch(["React", "TypeScript"], "react", 20, "Tags");
		expect(result).toEqual({
			next: ["React", "TypeScript"],
			remaining: [],
			added: 0,
			duplicateIndexes: [0],
			duplicates: ["react"],
			message: "“react” is already in Tags.",
		});

		const tech = mergeTagBatch(["Cloudflare"], "cloudflare", 20, "Technologies");
		expect(tech.message).toBe("“cloudflare” is already in Technologies.");
	});

	it("reports added and skipped counts for pasted batches", () => {
		const oneSkipped = mergeTagBatch(["React"], "Vite, react, Bun", 20, "Tags");
		expect(oneSkipped).toEqual({
			next: ["React", "Vite", "Bun"],
			remaining: [],
			added: 2,
			duplicateIndexes: [0],
			duplicates: ["react"],
			message: "Added 2, skipped 1 duplicate.",
		});

		const twoSkipped = mergeTagBatch(["React", "Vite"], "react, Bun, VITE", 20, "Tags");
		expect(twoSkipped.added).toBe(1);
		expect(twoSkipped.duplicateIndexes).toEqual([0, 1]);
		expect(twoSkipped.message).toBe("Added 1, skipped 2 duplicates.");
	});

	it("skips duplicates within the same pasted batch without lighting non-existing indexes", () => {
		const result = mergeTagBatch(["React"], "Bun, bun", 20, "Tags");
		expect(result).toEqual({
			next: ["React", "Bun"],
			remaining: [],
			added: 1,
			duplicateIndexes: [],
			duplicates: ["bun"],
			message: "Added 1, skipped 1 duplicate.",
		});
	});

	it("adds valid tags cleanly with no duplicate message and respects max capacity", () => {
		const clean = mergeTagBatch(["React"], "Vite, Bun", 20, "Tags");
		expect(clean).toEqual({
			next: ["React", "Vite", "Bun"],
			remaining: [],
			added: 2,
			duplicateIndexes: [],
			duplicates: [],
			message: null,
		});

		const capped = mergeTagBatch(["React"], "Vite, Bun, D1", 2, "Tags");
		expect(capped.next).toEqual(["React", "Vite"]);
		expect(capped.remaining).toEqual(["Bun", "D1"]);
		expect(capped.message).toBeNull();
	});

	it("ignores blank or comma-only input", () => {
		expect(mergeTagBatch(["React"], " , , ", 20, "Tags")).toEqual({
			next: ["React"],
			remaining: [],
			added: 0,
			duplicateIndexes: [],
			duplicates: [],
			message: null,
		});
	});
});
