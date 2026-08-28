import { chapters, profile } from "@/data/folio";
import { PageEnter } from "@/components/site/page-enter";
import { FocusStack } from "./focus-stack";

export function StoryPage({ quote = profile.quote }: { quote?: string }) {
  return (
    <PageEnter>
      <main className="page pt-28 pb-16 md:pt-36">
        <p className="kicker">Focus stack · five planes</p>
        <h1 className="mt-4 max-w-3xl text-5xl md:text-6xl">From first principles.</h1>
        <blockquote className="glass mt-6 max-w-2xl rounded-[28px] p-5 font-display text-2xl md:text-3xl">
          {quote}
        </blockquote>
        <FocusStack chapters={chapters} />
      </main>
    </PageEnter>
  );
}
