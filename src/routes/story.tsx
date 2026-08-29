import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
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
	const reducedMotion = useReducedMotion();
	return (
		<main className="prism-page article">
			<header className="page-intro">
				<p className="eyebrow">{c.story.eyebrow}</p>
				<h1>{c.story.title}</h1>
				<p className="lede">{c.story.intro}</p>
			</header>
			<motion.div
				whileHover={reducedMotion ? undefined : { y: -3, rotate: 0.25 }}
				whileTap={reducedMotion ? undefined : { scale: 0.995 }}
				transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
			>
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
			</motion.div>
			<motion.blockquote
				whileHover={reducedMotion ? undefined : { y: -3 }}
				transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
			>
				{c.story.quote}
			</motion.blockquote>
			{c.story.chapters.map((chapter) => (
				<motion.section
					key={chapter.id}
					whileHover={reducedMotion ? undefined : { x: 2 }}
					transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
				>
					<p className="eyebrow">{chapter.eyebrow}</p>
					<h2>{chapter.title}</h2>
					{chapter.paragraphs.map((p) => (
						<p key={p}>{p}</p>
					))}
				</motion.section>
			))}
		</main>
	);
}
