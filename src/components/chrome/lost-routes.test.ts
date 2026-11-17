import { describe, expect, it } from "vitest";
import { suggestDestinations } from "./lost-routes";

const projects = [
	{ slug: "kuno", title: "Kuno" },
	{ slug: "ghosttime", title: "ghosttime" },
];

describe("suggestDestinations", () => {
	it("finds the page a typo meant", () => {
		expect(suggestDestinations("/wrok", projects)[0]).toEqual({ label: "Work", path: "/work" });
		expect(suggestDestinations("/resume/", projects)[0]?.path).toBe("/resume");
	});

	it("prefers projects under /work", () => {
		expect(suggestDestinations("/work/kno", projects)[0]).toEqual({
			label: "Kuno",
			path: "/work/kuno",
		});
	});

	it("falls back to home and work, without duplicates", () => {
		const result = suggestDestinations("/zzzz-qqq", projects);
		expect(result.map((item) => item.path)).toEqual(["/", "/work"]);
		expect(suggestDestinations("/", projects).map((item) => item.path)).not.toContain("/");
	});
});
