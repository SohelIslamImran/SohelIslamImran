import { describe, expect, it } from "vitest";
import { resolveCommittedRouteKey } from "./route-focus";

const match = (id: string) => ({ id });

describe("resolveCommittedRouteKey", () => {
	it("returns the deepest committed match id, not the location pathname", () => {
		// Keying on pathname remounts the outlet before async loaders resolve, so
		// the focus effect would run against the outgoing page.
		expect(resolveCommittedRouteKey([match("__root__/"), match("/work/")], "/story")).toBe(
			"/work/",
		);
	});

	it("tracks the leaf so a route change produces a new key", () => {
		const before = resolveCommittedRouteKey([match("__root__/"), match("/work/")], "/work");
		const after = resolveCommittedRouteKey([match("__root__/"), match("/resume/")], "/resume");
		expect(after).not.toBe(before);
	});

	it("falls back to the pathname when nothing is committed", () => {
		expect(resolveCommittedRouteKey([], "/links")).toBe("/links");
	});

	it("is stable across re-renders that do not change the route", () => {
		const matches = [match("__root__/"), match("/work/")];
		const first = resolveCommittedRouteKey(matches, "/work");
		const second = resolveCommittedRouteKey(matches, "/work");
		expect(second).toBe(first);
	});

	it("keeps the same key when only search params change", () => {
		// Same route, different filter. The match id is unchanged, which is what
		// keeps the work filter from stealing focus on selection.
		const matches = [match("__root__/"), match("/work/")];
		expect(resolveCommittedRouteKey(matches, "/work?group=product")).toBe(
			resolveCommittedRouteKey(matches, "/work?group=all"),
		);
	});
});
