import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { SECTION_EDITORS } from "../../components/cms/sections/editors";
import { findSection, isSectionId } from "../../components/cms/sections/registry";

export const Route = createFileRoute("/cms/content/$section")({
	validateSearch: z.object({ item: z.string().max(160).optional() }),
	beforeLoad: ({ params }) => {
		if (!isSectionId(params.section)) throw notFound();
	},
	head: ({ params }) => ({
		meta: [{ title: `${findSection(params.section)?.label ?? "Content"} · Control plane` }],
	}),
	component: SectionRoute,
});

function SectionRoute() {
	const { section: sectionId } = Route.useParams();
	if (!isSectionId(sectionId)) return null;
	const section = findSection(sectionId);
	const Editor = SECTION_EDITORS[sectionId];
	return (
		<div className="grid max-w-[880px] gap-5">
			<header className="grid gap-1.5">
				<p className="mono-label m-0 text-primary-text">Content · {section?.group}</p>
				<h1 className="m-0 text-headline">{section?.label}</h1>
				<p className="m-0 text-[14px] text-muted-foreground">{section?.summary}</p>
			</header>
			<Editor />
		</div>
	);
}
