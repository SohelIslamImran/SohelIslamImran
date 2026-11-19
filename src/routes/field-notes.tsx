import { createFileRoute } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { mediaById } from "../lib/media";
import { PageShell } from "../components/ui/portfolio";
import { NotesEmpty } from "../components/pages/notes/NotesEmpty";
import { NotesList } from "../components/pages/notes/NotesList";

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
	const publicEntries = (travel.entries ?? []).filter((entry) => entry?.visibility === "public");
	const origin = travel.origin?.trim() || "";
	const eyebrow = travel.eyebrow?.trim() || "Field notes";
	const title = travel.title?.trim() || "Field notes";
	const intro = travel.intro?.trim() || "Public notes from places along the way.";

	return (
		<PageShell data-page="field-notes">
			{publicEntries.length === 0 ? (
				<NotesEmpty content={content} eyebrow={eyebrow} title={title} intro={intro} />
			) : (
				<NotesList
					eyebrow={eyebrow}
					title={title}
					intro={intro}
					origin={origin}
					entries={publicEntries}
					assets={mediaById(content.media ?? [])}
				/>
			)}
		</PageShell>
	);
}
