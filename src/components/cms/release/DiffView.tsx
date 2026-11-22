/**
 * Shared diff renderer for Release (draft vs live), History (revision vs draft),
 * and Raw JSON import preview. Pairs every state with an icon and text label
 * (never hue alone) and supports smooth collapsible section groups.
 */
import { useId, useState, type ReactNode } from "react";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { EmptyState, staggerStyle } from "../analytics/Widgets";
import { REDUCED, SPRING_MOVE } from "../motion";
import { CheckCircleIcon, SectionIcon } from "../shell/cms-icons";
import {
	type DocumentDiff,
	type FieldDiff,
	type RowDiff,
	type RowDiffStatus,
	type SectionDiff,
} from "./diff";
import { ListDiff, MediaDiff, ProseDiff, ShortDiff, StatusGlyph, TagsDiff } from "./DiffValues";

interface DiffViewProps {
	diff: DocumentDiff;
	/** Labels for the left/right sides (default: Live → Draft). */
	beforeLabel?: string;
	afterLabel?: string;
	/** When supplied, renders a per-field "Revert" button for revertible paths. */
	onRevertField?: (path: string) => void;
	/** Show "Edit →" deep links to section editors. Default true. */
	showEditLinks?: boolean;
	/** Show collapsed unchanged sections below changed ones. Default true. */
	showUnchanged?: boolean;
	/** Copy shown when `diff.changedSections.length === 0`. */
	emptyTitle?: string;
	emptyDescription?: string;
	/** Optional action rendered inside the empty state. */
	emptyAction?: ReactNode;
}

function ChevronIcon({ open }: { open: boolean }) {
	return (
		<svg
			viewBox="0 0 16 16"
			aria-hidden="true"
			className={cn(
				"size-4 shrink-0 fill-none stroke-current stroke-[1.7] text-muted-foreground transition-transform duration-200 ease-trace [stroke-linecap:round] [stroke-linejoin:round]",
				open && "rotate-180",
			)}
		>
			<path d="m4 6 4 4 4-4" />
		</svg>
	);
}

const ROW_STATUS_STYLE: Record<RowDiffStatus, { label: string; className: string }> = {
	added: {
		label: "Added",
		className: "border-success/35 bg-success/10 text-success",
	},
	edited: {
		label: "Edited",
		className: "border-primary-line bg-primary-soft text-primary-text",
	},
	removed: {
		label: "Removed",
		className: "border-dashed border-destructive/45 bg-destructive/10 text-destructive",
	},
	reordered: {
		label: "Reordered",
		className: "border-line-strong bg-muted text-ink-soft",
	},
};

function StatusChip({ status, detail }: { status: RowDiffStatus; detail?: string }) {
	const meta = ROW_STATUS_STYLE[status];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium",
				meta.className,
			)}
		>
			<StatusGlyph status={status} />
			<span>
				{meta.label}
				{detail ? ` ${detail}` : ""}
			</span>
		</span>
	);
}

function FieldDiffRow({
	field,
	beforeLabel,
	afterLabel,
	onRevertField,
}: {
	field: FieldDiff;
	beforeLabel: string;
	afterLabel: string;
	onRevertField?: (path: string) => void;
}) {
	return (
		<div className="grid gap-2 py-3.5 first:pt-0 last:pb-0">
			<div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
				<span className="min-w-0 text-[12.5px] font-medium text-muted-foreground">
					{field.label}
				</span>
				{onRevertField && field.revertible ? (
					<button
						type="button"
						onClick={() => onRevertField(field.path)}
						className="cms-press cms-page-focus -my-1 inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] hover:text-foreground pointer-coarse:min-h-11"
					>
						<span aria-hidden="true">↺</span>
						<span>Revert</span>
						<span className="sr-only"> {field.label}</span>
					</button>
				) : null}
			</div>
			{field.kind === "tags" ? (
				<TagsDiff before={field.before} after={field.after} />
			) : field.kind === "prose" ? (
				<ProseDiff before={field.before} after={field.after} />
			) : field.kind === "media" ? (
				<MediaDiff
					before={field.before}
					after={field.after}
					beforeLabel={beforeLabel}
					afterLabel={afterLabel}
				/>
			) : field.kind === "list" ? (
				<ListDiff
					before={field.before}
					after={field.after}
					beforeLabel={beforeLabel}
					afterLabel={afterLabel}
				/>
			) : (
				<ShortDiff
					before={field.before}
					after={field.after}
					beforeLabel={beforeLabel}
					afterLabel={afterLabel}
				/>
			)}
		</div>
	);
}

