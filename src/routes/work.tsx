import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getPublishedContent } from "../server/content";
import { pageHead } from "../lib/seo";
import { workSearchSchema } from "../lib/search";
import { EMPTY_PORTFOLIO_CONTENT } from "../../app/types/content";
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
				<h1>Systems that make complicated products feel clear.</h1>
				<p className="lede">
					My day-to-day work is at Kuno, where I lead full-stack product engineering. Open-source
					projects are the public edge of that practice.
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
			<CareerTimeline experience={c.experience} />
			<WorkFocusTabs
				projects={c.projects}
				initialFocus={focus}
				onFocusChange={(next) => {
					void navigate({ search: { focus: next }, replace: true });
				}}
			/>
		</main>
	);
}
