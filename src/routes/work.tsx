import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { workSearchSchema } from "../lib/search";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { WorkIndex } from "../components/WorkIndex";
import { PageHeader, PageShell } from "../components/ui/portfolio";

export const Route = createFileRoute("/work")({
	validateSearch: workSearchSchema,
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		const name = c.identity.name.trim() || "Sohel Islam Imran";
		return pageHead(
			c,
			`${name} — Selected work`,
			"Product work, open-source packages, and native experiments by Sohel Islam Imran.",
			"/work",
			"/images/social-work.png",
			[
				{
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name: `${name} selected work`,
					description: "Product work, open-source packages, and native experiments.",
					mainEntity: {
						"@type": "ItemList",
						itemListElement: c.projects.map((project, index) => ({
							"@type": "ListItem",
							position: index + 1,
							name: project.title.trim() || `Project ${index + 1}`,
						})),
					},
				},
			],
		);
	},
	component: Work,
});

function Work() {
	const content = Route.useLoaderData();
	const { group } = Route.useSearch();
	const navigate = useNavigate({ from: "/work" });

	return (
		<PageShell>
			<PageHeader
				eyebrow="Selected work"
				title="Product work, open source, and experiments with a reason to exist."
				description="A curated record of product systems, independent packages, and smaller native experiments. Paid work is described through its mechanisms; prototypes stay clearly labeled as experiments."
			/>
			<WorkIndex
				projects={content.projects}
				group={group}
				onGroupChange={(next) => {
					void navigate({
						search: (previous) => ({ ...previous, group: next }),
						replace: true,
						resetScroll: false,
					});
				}}
			/>
		</PageShell>
	);
}
