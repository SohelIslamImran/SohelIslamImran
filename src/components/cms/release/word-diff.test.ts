import { describe, expect, it } from "vitest";
import { diffWords, isWhitespaceChange, whitespaceMarkers } from "./word-diff";

describe("whitespace changes", () => {
	it("identifies spacing-only edits including insertion and removal", () => {
		expect(isWhitespaceChange("two words", "two\t words\n")).toBe(true);
		expect(isWhitespaceChange("two words", "twowords")).toBe(true);
		expect(isWhitespaceChange("two words", "two terms")).toBe(false);
		expect(isWhitespaceChange("two words", "two words")).toBe(false);
	});

	it("marks whitespace in the changed runs and preserves both originals", () => {
		const parts = diffWords("two words", "two \t\r\nwords");
		expect(
			parts.filter(({ kind }) => kind !== "same").map(({ text }) => whitespaceMarkers(text)),
		).toEqual(["·", "·→↵"]);
		expect(
			parts
				.filter(({ kind }) => kind !== "add")
				.map(({ text }) => text)
				.join(""),
		).toBe("two words");
		expect(
			parts
				.filter(({ kind }) => kind !== "del")
				.map(({ text }) => text)
				.join(""),
		).toBe("two \t\r\nwords");
	});
});
