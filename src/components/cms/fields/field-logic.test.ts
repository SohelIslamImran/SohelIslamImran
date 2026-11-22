import { describe, expect, it } from "vitest";
import { removeItem } from "../draft/paths";
import { tagBackspace, toSingleLine } from "./field-logic";
import {
	createRemoval,
	neverSame,
	removalRules,
	restoreRemoval,
	sameRow,
	sameTag,
	sameValue,
} from "./row-list";

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
	const paragraphs = removalRules<string>({ max: 20, same: neverSame, match: sameRow });
	const tags = removalRules<string>({ max: 100, same: sameTag, match: sameTag });
	const photos = removalRules<string>({ max: 30, same: sameValue, match: sameValue });

	it("restores a removed paragraph at its index, even when another equals it", () => {
		const rows = ["Intro", "Intro", "Close"];
		const removal = createRemoval(rows, 1, "paragraph 2", [], paragraphs.match, 0);
		expect(restoreRemoval(removeItem(rows, 1), removal, paragraphs)?.rows).toEqual(rows);
	});

	it("refuses to restore a tag that was added again in another case", () => {
		const removal = createRemoval(["React", "TypeScript"], 0, "React", [], tags.match, 0);
		expect(restoreRemoval(["TypeScript"], removal, tags)?.rows).toEqual(["React", "TypeScript"]);
		expect(restoreRemoval(["react", "TypeScript"], removal, tags)).toBeNull();
	});

	it("refuses to restore a photo that is attached again or into a full list", () => {
		const removal = createRemoval(["asset-b", "asset-a"], 1, "Photo 2", [], photos.match, 0);
		expect(restoreRemoval(["asset-b"], removal, photos)?.rows).toEqual(["asset-b", "asset-a"]);
		expect(restoreRemoval(["asset-a"], removal, photos)).toBeNull();
		expect(restoreRemoval(["asset-b"], removal, { ...photos, max: 1 })).toBeNull();
	});

	it("keeps an edit made after the removal", () => {
		const removal = createRemoval(["Intro", "Close"], 0, "paragraph 1", [], paragraphs.match, 0);
		expect(restoreRemoval(["Close", "Added later"], removal, paragraphs)?.rows).toEqual([
			"Intro",
			"Close",
			"Added later",
		]);
	});
});
