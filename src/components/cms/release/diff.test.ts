import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../../../content/initial";
import { diffPortfolioDocuments, resolvePathTarget } from "./diff";
import { diffWords } from "./word-diff";

describe("word-level LCS diff", () => {
	it("highlights inserted and deleted words while preserving spacing", () => {
		const parts = diffWords(
			"I build web products end to end.",
			"I build every layer of a product end to end.",
		);
		expect(parts.map((part) => (part.kind === "del" ? "" : part.text)).join("")).toBe(
			"I build every layer of a product end to end.",
		);
		expect(parts.map((part) => (part.kind === "add" ? "" : part.text)).join("")).toBe(
			"I build web products end to end.",
		);
		expect(parts.some((part) => part.kind === "del" && part.text.includes("web"))).toBe(true);
		expect(parts.some((part) => part.kind === "add" && part.text.includes("every"))).toBe(true);
	});

	it("handles identical and empty strings", () => {
		expect(diffWords("same", "same")).toEqual([{ kind: "same", text: "same" }]);
		expect(diffWords("", "added")).toEqual([{ kind: "add", text: "added" }]);
		expect(diffWords("removed", "")).toEqual([{ kind: "del", text: "removed" }]);
	});
});

describe("portfolio structural diff", () => {
	it("reports zero changes for identical documents", () => {
		const diff = diffPortfolioDocuments(INITIAL_PORTFOLIO_CONTENT, INITIAL_PORTFOLIO_CONTENT);
		expect(diff.changedSections).toHaveLength(0);
		expect(diff.totalChanges).toBe(0);
	});

	it("matches collection rows by id so reordering reports reordered instead of edited", () => {
		const draft = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		const [first, second, ...rest] = draft.projects;
		draft.projects = [second!, first!, ...rest];

		const diff = diffPortfolioDocuments(INITIAL_PORTFOLIO_CONTENT, draft);
		const projectsDiff = diff.changedSections.find((entry) => entry.section.id === "projects");
		expect(projectsDiff).toBeDefined();
		expect(
			projectsDiff!.rows.map((row) => [row.id, row.status, row.beforeIndex, row.afterIndex]),
		).toEqual([
			[second!.id, "reordered", 2, 1],
			[first!.id, "reordered", 1, 2],
		]);
		expect(projectsDiff!.counts.edited).toBe(0);
		expect(projectsDiff!.counts.reordered).toBe(2);
	});

	it("detects added, removed, edited fields, prose, and tags diffs", () => {
		const draft = structuredClone(INITIAL_PORTFOLIO_CONTENT);
		draft.hero.title = "Updated hero headline";
		draft.projects[0]!.tags = [...draft.projects[0]!.tags.slice(1), "Cloudflare D1"];
		draft.projects[0]!.description = `${draft.projects[0]!.description} Now with release history.`;
		const removedId = draft.projects[draft.projects.length - 1]!.id;
		draft.projects.pop();
		draft.projects.push({
			...structuredClone(INITIAL_PORTFOLIO_CONTENT.projects[0]!),
			id: "new-lab",
			slug: "new-lab",
			title: "New Lab",
		});

		const diff = diffPortfolioDocuments(INITIAL_PORTFOLIO_CONTENT, draft);
		const hero = diff.changedSections.find((entry) => entry.section.id === "hero");
		expect(hero?.fields[0]).toMatchObject({ path: "hero.title", kind: "short" });

		const projects = diff.changedSections.find((entry) => entry.section.id === "projects")!;
		expect(projects.counts).toMatchObject({ added: 1, edited: 1, removed: 1 });
		const editedRow = projects.rows.find((row) => row.status === "edited")!;
		expect(editedRow.fields.find((field) => field.path === "projects[0].tags")?.kind).toBe("tags");
		expect(editedRow.fields.find((field) => field.path === "projects[0].description")?.kind).toBe(
			"prose",
		);
		expect(projects.rows.find((row) => row.status === "removed")?.id).toBe(removedId);
	});

	it("resolves validation paths to section id and collection item id", () => {
		const target = resolvePathTarget("projects[1].metrics[0].label", INITIAL_PORTFOLIO_CONTENT);
		expect(target).toEqual({
			sectionId: "projects",
			sectionLabel: "Projects",
			itemId: INITIAL_PORTFOLIO_CONTENT.projects[1]!.id,
			fieldLabel: "Label",
		});
	});
});
