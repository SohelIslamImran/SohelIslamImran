import { createFileRoute } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { CareerTimeline } from "../components/CareerTimeline";
import { SelectedWork } from "../components/SelectedWork";
import { CardContent, CardHeader } from "../components/ui/card";
import { PageHeader, PageShell, Surface } from "../components/ui/portfolio";

export const Route = createFileRoute("/work")({
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		return pageHead(
			c,
			`${c.identity.name} — Selected work`,
			"Product engineering, mobile apps, and open-source tools by Sohel Islam Imran.",
			"/work",
			"/images/social-work.png",
			[
				{
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name: `${c.identity.name} selected work`,
					description: "Selected product engineering and open-source work.",
					mainEntity: {
						"@type": "ItemList",
						itemListElement: c.projects.map((project, index) => ({
							"@type": "ListItem",
							position: index + 1,
							name: project.title,
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

	return (
		<PageShell>
			<PageHeader
				eyebrow="Selected work"
				title="Products I’ve built and helped run."
				description="Professional work comes first. Where a codebase is private, I describe the problem and my part in it without internal detail. Open source is where you can read the code."
			/>
			<Surface className="mb-[clamp(48px,7vw,80px)] grid grid-cols-2 gap-8 p-7 max-[800px]:grid-cols-1 max-[800px]:gap-5 max-[800px]:p-5">
				<CardHeader className="p-0">
					<p className="mb-3.5 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text">
						How I work
					</p>
					<h2 className="max-w-[480px] text-[clamp(1.8rem,4vw,3rem)] font-[760] leading-[0.98] tracking-[-0.06em]">
						Follow the outcome through the whole stack.
					</h2>
				</CardHeader>
				<CardContent className="self-end p-0 text-[1.05rem] leading-[1.6] text-muted-foreground">
					A feature is not finished when the screen looks right. I check the rule behind it on the
					server, the data it touches, the test that protects it, and how it gets released and
					rolled back. That habit started on mobile apps and now covers most of the stack.
				</CardContent>
			</Surface>
			<SelectedWork projects={content.projects} sectionNumber="01" />
			<CareerTimeline experience={content.experience} sectionNumber="02" />
		</PageShell>
	);
}
