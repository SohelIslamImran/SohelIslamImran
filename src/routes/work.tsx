import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { workSearchSchema } from "../lib/search";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { CareerTimeline } from "../components/CareerTimeline";
import { WorkFocusTabs } from "../components/WorkFocusTabs";
import { CardContent, CardHeader } from "../components/ui/card";
import { PageHeader, PageShell, Surface } from "../components/ui/portfolio";

export const Route = createFileRoute("/work")({
	validateSearch: workSearchSchema,
	loader: getPublishedContent,
	head: ({ loaderData }) => {
		const c = loaderData ?? EMPTY_PORTFOLIO_CONTENT;
		return pageHead(
			c,
			`${c.identity.name} — Selected work`,
			"Kuno product engineering, company systems, and open-source tools by Sohel Islam Imran.",
			"/work",
			"/images/social-work.png",
			[
				{
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name: `${c.identity.name} selected work`,
					description: "Selected Kuno product engineering and open-source work.",
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
	const { focus } = Route.useSearch();
	const navigate = useNavigate({ from: "/work" });

	return (
		<PageShell>
			<PageHeader
				eyebrow="Selected work"
				title="Full-stack product engineering at Kuno."
				description="I lead product work across interfaces, backend services, data, infrastructure, and releases. Open-source projects are the parts I can show in full."
			/>
			<Surface className="mb-[clamp(48px,7vw,80px)] grid grid-cols-2 gap-8 p-7 max-[800px]:grid-cols-1 max-[800px]:gap-5 max-[800px]:p-5">
				<CardHeader className="p-0">
					<p className="mb-3.5 text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text">
						Kuno · Current practice
					</p>
					<h2 className="max-w-[480px] text-[clamp(1.8rem,4vw,3rem)] font-[760] leading-[0.98] tracking-[-0.06em]">
						Follow the outcome through the whole stack.
					</h2>
				</CardHeader>
				<CardContent className="self-end p-0 text-[1.05rem] leading-[1.6] text-muted-foreground">
					I connect product behavior, authorization, services, data, release systems, and the
					feedback that helps teams keep improving. The public proof below stays specific where it
					can and generalized where the product is private.
				</CardContent>
			</Surface>
			<WorkFocusTabs
				projects={content.projects}
				initialFocus={focus}
				sectionNumber="01"
				onFocusChange={(next) => {
					void navigate({ search: { focus: next }, replace: true, resetScroll: false });
				}}
			/>
			<CareerTimeline experience={content.experience} sectionNumber="02" />
		</PageShell>
	);
}
