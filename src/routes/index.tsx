import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/home/home-page";
import { getStudioDocument } from "@/lib/cms";

export const Route = createFileRoute("/")({
  loader: () => getStudioDocument(),
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
