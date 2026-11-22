import { Popover } from "@base-ui/react/popover";
import { useCallback, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { useDraftStore, useIssuesUnder } from "../../components/cms/draft/context";
import { formatPath, isPathWithin, parsePath } from "../../components/cms/draft/paths";
import { fieldId, focusField } from "../../components/cms/fields";
import { UndoRemovalHost } from "../../components/cms/fields/UndoRemoval";
import { fieldIssueMessage } from "../../components/cms/fields/FieldFrame";
import { AlertCircleIcon } from "../../components/cms/fields/field-icons";
import { absolute } from "../../lib/seo";
import { EditorLayout } from "../../components/cms/sections/EditorLayout";
import { issueLabel, itemForIssue } from "../../components/cms/sections/collection-helpers";
import { SECTION_EDITORS } from "../../components/cms/sections/editors";
import { findSection, isSectionId, type SectionMeta } from "../../components/cms/sections/registry";

export const sectionSearch = z.object({
	item: z.string().max(160).optional().catch(undefined),
	tab: z.literal("social").optional().catch(undefined),
	field: z
		.string()
		.regex(/^social\[(?:0|[1-9]\d{0,5})\]\.(?:label|platform|handle|href)$/u)
		.optional()
		.catch(undefined),
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
	const { item, tab, field } = Route.useSearch();
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
			<UndoRemovalHost key={sectionId}>
				<Editor item={item} tab={tab} field={field} select={select} />
			</UndoRemovalHost>
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

	const [open, setOpen] = useState(false);
	const pendingFocus = useRef<{ path: string; navigation: Promise<void> } | null>(null);
	const collectionPath = section.id === "travel" ? "travel.entries" : section.paths[0];
	if (!issues.length) return null;
	const draftNow = store.getState().draft;
	// Counts reflect the live draft. Text inputs can delay their inline feedback,
	// but these issues still block autosave and can be opened here immediately.
	const count = `${issues.length} ${issues.length === 1 ? "error" : "errors"}`;
	return (
		<Popover.Root
			open={open}
			onOpenChange={setOpen}
			onOpenChangeComplete={(open) => {
				if (open) return;
				const pending = pendingFocus.current;
				pendingFocus.current = null;
				if (pending) void pending.navigation.then(() => revealIssue(pending.path));
			}}
		>
			<Popover.Trigger className="cms-issues-pill cms-press cms-enter">
				<AlertCircleIcon className="size-3.5" />
				{count}
				<span className="sr-only"> to fix</span>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner
					side="bottom"
					align="end"
					sideOffset={8}
					className="isolate z-(--z-overlay) outline-none"
				>
					<Popover.Popup className="cms-field-popup cms-issues-popup">
						<Popover.Title className="m-0 px-2.5 pt-1.5 pb-1 text-[12px] font-semibold text-muted-foreground">
							{issues.length === 1 ? "1 error to fix" : `${count} to fix`}
						</Popover.Title>
						<ul className="cms-popup-list m-0 grid list-none p-0">
							{issues.map((issue, index) => {
								const item = section.collection
									? (itemForIssue(draftNow, collectionPath, issue.path) ??
										itemForMediaIssue(issue.path))
									: undefined;
								const tab =
									section.id === "links" && isPathWithin(issue.path, "social")
										? ("social" as const)
										: undefined;
								const field = tab ? sectionSearch.shape.field.parse(issue.path) : undefined;
								return (
									<li key={`${issue.path}-${index}`}>
										<Link
											to="/cms/content/$section"
											params={{ section: section.id }}
											search={{ item, tab, field }}
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
												// The popup restores focus when its exit completes.
												pendingFocus.current = {
													path: issue.path,
													navigation: navigate({
														to: "/cms/content/$section",
														params: { section: section.id },
														search: { item, tab, field },
														hash: fieldId(issue.path),
														hashScrollIntoView: false,
														replace: true,
														resetScroll: false,
													}),
												};
												setOpen(false);
											}}
											className="cms-issue-link"
										>
											<span className="font-semibold">{issueLabel(draftNow, issue.path)}</span>{" "}
											<span className="text-muted-foreground">
												{fieldIssueMessage(issue).replace(/^./u, (first) => first.toLowerCase())}
											</span>
										</Link>
									</li>
								);
							})}
						</ul>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
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
