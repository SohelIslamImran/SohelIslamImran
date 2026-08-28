import { describe, expect, it } from "vitest";
import { linksSearchSchema, workSearchSchema } from "./search";

describe("validated route search", () => {
	it("accepts an omitted value for the route-level default", () => {
		expect(workSearchSchema.parse({})).toEqual({});
		expect(linksSearchSchema.parse({})).toEqual({});
	});

	it("rejects unsupported focus and link categories", () => {
		expect(workSearchSchema.safeParse({ focus: "random" }).success).toBe(false);
		expect(linksSearchSchema.safeParse({ kind: "private" }).success).toBe(false);
	});
});
