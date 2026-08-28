import { createFileRoute } from "@tanstack/react-router";
import { StudioPage } from "@/components/studio/studio-page";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Sohel Islam Imran" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StudioPage,
});
