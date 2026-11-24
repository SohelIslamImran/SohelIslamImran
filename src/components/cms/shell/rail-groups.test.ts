import { describe, expect, it } from "vitest";
import { initialOpenGroups } from "./rail-groups";

describe("initial rail disclosures", () => {
	it.each([
		["/cms", []],
		["/cms/release", []],
		["/cms/content/projects", ["work"]],
		["/content/travel", ["writing"]],
		["/cms/content/hero/", ["identity"]],
		["/cms/content/links", []],
		["/cms/content/unknown", []],
	] as const)("%s opens only its foldable group", (pathname, expected) => {
		expect([...initialOpenGroups(pathname)]).toEqual(expected);
	});
});
