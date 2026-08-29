import { createFileRoute } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { articleJsonLd, pageHead } from "../lib/seo";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { PrismImage } from "../components";
export const Route = createFileRoute("/story")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		return pageHead(
			c,
			`${c.identity.name} — ${c.story.title}`,
			c.story.intro,
			"/story",
			"/images/social-story.png",
			[articleJsonLd(c, c.story.title, c.story.intro, "/story", c.writing[0]?.publishedAt)],
		);
	},
	component: Story,
});
function Story() {
	const c = Route.useLoaderData();
	return (
		<main className="prism-page article">
			<header className="page-intro">
				<p className="eyebrow">{c.story.eyebrow}</p>
				<h1>{c.story.title}</h1>
				<p className="lede">{c.story.intro}</p>
			</header>
			<PrismImage
				src="/images/sohel-linkedin-800.webp"
				alt="Sohel Islam Imran at the beginning of his engineering journey"
				width={800}
				height={800}
				loading="eager"
				fetchPriority="high"
				sizes="(max-width: 800px) calc(100vw - 40px), 620px"
				srcSet="/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
				className="article__hero-image"
			/>
			<blockquote>{c.story.quote}</blockquote>
			{c.story.chapters.map((chapter) => (
				<section key={chapter.id}>
					<p className="eyebrow">{chapter.eyebrow}</p>
					<h2>{chapter.title}</h2>
					{chapter.paragraphs.map((p) => (
						<p key={p}>{p}</p>
					))}
				</section>
			))}
		</main>
	);
}
