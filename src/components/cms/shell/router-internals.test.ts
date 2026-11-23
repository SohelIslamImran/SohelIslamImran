/**
 * `useRouteViewTransitions` in `src/routes/__root.tsx` replaces the router
 * instance's `startViewTransition` and reads undocumented router members.
 * This fails if a router upgrade renames or stops using them.
 */
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	vi.unstubAllGlobals();
});

function testRouter() {
	// Just enough of a browser for the client load path; no DOM is rendered.
	vi.stubGlobal("window", { origin: "null" });
	const root = createRootRoute();
	const routeTree = root.addChildren([
		createRoute({ getParentRoute: () => root, path: "/a" }),
		createRoute({ getParentRoute: () => root, path: "/b" }),
	]);
	// The client load path (the one that calls startViewTransition) without a DOM.
	return createRouter({
		routeTree,
		isServer: false,
		history: createMemoryHistory({ initialEntries: ["/a"] }),
	});
}

describe("router internals used by the CMS route transition", () => {
	it("commits navigations through a patchable startViewTransition", async () => {
		const router = testRouter();
		await router.load();
		expect(typeof router.startViewTransition).toBe("function");
		expect(router.stores.resolvedLocation.get()?.pathname).toBe("/a");

		let seen: { requested: unknown; from?: string; to: string } | undefined;
		router.startViewTransition = async (update) => {
			seen = {
				requested: router.shouldViewTransition,
				from: router.stores.resolvedLocation.get()?.pathname,
				to: router.latestLocation.pathname,
			};
			router.shouldViewTransition = undefined;
			await update();
		};

		// The app's registered route types do not include this test tree.
		const navigate = router.navigate as (options: {
			to: string;
			viewTransition?: boolean;
		}) => Promise<void>;
		await navigate({ to: "/b", viewTransition: true });
		expect(seen).toEqual({ requested: true, from: "/a", to: "/b" });
		expect(router.stores.resolvedLocation.get()?.pathname).toBe("/b");
	});
});
