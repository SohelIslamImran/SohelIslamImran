import { createFileRoute } from "@tanstack/react-router";
import { NotesPage } from "@/components/notes/notes-page";
import { getStudioDocument, STUDIO_STALE_MS } from "@/lib/cms";

export const Route = createFileRoute("/field-notes")({
  head: () => ({
    meta: [
      { title: "Field notes — Sohel Islam Imran" },
      { name: "description", content: "A camera-lucida journal of origin, observation, and journeys still ahead." },
    ],
  }),
  loader: () => getStudioDocument(),
  staleTime: STUDIO_STALE_MS,
  component: function Notes() {
    const data = Route.useLoaderData();
    return <NotesPage notes={data.payload.notes} />;
  },
});