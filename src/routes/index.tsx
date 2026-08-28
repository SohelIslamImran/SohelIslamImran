import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/home/home-page";
import { site } from "@/data/folio";
import { getStudioDocument, STUDIO_STALE_MS } from "@/lib/cms";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: site.title },
      { name: "description", content: site.description },
    ],
  }),
  loader: () => getStudioDocument(),
  staleTime: STUDIO_STALE_MS,
  component: Home,
});


function Home() {
  const data = Route.useLoaderData();
  return (
    <HomePage
      intro={data.payload.intro}
      lede={data.payload.lede}
      quote={data.payload.quote}
    />
  );
}