/** One collection row: status, title (a quiet link to the item), and its changed fields. */
function RowDiffBlock({
	sectionId,
	row,
	beforeLabel,
	afterLabel,
	onRevertField,
	showEditLinks,
}: {
	sectionId: string;
	row: RowDiff;
	beforeLabel: string;
	afterLabel: string;
	onRevertField?: (path: string) => void;
	showEditLinks: boolean;
}) {
	const movedLabel =
		row.beforeIndex !== null && row.afterIndex !== null && row.beforeIndex !== row.afterIndex
			? `from ${row.beforeIndex} to ${row.afterIndex}`
			: null;
	const linked = showEditLinks && row.status !== "removed" && Boolean(row.itemId);

	return (
		<div className="grid gap-3 py-4 first:pt-0 last:pb-0">
			<div className="flex min-w-0 flex-wrap items-center gap-2">
				<StatusChip
					status={row.status}
					detail={row.status === "reordered" && movedLabel ? movedLabel : undefined}
				/>
				{row.status === "edited" && movedLabel ? (
					<StatusChip status="reordered" detail={movedLabel} />
				) : null}
				{linked ? (
					<Link
						to="/cms/content/$section"
						params={{ section: sectionId }}
						search={{ item: row.itemId }}
						className="cms-page-focus min-w-0 truncate rounded-[6px] text-[14px] font-medium text-foreground no-underline decoration-line-strong underline-offset-4 hover:underline"
					>
						<span className="sr-only">Edit </span>
						{row.title}
					</Link>
				) : (
					<span className="min-w-0 truncate text-[14px] font-medium text-foreground">
						{row.title}
					</span>
				)}
			</div>

			{row.preview ? <p className="m-0 text-[13px] text-muted-foreground">{row.preview}</p> : null}

			{row.fields.length > 0 ? (
				<div className="grid divide-y divide-line border-l border-line pl-3.5">
					{row.fields.map((field) => (
						<FieldDiffRow
							key={field.path}
							field={field}
							beforeLabel={beforeLabel}
							afterLabel={afterLabel}
							onRevertField={onRevertField}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

/** "1 added · 2 edited" for a section header; plain text, no chips. */
function sectionSummary(entry: SectionDiff): string {
	const parts: string[] = [];
	if (entry.counts.added > 0) parts.push(`${entry.counts.added} added`);
	if (entry.counts.edited > 0) parts.push(`${entry.counts.edited} edited`);
	if (entry.counts.removed > 0) parts.push(`${entry.counts.removed} removed`);
	if (entry.counts.reordered > 0) parts.push(`${entry.counts.reordered} moved`);
	if (entry.fields.length > 0) {
		parts.push(`${entry.fields.length} ${entry.fields.length === 1 ? "field" : "fields"}`);
	}
	return parts.join(" · ");
}

function SectionDiffCard({
	entry,
	open,
	onToggle,
	beforeLabel,
	afterLabel,
	onRevertField,
	showEditLinks,
	showSummary,
	stagger,
}: {
	entry: SectionDiff;
	open: boolean;
	onToggle: () => void;
	beforeLabel: string;
	afterLabel: string;
	onRevertField?: (path: string) => void;
	showEditLinks: boolean;
	/** Off when the page already states the totals (a single changed section). */
	showSummary: boolean;
	stagger: number;
}) {
	const reduced = useLiveReducedMotion();
	const bodyId = useId();
	// Deep-link straight to the item when the section has exactly one changed row.
	const onlyItem =
		entry.fields.length === 0 && entry.rows.length === 1 && entry.rows[0]!.status !== "removed"
			? entry.rows[0]!.itemId
			: undefined;
	return (
		<section style={staggerStyle(stagger)} className="cms-panel cms-enter min-w-0 overflow-hidden">
			<div className="flex items-center gap-2 px-4 py-3 sm:px-5">
				<h3 className="m-0 min-w-0 flex-1">
					<button
						type="button"
						aria-expanded={open}
						aria-controls={bodyId}
						onClick={onToggle}
						className="cms-press cms-inset-focus group flex min-h-11 w-full min-w-0 items-center gap-3 rounded-[12px] text-left"
					>
						<span className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] text-primary-text">
							<SectionIcon id={entry.section.id} className="size-4" />
						</span>
						<span className="grid min-w-0 flex-1 gap-0.5">
							<span className="truncate text-[15px] font-semibold tracking-[-0.012em] text-foreground">
								{entry.section.label}
							</span>
							{showSummary ? (
								<span className="truncate text-[12.5px] text-muted-foreground tabular-nums">
									{sectionSummary(entry)}
								</span>
							) : null}
						</span>
						<span className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors duration-150 group-hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] group-hover:text-foreground">
							<ChevronIcon open={open} />
						</span>
					</button>
				</h3>

				{showEditLinks ? (
					<Link
						to="/cms/content/$section"
						params={{ section: entry.section.id }}
						search={onlyItem ? { item: onlyItem } : {}}
						className="cms-press cms-page-focus inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-line bg-surface-solid px-3 text-[12.5px] font-medium text-ink-soft no-underline hover:border-line-strong hover:text-foreground pointer-coarse:min-h-11"
					>
						<span>Edit</span>
						<span className="sr-only"> {entry.section.label}</span>
					</Link>
				) : null}
			</div>

			<AnimatePresence initial={false}>
				{open ? (
					// Height animates both ways so collapse mirrors expand; the clip
					// keeps the body from spilling while it closes.
					<motion.div
						key="body"
						id={bodyId}
						initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
						animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
						exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
						transition={
							reduced
								? REDUCED
								: { ...SPRING_MOVE, opacity: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } }
						}
						className="overflow-hidden"
					>
						<div className="grid divide-y divide-line border-t border-line px-4 py-4 sm:px-5">
							{entry.fields.map((field) => (
								<FieldDiffRow
									key={field.path}
									field={field}
									beforeLabel={beforeLabel}
									afterLabel={afterLabel}
									onRevertField={onRevertField}
								/>
							))}
							{entry.rows.map((row) => (
								<RowDiffBlock
									key={`${row.status}-${row.id}`}
									sectionId={entry.section.id}
									row={row}
									beforeLabel={beforeLabel}
									afterLabel={afterLabel}
									onRevertField={onRevertField}
									showEditLinks={showEditLinks}
								/>
							))}
						</div>
					</motion.div>
				) : null}
			</AnimatePresence>
		</section>
	);
}

export function DiffView({
	diff,
	beforeLabel = "Live",
	afterLabel = "Draft",
	onRevertField,
	showEditLinks = true,
	showUnchanged = true,
	emptyTitle = "Live is up to date",
	emptyDescription = "Every section in the draft matches what visitors see right now.",
	emptyAction,
}: DiffViewProps) {
	const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => new Set());
	const [unchangedOpen, setUnchangedOpen] = useState(false);

	if (diff.changedSections.length === 0) {
		return (
			<div className="cms-panel cms-enter">
				<EmptyState
					tone="success"
					icon={<CheckCircleIcon className="size-5" />}
					title={emptyTitle}
					description={emptyDescription}
					action={emptyAction}
				/>
			</div>
		);
	}

	const allCollapsed = diff.changedSections.every((entry) => collapsedIds.has(entry.section.id));

	const toggleSection = (sectionId: string) => {
		setCollapsedIds((prev) => {
			const next = new Set(prev);
			if (next.has(sectionId)) next.delete(sectionId);
			else next.add(sectionId);
			return next;
		});
	};

	const toggleAll = () => {
		if (allCollapsed) {
			setCollapsedIds(new Set());
		} else {
			setCollapsedIds(new Set(diff.changedSections.map((entry) => entry.section.id)));
		}
	};

	return (
		<div className="grid gap-4">
			{diff.changedSections.length > 1 ? (
				<div className="flex flex-wrap items-center justify-end gap-2 px-0.5">
					<button
						type="button"
						onClick={toggleAll}
						className="cms-press cms-page-focus inline-flex min-h-9 items-center rounded-full px-3 text-[12.5px] font-medium text-ink-soft hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] hover:text-foreground pointer-coarse:min-h-11"
					>
						{allCollapsed ? "Expand all" : "Collapse all"}
					</button>
				</div>
			) : null}

			{diff.changedSections.map((entry, idx) => (
				<SectionDiffCard
					key={entry.section.id}
					entry={entry}
					open={!collapsedIds.has(entry.section.id)}
					onToggle={() => toggleSection(entry.section.id)}
					beforeLabel={beforeLabel}
					afterLabel={afterLabel}
					onRevertField={onRevertField}
					showEditLinks={showEditLinks}
					showSummary={diff.changedSections.length > 1}
					stagger={Math.min(idx, 6)}
				/>
			))}

			{showUnchanged && diff.unchangedSections.length > 0 ? (
				<div className="rounded-[14px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2%,transparent)]">
					<button
						type="button"
						aria-expanded={unchangedOpen}
						onClick={() => setUnchangedOpen((open) => !open)}
						className="cms-press cms-page-focus flex min-h-11 w-full items-center justify-between gap-3 rounded-[13px] px-4 py-2.5 text-left text-[13px] font-medium text-muted-foreground hover:text-foreground"
					>
						<span className="flex items-center gap-2">
							<CheckCircleIcon className="size-3.5 text-success" />
							<span>
								{`${diff.unchangedSections.length} unchanged ${diff.unchangedSections.length === 1 ? "section" : "sections"}`}
							</span>
						</span>
						<ChevronIcon open={unchangedOpen} />
					</button>
					{unchangedOpen ? (
						<ul className="cms-collapse-panel m-0 grid list-none gap-1 border-t border-line p-2 sm:grid-cols-2 md:grid-cols-3">
							{diff.unchangedSections.map(({ section }) => (
								<li key={section.id}>
									{showEditLinks ? (
										<Link
											to="/cms/content/$section"
											params={{ section: section.id }}
											className="cms-press cms-page-focus flex min-h-9 items-center justify-between gap-2 rounded-[9px] px-2.5 text-[13px] text-ink-soft no-underline hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] hover:text-foreground pointer-coarse:min-h-11"
										>
											<span className="flex items-center gap-2 truncate">
												<SectionIcon id={section.id} className="size-3.5 text-muted-foreground" />
												<span className="truncate">{section.label}</span>
											</span>
											<span aria-hidden="true" className="text-[12px] text-muted-foreground">
												→
											</span>
										</Link>
									) : (
										<span className="flex min-h-9 items-center gap-2 px-2.5 text-[13px] text-muted-foreground">
											<SectionIcon id={section.id} className="size-3.5" />
											<span>{section.label}</span>
										</span>
									)}
								</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}
		</div>
	);
}
