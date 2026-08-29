import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { PortfolioImage } from "../components";
import { mediaById, mediaHref } from "../lib/media";
export const Route = createFileRoute("/field-notes")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		return pageHead(
			c,
			`${c.identity.name} — Field notes`,
			c.travel.intro,
			"/field-notes",
			"/images/social-field-notes.png",
			[
				{
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name: c.travel.title,
					description: c.travel.intro,
					mainEntity: {
						"@type": "ItemList",
						itemListElement: c.travel.entries
							.filter((entry) => entry.visibility === "public")
							.map((entry, index) => ({
								"@type": "ListItem",
								position: index + 1,
								name: entry.place,
							})),
					},
				},
			],
		);
	},
	component: FieldNotes,
});
function FieldNotes() {
	const c = Route.useLoaderData();
	const reducedMotion = useReducedMotion();
	const publicEntries = c.travel.entries.filter((entry) => entry.visibility === "public");
	const assets = mediaById(c.media);
	return (
		<main className="page mx-auto min-h-[calc(100svh-150px)] w-[min(1080px,calc(100%-40px))] py-[clamp(58px,9vw,120px)]">
			<header className="page-intro mb-16 max-w-[960px] max-[800px]:mb-12">
				<p className="eyebrow">{c.travel.eyebrow}</p>
				<h1 className="page-title mb-[22px] mt-0 max-w-[960px] text-[clamp(3rem,5vw,4.8rem)] font-[760] leading-[.98] tracking-[-.06em] [text-wrap:balance]">
					{c.travel.title}
				</h1>
				<p className="lede m-0 max-w-[650px] text-[clamp(17px,2vw,21px)] leading-[1.55] text-muted">
					{c.travel.intro}
				</p>
			</header>
			<motion.section
				className="travel-feature glass mb-[18px] grid grid-cols-[minmax(220px,.95fr)_minmax(0,1.05fr)] items-center gap-[clamp(22px,5vw,58px)] rounded-[26px] p-3.5 max-[800px]:grid-cols-1 max-[800px]:gap-[18px] max-[800px]:p-2.5"
				aria-labelledby="travel-feature-title"
				whileHover={reducedMotion ? undefined : { y: -3 }}
				whileTap={reducedMotion ? undefined : { scale: 0.997 }}
				transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
			>
				<PortfolioImage
					src="/images/travel-placeholder-1122.webp"
					alt="A placeholder route photograph for Sohel's future travel journal"
					width={1122}
					height={1402}
					sizes="(max-width: 800px) calc(100vw - 60px), 450px"
					srcSet="/images/travel-placeholder-561.webp 561w, /images/travel-placeholder-1122.webp 1122w"
					className="travel-image block h-[260px] w-full rounded-[18px] object-cover max-[800px]:h-[220px]"
				/>
				<div>
					<p className="eyebrow">The next horizon</p>
					<h2
						className="travel-title my-2.5 mb-3.5 max-w-[470px] text-[clamp(28px,4vw,48px)] font-[760] leading-[.98] tracking-[-.06em]"
						id="travel-feature-title"
					>
						A map still being written.
					</h2>
					<p className="travel-copy m-0 max-w-[470px] text-[17px] leading-[1.6] text-muted">
						The first entry is deliberately open. As the route grows, each place will carry a small
						story, a photograph, and what remote work looked like from there.
					</p>
				</div>
			</motion.section>
			<section className="travel-route grid gap-3.5">
				<p>
					<strong>Origin:</strong> {c.travel.origin}
				</p>
				{publicEntries.length ? (
					publicEntries.map((e) => (
						<motion.article
							key={e.id}
							className="travel-card rounded-[22px] border border-line bg-[color-mix(in_srgb,var(--theme-surface-solid)_96%,var(--theme-paper))] p-[26px]"
							whileHover={reducedMotion ? undefined : { y: -2 }}
							whileTap={reducedMotion ? undefined : { scale: 0.997 }}
							transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
						>
							<time className="travel-season text-xs font-extrabold uppercase tracking-[.1em] text-signal">
								{e.season}
							</time>
							<h2 className="travel-card-title mb-2.5 mt-2.5 text-[30px] font-[760] tracking-[-.04em]">
								{e.place}
							</h2>
							{e.mediaIds
								.map((id) => assets.get(id))
								.filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
								.map((asset) => (
									<PortfolioImage
										key={asset.id}
										src={mediaHref(asset)}
										alt={asset.alt}
										width={asset.width ?? 1200}
										height={asset.height ?? 800}
										className="mt-4 max-h-72 w-full rounded-2xl object-cover"
									/>
								))}
							<p className="travel-card-copy text-muted leading-[1.6]">{e.summary}</p>
							<p className="travel-card-copy text-muted leading-[1.6]">{e.reflection}</p>
						</motion.article>
					))
				) : (
					<p>Travel notes are coming as the route unfolds.</p>
				)}
			</section>
		</main>
	);
}
