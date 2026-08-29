import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { getPublishedContent } from "../server/content";
import { articleJsonLd, pageHead } from "../lib/seo";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { PortfolioImage } from "../components";
import { mediaHref } from "../lib/media";
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
		<main className="page article mx-auto min-h-[calc(100svh-150px)] w-[min(800px,calc(100%-40px))] py-[clamp(58px,9vw,120px)]">
			<header className="page-intro mb-16 max-w-[960px] max-[800px]:mb-12">
				<p className="eyebrow">{c.story.eyebrow}</p>
				<h1 className="page-title mb-[22px] mt-0 max-w-[960px] text-[clamp(3rem,5vw,4.8rem)] font-[760] leading-[.98] tracking-[-.06em] [text-wrap:balance]">
					{c.story.title}
				</h1>
				<p className="lede m-0 max-w-[650px] text-[clamp(17px,2vw,21px)] leading-[1.55] text-muted">
					{c.story.intro}
				</p>
			</header>
			<motion.div
				whileHover={reducedMotion ? undefined : { y: -3, rotate: 0.25 }}
				whileTap={reducedMotion ? undefined : { scale: 0.995 }}
				transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
			>
				<PortfolioImage
					src={mediaHref(c.identity.avatar) ?? "/images/sohel-linkedin-800.webp"}
					alt={
						c.identity.avatar?.alt ??
						"Sohel Islam Imran at the beginning of his engineering journey"
					}
					width={800}
					height={800}
					loading="eager"
					fetchPriority="high"
					sizes="(max-width: 800px) calc(100vw - 40px), 620px"
					srcSet={
						c.identity.avatar
							? undefined
							: "/images/sohel-linkedin-400.webp 400w, /images/sohel-linkedin-800.webp 800w"
					}
					className="article-image mb-[34px] block max-h-[360px] w-[min(100%,520px)] rounded-[24px] object-cover shadow-[0_24px_60px_#284b8915]"
				/>
			</motion.div>
			<motion.blockquote
				className="article-quote mb-[70px] rounded-[22px] border border-line bg-[color-mix(in_srgb,var(--theme-surface-solid)_96%,var(--theme-paper))] p-[30px] text-[clamp(24px,4vw,42px)] font-bold leading-[1.05] tracking-[-.05em]"
				whileHover={reducedMotion ? undefined : { y: -3 }}
				transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
			>
				{c.story.quote}
			</motion.blockquote>
			{c.story.chapters.map((chapter) => (
				<motion.section
					key={chapter.id}
					className="article-section border-t border-line py-9"
					whileHover={reducedMotion ? undefined : { x: 2 }}
					transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
				>
					<p className="eyebrow">{chapter.eyebrow}</p>
					<h2 className="article-section-title mb-3.5 mt-0 text-[clamp(28px,4vw,45px)] font-[760] tracking-[-.055em]">
						{chapter.title}
					</h2>
					{chapter.paragraphs.map((p) => (
						<p className="article-copy text-muted leading-[1.6]" key={p}>
							{p}
						</p>
					))}
				</motion.section>
			))}
		</main>
	);
}
