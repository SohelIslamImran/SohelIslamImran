import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { NotFound } from "@/components/site/not-found";
import { nav } from "@/data/folio";
import { routeTree } from "./routeTree.gen";

function navIndex(path: string) {
  const exact = nav.findIndex((item) => item.to === path);
  if (exact >= 0) return exact;
  const nested = nav.findIndex((item) => item.to !== "/" && path.startsWith(`${item.to}/`));
  return nested >= 0 ? nested : path === "/" ? 0 : nav.length;
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 30_000,
    defaultPendingMs: 0,
    defaultStaleTime: 60_000,
    defaultViewTransition: {
      types: ({ fromLocation, toLocation, pathChanged }) => {
        if (!pathChanged) return false;
        const from = fromLocation?.pathname ?? "/";
        const to = toLocation.pathname;
        const forward = navIndex(to) >= navIndex(from);
        return forward ? ["folio-page", "folio-fwd"] : ["folio-page", "folio-back"];
      },
    },
  });
}
