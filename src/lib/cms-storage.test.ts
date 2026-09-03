import { describe, expect, it } from "vitest";
import { INITIAL_PORTFOLIO_CONTENT } from "../content/initial";
import { parseStoredOrBootstrap } from "../server/cms-storage.server";

describe("legacy CMS bootstrap content", () => {
	it("hydrates the original blank revision with the public-safe initial content", () => {
		const legacy = JSON.stringify({ hero: { title: "" } });
		expect(parseStoredOrBootstrap(legacy, 1)).toEqual(INITIAL_PORTFOLIO_CONTENT);
	});

	it("does not forgive blank content after the original bootstrap revision", () => {
		const legacy = JSON.stringify({ hero: { title: "" } });
		expect(() => parseStoredOrBootstrap(legacy, 2)).toThrow();
	});
});
