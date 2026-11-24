import { describe, expect, it } from "vitest";
import { MAX_CONTENT_BYTES } from "../../../lib/validation";
import {
	checkImportFile,
	compactByteLength,
	exportFileName,
	MAX_IMPORT_FILE_BYTES,
} from "./raw-json";

describe("Raw JSON file and size helpers", () => {
	it("counts compact UTF-8 bytes rather than JS characters or pretty bytes", () => {
		expect(compactByteLength({ value: "🐱" })).toBe(16);
	});

	it("leaves room for pretty printing a near-limit export", () => {
		const document = { value: "x".repeat(MAX_CONTENT_BYTES - 12) };
		const exported = JSON.stringify(document, null, 2) + "\n";
		expect(compactByteLength(document)).toBe(MAX_CONTENT_BYTES);
		expect(exported.length).toBeGreaterThan(MAX_CONTENT_BYTES);
		expect(checkImportFile(exported.length)).toBeNull();
		expect(checkImportFile(MAX_IMPORT_FILE_BYTES)).toBeNull();
		expect(checkImportFile(MAX_IMPORT_FILE_BYTES + 1)).toMatch(/import limit/u);
	});

	it("labels unsaved exports", () => {
		expect(exportFileName(12, false)).toBe("portfolio-draft-r12.json");
		expect(exportFileName(12, true)).toBe("portfolio-draft-r12-unsaved.json");
	});
});
