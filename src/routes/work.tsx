import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { workSearchSchema } from "../lib/search";
import { EMPTY_PORTFOLIO_CONTENT } from "../types/content";
import { CareerTimeline, WorkFocusTabs } from "../components";
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
	const c = Route.useLoaderData();
	const { focus: requestedFocus } = Route.useSearch();
	const focus = requestedFocus ?? "identity";
	const navigate = useNavigate({ from: "/work" });
	return (
		<main className="prism-page">
			<header className="page-intro">
				<p className="eyebrow">Selected work</p>
				<h1>Full-stack product engineering at Kuno.</h1>
				<p className="lede">
					I lead product work across interfaces, backend services, data, infrastructure, and
					releases. Open-source projects are the parts I can show in full.
				</p>
			</header>
			<section className="work-thesis prism-glass-card" aria-labelledby="work-thesis-title">
				<div>
					<p className="eyebrow">Kuno · current practice</p>
					<h2 id="work-thesis-title">Follow the outcome through the whole stack.</h2>
				</div>
				<p>
					I connect product behavior, authorization, services, data, release systems, and the
					feedback that helps teams keep improving. The public proof below stays specific where it
					can and generalized where the product is private.
				</p>
			</section>
			<WorkFocusTabs
				projects={c.projects}
				initialFocus={focus}
				sectionNumber="01"
				onFocusChange={(next) => {
					void navigate({ search: { focus: next }, replace: true });
				}}
			/>
			<CareerTimeline experience={c.experience} sectionNumber="02" />
		</main>
	);
}
