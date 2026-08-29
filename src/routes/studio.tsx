import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Sohel Islam Imran" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: lazyRouteComponent(() => import("@/components/studio/studio-page"), "StudioPage"),
});
