import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { useDraftStore, useIssuesUnder } from "../../components/cms/draft/context";
import { formatPath, isPathWithin, parsePath } from "../../components/cms/draft/paths";
import { fieldId, focusField } from "../../components/cms/fields";
import { itemForIssue } from "../../components/cms/sections/collection-helpers";
import { SECTION_EDITORS } from "../../components/cms/sections/editors";
import { findSection, isSectionId, type SectionMeta } from "../../components/cms/sections/registry";

export const Route = createFileRoute("/cms/content/$section")({
	validateSearch: z.object({
		item: z.string().max(160).optional(),
		tab: z.literal("social").optional(),
	}),
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
	if (!isSectionId(sectionId)) return null;
	const section = findSection(sectionId);
	if (!section) return null;
	const Editor = SECTION_EDITORS[sectionId];

	return (
		<div className="grid max-w-[1040px] gap-5">
			<header className="grid gap-1.5">
				<h1 id="cms-section-heading" tabIndex={-1} className="m-0 rounded-sm text-headline">
					{section.label}
				</h1>
				<p className="m-0 text-[14px] text-muted-foreground">{section.summary}</p>
				<SectionIssues section={section} />
			</header>
			<Editor
				key={sectionId}
				item={item}
				tab={tab}
				select={(nextItem, nextTab) =>
					navigate({
						to: "/cms/content/$section",
						params: { section: sectionId },
						search: { item: nextItem, tab: nextTab },
						replace: true,
						resetScroll: false,
					})
				}
			/>
		</div>
	);
}

function SectionIssues({ section }: { section: SectionMeta }) {
	const store = useDraftStore();
	const navigate = Route.useNavigate();
	const primary = useIssuesUnder(section.paths[0]);
	const secondary = useIssuesUnder(section.paths[1] ?? "$unused");
	const issues = [...primary, ...secondary];
	if (!issues.length) return null;

	const collectionPath = section.id === "travel" ? "travel.entries" : section.paths[0];
	return (
		<section
			aria-labelledby="cms-section-errors"
			className="mt-2 rounded-[12px] border border-line bg-surface-solid px-3 py-2"
		>
			<h2 id="cms-section-errors" className="m-0 text-[13px] font-semibold text-destructive">
				{issues.length} {issues.length === 1 ? "error to fix" : "errors to fix"}
			</h2>
			<ul className="m-0 list-disc pl-4 text-[13px]">
				{issues.map((issue, index) => {
					const item = section.collection
						? itemForIssue(store.getState().draft, collectionPath, issue.path)
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
								className="inline-flex min-h-8 flex-wrap items-center gap-x-2 rounded-sm py-1 text-primary-text underline underline-offset-2 pointer-coarse:min-h-11"
							>
								<span className="font-mono text-xs">{issue.path}</span>
								<span>{issue.message}</span>
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
		if (focusField(path)) return;
		if (attempts-- > 0) requestAnimationFrame(reveal);
		else if (!parents.reverse().some(focusField))
			document.getElementById("cms-section-heading")?.focus();
	}
	requestAnimationFrame(reveal);
}
