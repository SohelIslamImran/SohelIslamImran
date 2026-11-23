import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { articleJsonLd, pageHead } from "../lib/seo";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { EmptyState, PageShell } from "../components/ui/portfolio";
import { chapterItems } from "../components/pages/story/chapters";
import { useStoryProgress } from "../components/pages/story/useStoryProgress";
import { StoryOpening } from "../components/pages/story/StoryOpening";
import { DepthBar, DepthRail } from "../components/pages/story/DepthRail";
import { ChapterPlane } from "../components/pages/story/ChapterPlane";
import { StoryEnding } from "../components/pages/story/StoryEnding";

export const Route = createFileRoute("/story")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		const name = c.identity.name.trim() || "Sohel Islam Imran";
		// The on-page heading ends with a period; titles in tabs and share cards do not.
		const title = (c.story.title.trim() || "Career story").replace(/\.$/u, "");
		const description = c.story.intro.trim() || "A public account of the work behind the work.";
		const writing = c.writing.find((item) => item.href === "/story");
		return pageHead(c, `${name} — ${title}`, description, "/story", "/images/social-story.png", [
			articleJsonLd(c, title, description, "/story", writing?.publishedAt),
		]);
	},
	component: Story,
});

function Story() {
	const content = Route.useLoaderData();
	const chapters = useMemo(() => chapterItems(content.story.chapters), [content.story.chapters]);
	const chapterIds = useMemo(() => chapters.map((chapter) => chapter.domId), [chapters]);
	const [activeId, setActiveId, progress] = useStoryProgress(chapterIds);
	const writing = content.writing.find((item) => item.href === "/story");
	const quote = content.story.quote.trim();

	return (
		<PageShell width="wide" data-page="story">
			<article
				className="min-w-0 [overflow-wrap:anywhere]"
				data-slot="story-article"
				aria-labelledby="story-title"
			>
				<StoryOpening
					identity={content.identity}
					story={content.story}
					writing={writing}
					chapters={chapters}
				/>

				{quote ? (
					<figure className="sd-quote">
						<span aria-hidden="true" className="sd-quote-mark">
							“
						</span>
						<blockquote>
							<p>{quote}</p>
						</blockquote>
						<figcaption className="mono-label">
							{content.identity.name.trim() || "Sohel Islam Imran"} · on learning
						</figcaption>
					</figure>
				) : null}

				{chapters.length > 0 ? (
					<div className="sd-layout">
						<DepthBar
							chapters={chapters}
							progress={progress}
							activeId={activeId}
							onSelect={setActiveId}
						/>
						<div className="sd-rail-col">
							<DepthRail
								chapters={chapters}
								progress={progress}
								activeId={activeId}
								onSelect={setActiveId}
							/>
						</div>
						<div className="sd-chapters">
							{chapters.map((chapter) => (
								<ChapterPlane key={chapter.domId} chapter={chapter} />
							))}
						</div>
					</div>
				) : (
					<EmptyState
						level={2}
						title="This story is being revised."
						description="The next chapter will appear when it is ready to share."
					/>
				)}

				<StoryEnding content={content} />
			</article>
		</PageShell>
	);
}
