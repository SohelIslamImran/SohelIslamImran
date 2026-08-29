import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { NotFound } from "@/components/site/not-found";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 30_000,
    // Keep the previous page on screen while the next lazy route loads.
    // `0` flashed an empty main and felt like the site had frozen.
    defaultPendingMs: 1200,
    defaultStaleTime: 60_000,
    defaultViewTransition: false,
  });
}
