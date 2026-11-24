import { afterEach, describe, expect, it, vi } from "vitest";
import { removeItem, setAt } from "../draft/paths";
import {
	createRemoval,
	keyRows,
	moveAnnouncement,
	removalRules,
	reorderOffset,
	replacedDraft,
	restoreAll,
	restoreRemoval,
	sameRowKey,
	sameTag,
	type PendingRemoval,
} from "./row-list";

describe("successive removals", () => {
	const tagRules = removalRules<string>({ same: sameTag, match: sameTag });
	const tags = ["React", "TypeScript", "Vite", "Bun", "D1"];

	/** Remove `labels` one at a time, as the chips' Remove buttons do. */
	function removeAll(rows: readonly string[], labels: string[]) {
		let current = rows.slice();
		const pending: PendingRemoval<string>[] = [];
		for (const label of labels) {
			const index = current.indexOf(label);
			pending.push(createRemoval(current, index, label, pending, tagRules.match, pending.length));
			current = removeItem(current, index);
		}
		return { current, pending };
	}

	function undo(rows: readonly string[], removal: PendingRemoval<string>) {
		const restored = restoreRemoval(rows, removal, tagRules);
		expect(restored).not.toBeNull();
		return restored!.rows;
	}

	it.each([
		[
			["TypeScript", "Vite"],
			[0, 1],
		],
		[
			["TypeScript", "Vite"],
			[1, 0],
		],
		[
			["Vite", "TypeScript"],
			[0, 1],
		],
		[
			["Vite", "TypeScript"],
			[1, 0],
		],
		[
			["React", "D1"],
			[1, 0],
		],
	])("removes %j and undoes each one on its own in order %j", (labels, order) => {
		const { current, pending } = removeAll(tags, labels);
		const first = undo(current, pending[order[0]!]!);
		expect(first).toEqual(tags.filter((tag) => tag !== labels[order[1]!]));
		expect(undo(first, pending[order[1]!]!)).toEqual(tags);
	});

	it("keeps an unrelated edit made after the removals", () => {
		const { current, pending } = removeAll(tags, ["TypeScript", "Vite"]);
		const edited = [...current.map((tag) => (tag === "Bun" ? "Bun 1.3" : tag)), "Workers"];
		const once = undo(edited, pending[0]!);
		expect(once).toEqual(["React", "TypeScript", "Bun 1.3", "D1", "Workers"]);
		expect(undo(once, pending[1]!)).toEqual([
			"React",
			"TypeScript",
			"Vite",
			"Bun 1.3",
			"D1",
			"Workers",
		]);
	});

	it("keeps an edit to an object row and puts the removed row back beside it", () => {
		const rules = removalRules<{ id: string; label: string }>();
		const rows = ["a", "b", "c", "d"].map((id) => ({ id, label: id }));
		const first = createRemoval(rows, 1, "b", [], rules.match, 0);
		const second = createRemoval(removeItem(rows, 1), 1, "c", [first], rules.match, 1);
		const edited = setAt(removeItem(removeItem(rows, 1), 1), "[0].label", "A, edited");
		const restored = restoreAll(edited, [first, second], rules);
		expect(restored?.map((row) => row.id)).toEqual(["a", "b", "c", "d"]);
		expect(restored?.[0]?.label).toBe("A, edited");
	});

	it("restores between the original rows when an earlier duplicate is removed too", () => {
		const rules = removalRules({ same: sameRowKey<string>, match: sameRowKey<string> });
		const rows = keyRows(["Repeated", "Between", "Repeated", "Last"], [0, 1, 2, 3]);
		const between = createRemoval(rows, 1, "Between", [], rules.match, 1);
		const withoutBetween = removeItem(rows, 1);
		const repeated = createRemoval(withoutBetween, 0, "Repeated", [between], rules.match, 0);
		const once = restoreRemoval(removeItem(withoutBetween, 0), between, rules)!.rows;
		expect(once.map((row) => row.key)).toEqual([1, 2, 3]);
		expect(restoreRemoval(once, repeated, rules)?.rows).toEqual(rows);
	});

	it("uses both neighbours' keys after their text has changed", () => {
		const rules = removalRules({ same: sameRowKey<string>, match: sameRowKey<string> });
		const rows = keyRows(["First", "Between", "Last"], [0, 1, 2]);
		const removal = createRemoval(rows, 1, "Between", [], rules.match, 1);
		const edited = keyRows(["Edited first", "Edited last"], [0, 2]);
		expect(restoreRemoval(edited, removal, rules)?.rows.map((row) => row.value)).toEqual([
			"Edited first",
			"Between",
			"Edited last",
		]);
	});

	it("appends when every old neighbour is gone, and refuses a full list", () => {
		const removal = createRemoval(["Vite", "Bun"], 0, "Vite", [], tagRules.match, 0);
		expect(undo(["Deno"], removal)).toEqual(["Deno", "Vite"]);
		expect(restoreRemoval(["Deno"], removal, { ...tagRules, max: 1 })).toBeNull();
	});

	it("treats a draft that arrives already saved as a replacement, not an edit", () => {
		const saved = { list: ["a"] };
		const edited = { list: [] };
		const restored = { list: ["a"] };
		expect(replacedDraft({ draft: saved }, { draft: edited, saved })).toBe(false);
		expect(replacedDraft({ draft: edited }, { draft: edited, saved: edited })).toBe(false);
		expect(replacedDraft({ draft: edited }, { draft: restored, saved: restored })).toBe(true);
	});
});

