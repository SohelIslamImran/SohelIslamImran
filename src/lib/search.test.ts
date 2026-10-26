import { describe, expect, it } from "vitest";
import { linksSearchSchema, workSearchSchema } from "./search";

describe("validated route search", () => {
	it("applies a stable route-level default when a value is omitted", () => {
		expect(workSearchSchema.parse({})).toEqual({ group: "all" });
		expect(linksSearchSchema.parse({})).toEqual({ kind: "all" });
	});

	it("keeps a supported value from a bookmarked URL", () => {
		expect(workSearchSchema.parse({ group: "open-source" })).toEqual({ group: "open-source" });
	});

	it("falls back when a bookmarked URL contains an unsupported value", () => {
		expect(workSearchSchema.parse({ group: "identity" })).toEqual({ group: "all" });
		expect(linksSearchSchema.parse({ kind: "private" })).toEqual({ kind: "all" });
	});
});
