import { describe, expect, it } from "vitest";
import { linksSearchSchema, workSearchSchema } from "./search";

describe("validated route search", () => {
	it("applies a stable route-level default when a value is omitted", () => {
		expect(workSearchSchema.parse({})).toEqual({ focus: "identity" });
		expect(linksSearchSchema.parse({})).toEqual({ kind: "all" });
	});

	it("rejects unsupported focus and link categories", () => {
		expect(workSearchSchema.safeParse({ focus: "random" }).success).toBe(false);
		expect(linksSearchSchema.safeParse({ kind: "private" }).success).toBe(false);
	});
});
