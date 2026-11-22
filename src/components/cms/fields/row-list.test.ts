import { afterEach, describe, expect, it, vi } from "vitest";
import { removeItem, setAt } from "../draft/paths";
import {
	createRemoval,
	removalRules,
	reorderOffset,
	replacedDraft,
	restoreAll,
	restoreRemoval,
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
