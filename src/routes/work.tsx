import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/work")({
  head: () => ({
    meta: [
      { title: "Work — Sohel Islam Imran" },
      { name: "description", content: "Kuno product systems, earlier roles, and open-source tools." },
    ],
  }),
  staleTime: 60_000,
  component: lazyRouteComponent(() => import("@/components/work/work-page"), "WorkPage"),
});
