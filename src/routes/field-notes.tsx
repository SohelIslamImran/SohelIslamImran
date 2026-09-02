import { createFileRoute } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { PortfolioImage } from "../components/PortfolioImage";
import { mediaById, mediaHref } from "../lib/media";
import { CardContent, CardHeader } from "../components/ui/card";
import { EmptyState, PageHeader, PageShell, Surface } from "../components/ui/portfolio";

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
	const content = Route.useLoaderData();
	const publicEntries = content.travel.entries.filter((entry) => entry.visibility === "public");
	const assets = mediaById(content.media);

	return (
		<PageShell>
			<PageHeader
				eyebrow={content.travel.eyebrow}
				title={content.travel.title}
				description={content.travel.intro}
			/>
			{publicEntries.length === 0 ? (
				<div className="grid gap-4">
					<Surface className="grid grid-cols-[minmax(220px,.95fr)_minmax(0,1.05fr)] items-center gap-[clamp(22px,5vw,58px)] p-3.5 max-[800px]:grid-cols-1 max-[800px]:gap-5 max-[800px]:p-2.5">
						<PortfolioImage
							src="/images/travel-placeholder-1122.webp"
							alt="A placeholder route photograph for Sohel's future travel journal"
							width={1122}
							height={1402}
							sizes="(max-width: 800px) calc(100vw - 60px), 520px"
							srcSet="/images/travel-placeholder-561.webp 561w, /images/travel-placeholder-1122.webp 1122w"
							className="block h-[280px] w-full rounded-[18px] object-cover max-[800px]:h-[220px]"
						/>
						<div className="p-3 max-[800px]:p-2.5">
							<p className="mb-3.5 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text">
								The next horizon
							</p>
							<h2 className="m-0 max-w-[500px] text-[clamp(1.8rem,4vw,3rem)] font-[760] leading-[0.98] tracking-[-0.06em]">
								A map still being written.
							</h2>
							<p className="mt-4 max-w-[500px] text-[1.05rem] leading-[1.6] text-muted-foreground">
								The first entry is deliberately open. As the route grows, each place will carry a
								small story, a photograph, and what remote work looked like from there.
							</p>
						</div>
					</Surface>
					<EmptyState
						title="No public field notes yet."
						description={`The journal begins in ${content.travel.origin}. New places will appear here when they are ready to share.`}
					/>
				</div>
			) : (
				<section className="grid gap-4" aria-label="Public field notes">
					<p className="m-0 text-sm text-muted-foreground">
						<strong className="text-foreground">Origin:</strong> {content.travel.origin}
					</p>
					{publicEntries.map((entry) => (
						<Surface key={entry.id} className="p-0">
							<CardHeader className="p-6 pb-0">
								<p className="mb-2 text-xs font-extrabold uppercase tracking-[0.11em] text-signal">
									{entry.season}
								</p>
								<h2 className="text-[clamp(1.7rem,4vw,2.7rem)] font-[760] tracking-[-0.055em]">
									{entry.place}
								</h2>
								<p className="m-0 text-sm text-muted-foreground">{entry.region}</p>
							</CardHeader>
							<CardContent className="grid gap-4 p-6">
								{entry.mediaIds
									.map((id) => assets.get(id))
									.filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
									.map((asset) => (
										<PortfolioImage
											key={asset.id}
											src={mediaHref(asset)}
											alt={asset.alt}
											width={asset.width ?? 1200}
											height={asset.height ?? 800}
											className="max-h-80 w-full rounded-[18px] object-cover"
										/>
									))}
								<div className="grid gap-2 text-[1.05rem] leading-[1.65] text-muted-foreground">
									<p className="m-0">
										<strong className="text-foreground">Note.</strong> {entry.summary}
									</p>
									<p className="m-0">
										<strong className="text-foreground">Reflection.</strong> {entry.reflection}
									</p>
								</div>
							</CardContent>
						</Surface>
					))}
				</section>
			)}
		</PageShell>
	);
}
