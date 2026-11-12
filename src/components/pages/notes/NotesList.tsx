import { PortfolioImage } from "../../PortfolioImage";
import { mediaHref } from "../../../lib/media";
import type { MediaAsset, TravelEntryContent } from "../../../types/content";

function coordinate(value: number | undefined, positive: string, negative: string) {
	if (typeof value !== "number" || !Number.isFinite(value)) return "";
	return `${Math.abs(value).toFixed(2)}°${value >= 0 ? positive : negative}`;
}

/**
 * Published notes as a logbook: a trace line runs from the origin down
 * through every entry. Each note is a sheet with its place, season and (when
 * given) coordinates; the reflection gets its own pull-quote. All fields are
 * optional and trimmed, so CMS gaps never leave empty chrome.
 */
export function NotesList({
	eyebrow,
	title,
	intro,
	origin,
	entries,
	assets,
}: {
	eyebrow: string;
	title: string;
	intro: string;
	origin: string;
	entries: TravelEntryContent[];
	assets: Map<string, MediaAsset>;
}) {
	return (
		<>
			<header className="fn-list-head">
				<p className="mono-label m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
					<span className="text-primary-text">{eyebrow}</span>
					<span className="text-muted-foreground">
						{entries.length} {entries.length === 1 ? "note" : "notes"}
					</span>
				</p>
				<h1 className="mt-6 mb-0 max-w-[16ch] text-display [overflow-wrap:anywhere]">{title}</h1>
				<p className="mt-7 mb-0 max-w-[52ch] text-lead text-ink-soft [overflow-wrap:anywhere]">
					{intro}
				</p>
			</header>

			<section className="fn-log" aria-labelledby="field-notes-list-title">
				<h2 id="field-notes-list-title" className="sr-only">
					Public field notes
				</h2>
				{origin ? (
					<p className="fn-origin">
						<span className="fn-node" aria-hidden="true" />
						<span className="mono-label text-muted-foreground">Origin</span>
						<span className="text-foreground">{origin}</span>
					</p>
				) : null}
				<ol className="fn-entries">
					{entries.map((entry, index) => {
						const place = entry.place?.trim() || "Untitled field note";
						const season = entry.season?.trim() || "";
						const region = entry.region?.trim() || "";
						const summary = entry.summary?.trim() || "";
						const reflection = entry.reflection?.trim() || "";
						const key = entry.id || `field-note-${index}`;
						const titleId = `field-note-${index}-title`;
						const coords = [
							coordinate(entry.latitude, "N", "S"),
							coordinate(entry.longitude, "E", "W"),
						]
							.filter(Boolean)
							.join(" ");
						const media = (entry.mediaIds ?? [])
							.map((id) => assets.get(id))
							.filter((asset): asset is MediaAsset => Boolean(asset));
						return (
							<li key={key} className="fn-entry">
								<span className="fn-node" aria-hidden="true" />
								<article className="fn-note" aria-labelledby={titleId}>
									<div className="fn-note-meta">
										<span className="mono-label text-primary-text" data-numeric="">
											N° {String(index + 1).padStart(3, "0")}
										</span>
										{season ? (
											<span className="mono-label text-muted-foreground">{season}</span>
										) : null}
										{coords ? (
											<span className="mono-label text-muted-foreground">{coords}</span>
										) : null}
									</div>
									<div className="min-w-0">
										<h3 id={titleId} className="m-0 text-title [overflow-wrap:anywhere]">
											{place}
										</h3>
										{region ? (
											<p className="mt-2 mb-0 text-small text-muted-foreground [overflow-wrap:anywhere]">
												{region}
											</p>
										) : null}
										{media.length > 0 ? (
											<div className="fn-media" data-count={Math.min(media.length, 3)}>
												{media.map((asset, assetIndex) => (
													<PortfolioImage
														key={asset.id || `${key}-${assetIndex}`}
														src={mediaHref(asset)}
														alt={asset.alt?.trim() || place}
														width={asset.width ?? 1200}
														height={asset.height ?? 800}
														className="block h-full w-full object-cover"
													/>
												))}
											</div>
										) : null}
										{summary ? <p className="fn-summary">{summary}</p> : null}
										{reflection ? (
											<figure className="fn-reflection">
												<figcaption className="mono-label">Reflection</figcaption>
												<blockquote>
													<p>{reflection}</p>
												</blockquote>
											</figure>
										) : null}
									</div>
								</article>
							</li>
						);
					})}
				</ol>
			</section>
		</>
	);
}
