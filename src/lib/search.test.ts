import { describe, expect, it } from "vitest";
import { linksSearchSchema } from "./search";

describe("validated route search", () => {
	it("applies a stable route-level default when a value is omitted", () => {
		expect(linksSearchSchema.parse({})).toEqual({ kind: "all" });
	});

	it("falls back when a bookmarked URL contains an unsupported value", () => {
		expect(linksSearchSchema.parse({ kind: "private" })).toEqual({ kind: "all" });
	});
});
