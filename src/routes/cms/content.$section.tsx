import { useCallback } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { useDraftStore, useIssuesUnder } from "../../components/cms/draft/context";
import { formatPath, isPathWithin, parsePath } from "../../components/cms/draft/paths";
import { fieldId, focusField } from "../../components/cms/fields";
import { absolute } from "../../lib/seo";
import { EditorLayout } from "../../components/cms/sections/EditorLayout";
import { itemForIssue } from "../../components/cms/sections/collection-helpers";
import { SECTION_EDITORS } from "../../components/cms/sections/editors";
import { findSection, isSectionId, type SectionMeta } from "../../components/cms/sections/registry";

export const sectionSearch = z.object({
	item: z.string().max(160).optional().catch(undefined),
	tab: z.literal("social").optional().catch(undefined),
});

export const Route = createFileRoute("/cms/content/$section")({
	validateSearch: sectionSearch,
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
	const { item, tab } = Route.useSearch();
	const navigate = Route.useNavigate();
	const select = useCallback(
		(nextItem?: string, nextTab?: "social", replace = false) =>
			navigate({
				to: "/cms/content/$section",
				params: { section: sectionId },
				search: { item: nextItem, tab: nextTab },
				replace,
				resetScroll: false,
			}),
		[navigate, sectionId],
	);
	if (!isSectionId(sectionId)) return null;
	const section = findSection(sectionId);
	if (!section) return null;
	const Editor = SECTION_EDITORS[sectionId];

	return (
		<EditorLayout
			title={section.label}
			description={section.summary}
			liveUrl={section.livePath ? absolute(section.livePath) : undefined}
			issues={<SectionIssues section={section} />}
		>
			<Editor key={sectionId} item={item} tab={tab} select={select} />
		</EditorLayout>
	);
}

function SectionIssues({ section }: { section: SectionMeta }) {
	const store = useDraftStore();
	const navigate = Route.useNavigate();
	const primary = useIssuesUnder(section.paths[0]);
	const secondary = useIssuesUnder(section.paths[1] ?? "$unused");
	const media = useIssuesUnder(section.id === "travel" ? "media" : "$unused");
	const draft = media.length ? store.getState().draft : undefined;
	const itemForMediaIssue = (path: string) => {
		const index = parsePath(path)[1];
		const assetId = typeof index === "number" ? draft?.media[index]?.id : undefined;
		return assetId
			? draft?.travel.entries.find((entry) => entry.mediaIds.includes(assetId))?.id
			: undefined;
	};
	const issues = [
		...primary,
		...secondary,
		...media.filter((issue) => itemForMediaIssue(issue.path)),
	];

	const collectionPath = section.id === "travel" ? "travel.entries" : section.paths[0];
	if (!issues.length) return null;
	return (
		<section aria-labelledby="cms-section-errors" className="cms-section-issues">
			<h2 id="cms-section-errors" className="m-0 text-[13px] font-semibold text-destructive">
				{issues.length} {issues.length === 1 ? "error to fix" : "errors to fix"}
			</h2>
			<ul className="m-0 mt-1 grid list-none p-0 text-[13px]">
				{issues.map((issue, index) => {
					const item = section.collection
						? (itemForIssue(store.getState().draft, collectionPath, issue.path) ??
							itemForMediaIssue(issue.path))
						: undefined;
					const tab =
						section.id === "links" && isPathWithin(issue.path, "social")
							? ("social" as const)
							: undefined;
					return (
						<li key={`${issue.path}-${index}`}>
							<Link
								to="/cms/content/$section"
								params={{ section: section.id }}
								search={{ item, tab }}
								hash={fieldId(issue.path)}
								replace
								resetScroll={false}
								onClick={(event) => {
									if (
										event.button !== 0 ||
										event.metaKey ||
										event.ctrlKey ||
										event.shiftKey ||
										event.altKey
									)
										return;
									event.preventDefault();
									void navigate({
										to: "/cms/content/$section",
										params: { section: section.id },
										search: { item, tab },
										replace: true,
										resetScroll: false,
									}).then(() => revealIssue(issue.path));
								}}
								className="cms-press -mx-1 inline-flex min-h-8 max-w-full flex-wrap items-center gap-x-2 rounded-md px-1 py-1 text-foreground hover:bg-surface-solid pointer-coarse:min-h-11"
							>
								<span className="wrap-anywhere text-primary-text underline underline-offset-2">
									{issue.message}
								</span>
								<span className="wrap-anywhere font-mono text-[11px] text-muted-foreground">
									{issue.path}
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

/** Open parent disclosure rows before focusing their lazily mounted controls. */
function revealIssue(path: string) {
	const segments = parsePath(path);
	const parents = segments.slice(1).map((_, index) => formatPath(segments.slice(0, index + 1)));
	let attempts = 15;
	function reveal() {
		for (const parentPath of parents) {
			const parent = document.getElementById(fieldId(parentPath))?.parentElement;
			if (parent instanceof HTMLDetailsElement) parent.open = true;
		}
		const disclosure = document.getElementById(fieldId(path))?.closest("details:not([open])");
		if (disclosure instanceof HTMLDetailsElement) disclosure.open = true;
		if (focusField(path)) return;
		if (attempts-- > 0) requestAnimationFrame(reveal);
		else if (!parents.reverse().some(focusField))
			document.getElementById("cms-section-heading")?.focus();
	}
	requestAnimationFrame(reveal);
}
