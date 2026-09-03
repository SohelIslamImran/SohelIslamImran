import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultViewTransition: true,
	});
}

export type AppRouter = ReturnType<typeof getRouter>;

declare module "@tanstack/react-router" {
	interface Register {
		router: AppRouter;
	}
}
