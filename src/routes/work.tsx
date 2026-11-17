import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { absolute, pageHead } from "../lib/seo";
import { workSearchSchema } from "../lib/search";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { WorkIndex } from "../components/WorkIndex";
import { PageHeader, PageShell } from "../components/ui/portfolio";
import { linkableProjects } from "../components/work/project-utils";

export const Route = createFileRoute("/work")({
	validateSearch: workSearchSchema,
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		const name = c.identity.name.trim() || "Sohel Islam Imran";
		const description = `Products, open-source tools, and experiments by ${name}.`;
		return pageHead(c, `${name} — Work`, description, "/work", "/images/social-work.png", [
			{
				"@context": "https://schema.org",
				"@type": "CollectionPage",
				name: `${name} — Work`,
				description,
				mainEntity: {
					"@type": "ItemList",
					itemListElement: linkableProjects(c.projects).map((project, index) => ({
						"@type": "ListItem",
						position: index + 1,
						name: project.title.trim(),
						url: absolute(`/work/${encodeURIComponent(project.slug.trim())}`),
					})),
				},
			},
		]);
	},
	component: Work,
});

function Work() {
	const content = Route.useLoaderData();
	const { group } = Route.useSearch();
	const navigate = useNavigate({ from: "/work" });

	return (
		<PageShell data-page="work">
			<PageHeader
				eyebrow="Work"
				title="Products, tools, and questions worth exploring."
				description="Here is what I have built, helped ship, and tried along the way."
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
