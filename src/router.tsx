import { createRouter } from "@tanstack/react-router";
import { cmsHostRewrite } from "./lib/cms-host";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		scrollRestorationBehavior: "instant",
		defaultViewTransition: false,
		// The CMS hostname serves `/cms/*` routes at its root.
		rewrite: cmsHostRewrite,
	});
}

export type AppRouter = ReturnType<typeof getRouter>;

declare module "@tanstack/react-router" {
	interface Register {
		router: AppRouter;
	}
}
