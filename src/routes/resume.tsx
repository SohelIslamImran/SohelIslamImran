import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/resume")({
  head: () => ({
    meta: [
      { title: "Résumé — Sohel Islam Imran" },
      {
        name: "description",
        content: "Five years across enterprise B2B products, mobile, open source, and developer tooling.",
      },
    ],
  }),
  staleTime: 60_000,
  component: lazyRouteComponent(() => import("@/components/resume/resume-page"), "ResumePage"),
});
