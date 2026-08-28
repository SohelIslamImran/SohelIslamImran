import { createFileRoute } from "@tanstack/react-router";
import { LinksPage } from "@/components/links/links-page";
import { getStudioDocument, STUDIO_STALE_MS } from "@/lib/cms";

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { title: "Links — Sohel Islam Imran" },
      { name: "description", content: "GitHub, LinkedIn, X, Instagram, and a short trail of the public internet." },
    ],
  }),
  loader: () => getStudioDocument(),
  staleTime: STUDIO_STALE_MS,
  component: function Links() {
    const data = Route.useLoaderData();
    return <LinksPage links={data.payload.links} />;
  },
});