import { describe, expect, it } from "vitest";
import { removeItem } from "../draft/paths";
import { tagBackspace, toSingleLine } from "./field-logic";
import { neverSame, pendingRowRemoval, restoreRow, sameTag, sameValue } from "./row-list";

describe("single-line text", () => {
	it("turns typed, pasted, and Windows line breaks into one space", () => {
		expect(toSingleLine("Lead engineer\nat Kuno")).toBe("Lead engineer at Kuno");
		expect(toSingleLine("One  \r\n\r\n  two")).toBe("One two");
		expect(toSingleLine("a\u2028b")).toBe("a b");
	});

	it("leaves single lines and inner spacing alone", () => {
		expect(toSingleLine("Already  one line ")).toBe("Already  one line ");
		expect(toSingleLine("")).toBe("");
	});
});

describe("tag backspace", () => {
	it("selects the last tag first, then removes it", () => {
		const first = tagBackspace("", 3, false);
		expect(first).toEqual({ armed: true, remove: false });
		expect(tagBackspace("", 3, first.armed)).toEqual({ armed: false, remove: true });
	});

	it("does nothing while the input has text or there are no tags", () => {
		expect(tagBackspace("re", 3, true)).toEqual({ armed: false, remove: false });
		expect(tagBackspace("", 0, false)).toEqual({ armed: false, remove: false });
	});
});

describe("undo for string lists, tags, and photos", () => {
	it("restores a removed paragraph at its index, even when another equals it", () => {
		const rows = ["Intro", "Intro", "Close"];
		const remaining = removeItem(rows, 1);
		const removal = { row: "Intro", index: 1, label: "Paragraph 2", remaining };
		const pending = pendingRowRemoval(remaining, removal);
		expect(pending && restoreRow(remaining, pending, 20, neverSame)).toEqual(rows);
	});

	it("refuses to restore a tag that was added again in another case", () => {
		const removed = { row: "React", index: 0, label: "React" };
		expect(restoreRow(["TypeScript"], removed, 100, sameTag)).toEqual(["React", "TypeScript"]);
		expect(restoreRow(["react", "TypeScript"], removed, 100, sameTag)).toBeNull();
	});

	it("refuses to restore a photo that is attached again or into a full list", () => {
		const removed = { row: "asset-a", index: 1, label: "Photo 2" };
		expect(restoreRow(["asset-b"], removed, 30, sameValue)).toEqual(["asset-b", "asset-a"]);
		expect(restoreRow(["asset-a"], removed, 30, sameValue)).toBeNull();
		expect(restoreRow(["asset-b"], removed, 1, sameValue)).toBeNull();
	});

	it("drops the undo once the list changes after the removal", () => {
		const remaining = ["Close"];
		const removal = { row: "Intro", index: 0, label: "Paragraph 1", remaining };
		expect(pendingRowRemoval(["Close", ""], removal)).toBeNull();
	});
});
