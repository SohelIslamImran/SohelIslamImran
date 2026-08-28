import { createFileRoute } from "@tanstack/react-router";
import { WorkPage } from "@/components/work/work-page";

export const Route = createFileRoute("/work")({
  head: () => ({
    meta: [
      { title: "Work — Sohel Islam Imran" },
      { name: "description", content: "Kuno product systems, earlier roles, and open-source tools." },
    ],
  }),
  staleTime: 60_000,
  component: WorkPage,
});