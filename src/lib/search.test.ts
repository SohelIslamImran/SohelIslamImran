import { describe, expect, it } from "vitest";
import { linksSearchSchema, workSearchSchema } from "./search";

describe("validated route search", () => {
	it("applies a stable route-level default when a value is omitted", () => {
		expect(workSearchSchema.parse({})).toEqual({ focus: "identity" });
		expect(linksSearchSchema.parse({})).toEqual({ kind: "all" });
	});

	it("falls back when a bookmarked URL contains an unsupported value", () => {
		expect(workSearchSchema.parse({ focus: "random" })).toEqual({ focus: "identity" });
		expect(linksSearchSchema.parse({ kind: "private" })).toEqual({ kind: "all" });
	});
});
