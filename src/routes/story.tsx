import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { getPublicDocument, STUDIO_STALE_MS } from "@/lib/cms";

export const Route = createFileRoute("/story")({
  head: () => ({
    meta: [
      { title: "From first principles — Sohel Islam Imran" },
      { name: "description", content: "From learning on a phone in Bangladesh to leading full-stack engineering." },
    ],
  }),
  loader: () => getPublicDocument(),
  staleTime: STUDIO_STALE_MS,
  component: lazyRouteComponent(() => import("@/components/story/story-page"), "StoryPage"),
});
