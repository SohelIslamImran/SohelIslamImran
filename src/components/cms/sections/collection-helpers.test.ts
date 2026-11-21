import { describe, expect, it } from "vitest";
import { duplicateRow, newRowId, restoreRow } from "../fields/row-list";
import { duplicateProject, itemForIssue, slugIssue, uniqueProjectSlug } from "./collection-helpers";

describe("collection editor helpers", () => {
	it("creates stable URL-safe IDs for new and duplicated rows", () => {
		const first = newRowId();
		const original = { id: first, label: "Item", tools: ["React"] };
		const duplicate = duplicateRow(original);
		expect(first).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
		expect(first.length).toBeLessThanOrEqual(80);
		expect(duplicate.id).not.toBe(first);
		expect(duplicate.tools).toEqual(original.tools);
		expect(duplicate.tools).not.toBe(original.tools);
		expect(duplicateRow({ label: "No ID" })).toEqual({ label: "No ID" });
	});

	it("generates bounded, unique slugs from titles", () => {
		expect(uniqueProjectSlug("  Café, C++  ", ["cafe-c", "CAFE-C-2"])).toBe("cafe-c-3");
		expect(uniqueProjectSlug("東京", ["project"])).toBe("project-2");
		const long = "x".repeat(170);
		const slug = uniqueProjectSlug(long, [long.slice(0, 160)]);
		expect(slug).toHaveLength(160);
		expect(slug.endsWith("-2")).toBe(true);
	});

	it("duplicates projects with fresh IDs and independent slugs", () => {
		const project = { id: "one", title: "Demo", slug: "demo" };
		const rows = [project, { id: "two", title: "Demo (copy)", slug: "demo-copy" }];
		const copy = duplicateProject(project, rows);
		expect(copy).toMatchObject({ title: "Demo (copy)", slug: "demo-copy-2" });
		expect(rows.some((row) => row.id === copy.id)).toBe(false);
		expect(slugIssue("demo", rows, project.id)).toBeUndefined();
		expect(slugIssue("DEMO", rows, copy.id)).toMatch(/already uses/);
		expect(slugIssue("demo//two", rows, copy.id)).toMatch(/single hyphens/);
	});

	it("undoes a removal at its original index and preserves other edits", () => {
		const removed = { row: { id: "b", value: "removed" }, index: 1, label: "B" };
		const edited = { id: "a", value: "edited after removal" };
		const newer = { id: "c", value: "new" };
		expect(restoreRow([edited, newer], removed)).toEqual([edited, removed.row, newer]);
		expect(restoreRow([], removed)).toEqual([removed.row]);
		expect(restoreRow([edited], removed, 1)).toBeNull();
		expect(restoreRow([removed.row], removed)).toBeNull();
		expect(restoreRow(["edited"], { row: "removed", index: 0, label: "Row" })).toEqual([
			"removed",
			"edited",
		]);
	});

	it("routes errors by current item ID even after the rows are reordered", () => {
		const draft = {
			projects: [{ id: "moved-to-first" }, { id: "moved-to-second" }],
			travel: { entries: [{ id: "trip" }] },
			social: [{ platform: "Github" }],
		};
		expect(itemForIssue(draft, "projects", "projects[1].metrics[0].label")).toBe("moved-to-second");
		expect(itemForIssue(draft, "projects", "projects[0]")).toBe("moved-to-first");
		expect(itemForIssue(draft, "projects", "projects[8].slug")).toBeUndefined();
		expect(itemForIssue(draft, "projects", "projects")).toBeUndefined();
		expect(itemForIssue(draft, "travel.entries", "travel.entries[0].latitude")).toBe("trip");
		expect(itemForIssue(draft, "travel.entries", "travel.title")).toBeUndefined();
		expect(itemForIssue(draft, "profileLinks", "social[0].href")).toBeUndefined();
	});
});
