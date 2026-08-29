import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
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
	const reducedMotion = useReducedMotion();
	const { focus: requestedFocus } = Route.useSearch();
	const focus = requestedFocus ?? "identity";
	const navigate = useNavigate({ from: "/work" });
	return (
		<main className="page mx-auto min-h-[calc(100svh-150px)] w-[min(1080px,calc(100%-40px))] py-[clamp(58px,9vw,120px)]">
			<header className="page-intro mb-16 max-w-[960px] max-[800px]:mb-12">
				<p className="eyebrow">Selected work</p>
				<h1 className="page-title mb-[22px] mt-0 max-w-[960px] text-[clamp(3rem,5vw,4.8rem)] font-[760] leading-[.98] tracking-[-.06em] [text-wrap:balance]">
					Full-stack product engineering at Kuno.
				</h1>
				<p className="lede m-0 max-w-[650px] text-[clamp(17px,2vw,21px)] leading-[1.55] text-muted">
					I lead product work across interfaces, backend services, data, infrastructure, and
					releases. Open-source projects are the parts I can show in full.
				</p>
			</header>
			<motion.section
				className="work-thesis glass mb-20 grid grid-cols-2 gap-[30px] rounded-[26px] p-[30px] max-[800px]:mb-[58px] max-[800px]:grid-cols-1"
				aria-labelledby="work-thesis-title"
				whileHover={reducedMotion ? undefined : { y: -3 }}
				whileTap={reducedMotion ? undefined : { scale: 0.997 }}
				transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
			>
				<div>
					<p className="eyebrow">Kuno · current practice</p>
					<h2
						className="work-thesis-title m-0 mt-[5px] max-w-[440px] text-[clamp(26px,4vw,46px)] font-[760] leading-[.98] tracking-[-.06em]"
						id="work-thesis-title"
					>
						Follow the outcome through the whole stack.
					</h2>
				</div>
				<p className="work-thesis-copy m-0 max-w-[520px] self-end text-[17px] leading-[1.6] text-muted">
					I connect product behavior, authorization, services, data, release systems, and the
					feedback that helps teams keep improving. The public proof below stays specific where it
					can and generalized where the product is private.
				</p>
			</motion.section>
			<WorkFocusTabs
				projects={c.projects}
				initialFocus={focus}
				sectionNumber="01"
				onFocusChange={(next) => {
					void navigate({ search: { focus: next }, replace: true, resetScroll: false });
				}}
			/>
			<CareerTimeline experience={c.experience} sectionNumber="02" />
		</main>
	);
}