describe("keyboard reorder", () => {
	class TestElement {
		constructor(
			readonly selector: string,
			readonly parent?: TestElement,
		) {}

		closest(selectors: string): TestElement | null {
			if (selectors.split(", ").includes(this.selector)) return this;
			return this.parent?.closest(selectors) ?? null;
		}
	}

	const row = new TestElement(".cms-sortable-row");
	const summary = new TestElement("[data-row-reorder]", row);

	function offset(
		target: TestElement,
		options: Partial<Pick<KeyboardEvent, "altKey" | "defaultPrevented" | "key">> = {},
	) {
		vi.stubGlobal("Element", TestElement);
		return reorderOffset({
			target: target as unknown as Element,
			currentTarget: row as unknown as Element,
			altKey: true,
			defaultPrevented: false,
			key: "ArrowDown",
			...options,
		});
	}

	afterEach(() => vi.unstubAllGlobals());

	it("handles Alt and arrow only on this row's reorder controls", () => {
		const handle = new TestElement("[data-row-handle]", row);
		const nestedRow = new TestElement(".cms-sortable-row", row);
		expect(offset(new TestElement("span", summary))).toBe(1);
		expect(offset(handle, { key: "ArrowUp" })).toBe(-1);
		expect(offset(handle, { altKey: false })).toBeUndefined();
		expect(offset(handle, { defaultPrevented: true })).toBeUndefined();
		expect(offset(new TestElement("button", row))).toBeUndefined();
		expect(offset(new TestElement("[data-row-handle]", nestedRow))).toBeUndefined();
	});

	it.each(["input", "textarea", "select", "[contenteditable]"])(
		"leaves Alt and arrow available for %s",
		(selector) => {
			expect(offset(new TestElement("span", new TestElement(selector, summary)))).toBeUndefined();
		},
	);
});

describe("moveAnnouncement", () => {
	it("announces the new 1-based position when order changes", () => {
		expect(moveAnnouncement("Kuno", 0, 1, 8)).toBe("Moved Kuno to position 2 of 8.");
		expect(moveAnnouncement("Kuno", 4, 0, 8)).toBe("Moved Kuno to position 1 of 8.");
		expect(moveAnnouncement("   ", 0, 2, 5)).toBe("Moved Item 3 to position 3 of 5.");
	});

	it("returns null when the row did not move or indexes are out of range", () => {
		expect(moveAnnouncement("Kuno", 2, 2, 8)).toBeNull();
		expect(moveAnnouncement("Kuno", 0, -1, 8)).toBeNull();
		expect(moveAnnouncement("Kuno", 7, 8, 8)).toBeNull();
		expect(moveAnnouncement("Kuno", 0, 1, 0)).toBeNull();
	});
});
