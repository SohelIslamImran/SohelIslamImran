import { getRouteApi } from "@tanstack/react-router";
import { chapters, profile } from "@/data/folio";
import { FocusStack } from "./focus-stack";

const storyRoute = getRouteApi("/story");

export function StoryPage() {
  const data = storyRoute.useLoaderData();
  const quote = data.payload.quote ?? profile.quote;
  return (
    <main className="page pt-28 pb-16 md:pt-36">
      <p className="kicker">Focus stack · five planes</p>
      <h1 className="mt-4 max-w-3xl text-5xl md:text-6xl">From first principles.</h1>
      <blockquote className="glass glass-spec mt-6 max-w-2xl rounded-[28px] p-6 font-display text-2xl md:text-3xl">
        {quote}
      </blockquote>
      <FocusStack chapters={chapters} />
    </main>
  );
}
