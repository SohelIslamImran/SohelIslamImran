import { createFileRoute } from "@tanstack/react-router";
import { ResumePage } from "@/components/resume/resume-page";

export const Route = createFileRoute("/resume")({
  head: () => ({
    meta: [
      { title: "Résumé — Sohel Islam Imran" },
      { name: "description", content: "Five years across enterprise B2B products, mobile, open source, and developer tooling." },
    ],
  }),
  staleTime: 60_000,
  component: ResumePage,
});