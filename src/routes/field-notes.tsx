import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { PortfolioImage } from "../components/PortfolioImage";
import { mediaById, mediaHref } from "../lib/media";
import { CardContent, CardHeader } from "../components/ui/card";
import { buttonVariants } from "../components/ui/button";
import { EmptyState, PageHeader, PageShell, Surface } from "../components/ui/portfolio";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/field-notes")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		const travel = c.travel ?? EMPTY_PORTFOLIO_CONTENT.travel;
		const name = c.identity.name.trim() || "Sohel Islam Imran";
		const title = travel.title?.trim() || "Field notes";
		const intro = travel.intro?.trim() || "Public notes from places along the way.";
		return pageHead(
			c,
			`${name} — Field notes`,
			intro,
			"/field-notes",
			"/images/social-field-notes.png",
			[
				{
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name: title,
					description: intro,
					mainEntity: {
						"@type": "ItemList",
						itemListElement: (travel.entries ?? [])
							.filter((entry) => entry?.visibility === "public")
							.map((entry, index) => ({
								"@type": "ListItem",
								position: index + 1,
								name: entry.place?.trim() || "Field note",
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
	const travel = content.travel ?? EMPTY_PORTFOLIO_CONTENT.travel;
	const entries = travel.entries ?? [];
	const publicEntries = entries.filter((entry) => entry?.visibility === "public");
	const assets = mediaById(content.media ?? []);
	const origin = travel.origin?.trim() || "";
	const eyebrow = travel.eyebrow?.trim() || "Field notes";
	const title = travel.title?.trim() || "Field notes";
	const intro = travel.intro?.trim() || "Public notes from places along the way.";

	return (
		<PageShell>
			<PageHeader eyebrow={eyebrow} title={title} description={intro} />
			{publicEntries.length === 0 ? (
				<section aria-label="Public field notes" className="grid min-w-0 max-w-full gap-4">
					<EmptyState
						level={2}
						title="No public field notes to show."
						description={
							origin
								? `The journal begins in ${origin}. New places will appear here when they are ready to share.`
								: "New places will appear here when they are ready to share."
						}
					>
						<Link
							className={cn(
								buttonVariants({ size: "lg" }),
								"min-w-0 max-w-full whitespace-normal text-left [overflow-wrap:anywhere]",
							)}
							to="/story"
						>
							Read the story instead <span aria-hidden="true">→</span>
						</Link>
					</EmptyState>
				</section>
			) : (
				<section className="grid min-w-0 max-w-full gap-4" aria-labelledby="field-notes-list-title">
					<h2 id="field-notes-list-title" className="sr-only">
						Public field notes
					</h2>
					{origin ? (
						<p className="m-0 max-w-[60ch] break-words text-pretty text-sm text-muted-foreground [overflow-wrap:anywhere]">
							<strong className="text-foreground">Origin:</strong> {origin}
						</p>
					) : null}
					<ol className="m-0 grid min-w-0 max-w-full list-none gap-4 p-0">
						{publicEntries.map((entry, index) => {
							const place = entry.place?.trim() || "Untitled field note";
							const season = entry.season?.trim() || "";
							const region = entry.region?.trim() || "";
							const summary = entry.summary?.trim() || "";
							const reflection = entry.reflection?.trim() || "";
							const entryKey = entry.id || `field-note-${index}`;
							const entryAssets = (entry.mediaIds ?? [])
								.map((id) => assets.get(id))
								.filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
							const hasDetails = entryAssets.length > 0 || Boolean(summary || reflection);
							return (
								<li className="min-w-0 max-w-full" key={entryKey}>
									<article className="min-w-0 max-w-full">
										<Surface className="min-w-0 max-w-full p-0">
											<CardHeader className="min-w-0 p-6 pb-0">
												{season ? (
													<p className="mb-2 break-words text-xs font-extrabold uppercase tracking-[0.11em] text-signal [overflow-wrap:anywhere]">
														{season}
													</p>
												) : null}
												<h3 className="m-0 max-w-[24ch] break-words text-[clamp(1.7rem,4vw,2.7rem)] font-[760] tracking-[-0.055em] text-pretty [overflow-wrap:anywhere]">
													{place}
												</h3>
												{region ? (
													<p className="m-0 max-w-[60ch] break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
														{region}
													</p>
												) : null}
											</CardHeader>
											{hasDetails ? (
												<CardContent className="grid min-w-0 max-w-full gap-4 p-6">
													{entryAssets.map((asset, assetIndex) => (
														<PortfolioImage
															key={asset.id || `${entryKey}-${assetIndex}`}
															src={mediaHref(asset)}
															alt={asset.alt?.trim() || place}
															width={asset.width ?? 1200}
															height={asset.height ?? 800}
															className="block h-auto max-h-80 w-full rounded-[18px] object-cover"
														/>
													))}
													{summary || reflection ? (
														<div className="grid max-w-[65ch] gap-2 text-[1.05rem] leading-[1.65] text-muted-foreground">
															{summary ? (
																<p className="m-0 break-words text-pretty [overflow-wrap:anywhere]">
																	<strong className="text-foreground">Note.</strong> {summary}
																</p>
															) : null}
															{reflection ? (
																<p className="m-0 break-words text-pretty [overflow-wrap:anywhere]">
																	<strong className="text-foreground">Reflection.</strong>{" "}
																	{reflection}
																</p>
															) : null}
														</div>
													) : null}
												</CardContent>
											) : null}
										</Surface>
									</article>
								</li>
							);
						})}
					</ol>
				</section>
			)}
		</PageShell>
	);
}
