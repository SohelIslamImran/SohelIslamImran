import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { PrismImage } from "../components";
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
	return (
		<main className="prism-page">
			<header className="page-intro">
				<p className="eyebrow">{c.travel.eyebrow}</p>
				<h1>{c.travel.title}</h1>
				<p className="lede">{c.travel.intro}</p>
			</header>
			<motion.section
				className="travel-feature prism-glass-card"
				aria-labelledby="travel-feature-title"
				whileHover={reducedMotion ? undefined : { y: -3 }}
				whileTap={reducedMotion ? undefined : { scale: 0.997 }}
				transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
			>
				<PrismImage
					src="/images/travel-placeholder-1122.webp"
					alt="A placeholder route photograph for Sohel's future travel journal"
					width={1122}
					height={1402}
					sizes="(max-width: 800px) calc(100vw - 60px), 450px"
					srcSet="/images/travel-placeholder-561.webp 561w, /images/travel-placeholder-1122.webp 1122w"
					className="travel-feature__image"
				/>
				<div>
					<p className="eyebrow">The next horizon</p>
					<h2 id="travel-feature-title">A map still being written.</h2>
					<p>
						The first entry is deliberately open. As the route grows, each place will carry a small
						story, a photograph, and what remote work looked like from there.
					</p>
				</div>
			</motion.section>
			<section className="travel-route">
				<p>
					<strong>Origin:</strong> {c.travel.origin}
				</p>
				{publicEntries.length ? (
					publicEntries.map((e) => (
						<motion.article
							key={e.id}
							whileHover={reducedMotion ? undefined : { y: -2 }}
							whileTap={reducedMotion ? undefined : { scale: 0.997 }}
							transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
						>
							<time>{e.season}</time>
							<h2>{e.place}</h2>
							<p>{e.summary}</p>
							<p>{e.reflection}</p>
						</motion.article>
					))
				) : (
					<p>Travel notes are coming as the route unfolds.</p>
				)}
			</section>
		</main>
	);
}
