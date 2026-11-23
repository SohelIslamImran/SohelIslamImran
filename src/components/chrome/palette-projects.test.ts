import { describe, expect, it } from "vitest";
import type { ProjectContent } from "../../types/content";
import { paletteProjects } from "./palette-projects";

function makeProject(overrides: Partial<ProjectContent>): ProjectContent {
	return {
		id: "p1",
		title: "Kuno",
		slug: "kuno",
		summary: "A B2B learning product.",
		description: "",
		year: "2026",
		role: "Lead",
		status: "Live",
		tags: ["React", "TypeScript"],
		category: "product",
		highlights: [],
		...overrides,
	};
}

describe("paletteProjects", () => {
	it("returns an empty list for missing or empty input", () => {
		expect(paletteProjects(undefined)).toEqual([]);
		expect(paletteProjects(null)).toEqual([]);
		expect(paletteProjects([])).toEqual([]);
	});

	it("skips projects with a blank or whitespace-only slug", () => {
		const result = paletteProjects([
			makeProject({ id: "blank", title: "Blank slug", slug: "" }),
			makeProject({ id: "ws", title: "Whitespace slug", slug: "   \t  " }),
			makeProject({ id: "ok", title: "Valid", slug: "valid" }),
		]);
		expect(result.map((item) => item.slug)).toEqual(["valid"]);
	});

	it("skips projects with a blank title", () => {
		const result = paletteProjects([
			makeProject({ id: "empty", title: "", slug: "empty-title" }),
			makeProject({ id: "spaces", title: "   ", slug: "space-title" }),
			makeProject({ id: "ok", title: "  Ghosttime  ", slug: "ghosttime" }),
		]);
		expect(result).toHaveLength(1);
		expect(result[0]?.label).toBe("Ghosttime");
		expect(result[0]?.slug).toBe("ghosttime");
	});

	it("trims slugs and builds clean /work/<slug> targets", () => {
		const result = paletteProjects([
			makeProject({
				id: "kuno",
				title: "  Kuno  ",
				slug: "  kuno  ",
				summary: "  Built from scratch.  ",
			}),
		]);
		expect(result).toEqual([
			{
				id: "project-kuno",
				slug: "kuno",
				target: "/work/kuno",
				label: "Kuno",
				detail: "Built from scratch.",
				keywords: "product 2026 Lead React TypeScript",
			},
		]);
	});

	it("drops duplicate slugs after trimming, keeping the first in index order", () => {
		const result = paletteProjects([
			makeProject({ id: "first", title: "First Kuno", slug: "kuno", category: "product" }),
			makeProject({
				id: "second",
				title: "Duplicate Kuno",
				slug: "  kuno  ",
				category: "product",
			}),
			makeProject({
				id: "third",
				title: "Experiment Kuno",
				slug: "kuno",
				category: "experiment",
			}),
		]);
		expect(result.map((item) => ({ id: item.id, slug: item.slug }))).toEqual([
			{ id: "project-first", slug: "kuno" },
		]);
	});

	it("omits detail when summary is blank", () => {
		const result = paletteProjects([makeProject({ id: "x", slug: "x", summary: "   " })]);
		expect(result[0]?.detail).toBeUndefined();
	});
});
