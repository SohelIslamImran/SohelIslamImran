import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { getPublicDocument, STUDIO_STALE_MS } from "@/lib/cms";

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { title: "Links — Sohel Islam Imran" },
      {
        name: "description",
        content: "GitHub, LinkedIn, X, Instagram, and a short trail of the public internet.",
      },
    ],
  }),
  loader: () => getPublicDocument(),
  staleTime: STUDIO_STALE_MS,
  component: lazyRouteComponent(() => import("@/components/links/links-page"), "LinksPage"),
});
