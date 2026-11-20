import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../../content/initial";
import { plateSag, supportsFor } from "./supports";

describe("supportsFor", () => {
	it("gives every published capability a plain label and consequence", () => {
		const supports = supportsFor(INITIAL_PORTFOLIO_CONTENT.capabilities);
		expect(supports.map((support) => support.label)).toEqual([
			"Save",
			"Saved data",
			"Permissions",
			"Phone app",
			"Release",
		]);
		for (const support of supports) expect(support.without).toMatch(/\.$/u);
	});

	it("keeps CMS-added and duplicate capabilities working, and drops empty ones", () => {
		const supports = supportsFor([
			{ id: "data", title: " Data ", description: "", tools: [" SQL ", ""] },
			{ id: "data", title: "Again", description: "", tools: [] },
			{ id: "observability", title: "Logs, metrics, and traces", description: "x", tools: [] },
			{ id: "blank", title: " ", description: " ", tools: [] },
		]);
		expect(supports.map((support) => support.id)).toEqual(["data", "data-2", "observability"]);
		expect(supports[0]?.capability.tools).toEqual(["SQL"]);
		expect(supports[2]?.label).toBe("Logs");
		expect(supports[2]?.without).toBe("Something your users rely on stops working.");
	});
});

describe("plateSag", () => {
	it("stays level with every support in place", () => {
		expect(plateSag(-1, 5)).toEqual({ tilt: 0, drop: 0 });
	});

	it("tilts toward the gap and sags most in the middle", () => {
		expect(plateSag(0, 5).tilt).toBeLessThan(0);
		expect(plateSag(4, 5).tilt).toBeGreaterThan(0);
		expect(plateSag(2, 5).tilt).toBe(0);
		expect(plateSag(2, 5).drop).toBeGreaterThan(plateSag(0, 5).drop);
	});
});
