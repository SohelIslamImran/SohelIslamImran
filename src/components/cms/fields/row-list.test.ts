import { afterEach, describe, expect, it, vi } from "vitest";
import { removeItem } from "../draft/paths";
import { pendingRowRemoval, reorderOffset, restoreRow } from "./row-list";

describe("repeater removal", () => {
	const live = [{ label: "See my work" }, { label: "Email me" }];
	const remaining = removeItem(live, 0);
	const removal = { row: live[0]!, index: 0, label: "See my work", remaining };

	it("can undo a removal while its list is current", () => {
		const pending = pendingRowRemoval(remaining, removal);
		expect(pending && restoreRow(remaining, pending)).toEqual(live);
	});

	it("discards undo after a revert or another backing list replacement", () => {
		expect(pendingRowRemoval(structuredClone(live), removal)).toBeNull();
		expect(pendingRowRemoval(structuredClone(remaining), removal)).toBeNull();
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
