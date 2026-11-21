/**
 * Shared diff renderer for Release (draft vs live), History (revision vs draft),
 * and Raw JSON import preview. Pairs every state with an icon/glyph and text
 * label (never hue alone).
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { mediaHref } from "../../../lib/media";
import { cn } from "../../../lib/utils";
import {
	asMediaAsset,
	type DocumentDiff,
	type FieldDiff,
	type RowDiff,
	type RowDiffStatus,
	type SectionDiff,
} from "./diff";
import { diffWords } from "./word-diff";
import { SectionIcon } from "../shell/cms-icons";

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
}

const ROW_STATUS_STYLE: Record<RowDiffStatus, { glyph: string; label: string; className: string }> =
	{
		added: {
			glyph: "+",
			label: "Added",
			className: "border-success/35 bg-success/10 text-success",
		},
		edited: {
			glyph: "Δ",
			label: "Edited",
			className: "border-primary-line bg-primary-soft text-primary-text",
		},
		removed: {
			glyph: "−",
			label: "Removed",
			className: "border-destructive/35 bg-destructive/10 text-destructive",
		},
		reordered: {
			glyph: "↕",
			label: "Reordered",
			className: "border-line-strong bg-muted text-ink-soft",
		},
	};

function formatScalar(value: unknown): string {
	if (value === undefined || value === null || value === "") return "Empty";
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "number") return String(value);
	if (typeof value === "string") return value;
	return JSON.stringify(value);
}

function isEmptyScalar(value: unknown): boolean {
	return value === undefined || value === null || value === "";
}

function TagsDiff({ before, after }: { before: unknown; after: unknown }) {
	const left = Array.isArray(before) ? before.map(String) : [];
	const right = Array.isArray(after) ? after.map(String) : [];
	const leftSet = new Set(left);
	const rightSet = new Set(right);
	const removed = left.filter((item) => !rightSet.has(item));
	const added = right.filter((item) => !leftSet.has(item));
	const kept = right.filter((item) => leftSet.has(item));

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{removed.map((tag) => (
				<span
					key={`del-${tag}`}
					className="inline-flex items-center gap-1 rounded-full border border-dashed border-destructive/45 bg-destructive/10 px-2.5 py-0.5 text-[12px] text-destructive line-through"
				>
					<span aria-hidden="true">−</span>
					{tag}
					<span className="sr-only"> (removed)</span>
				</span>
			))}
			{added.map((tag) => (
				<span
					key={`add-${tag}`}
					className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-[12px] font-medium text-success"
				>
					<span aria-hidden="true">+</span>
					{tag}
					<span className="sr-only"> (added)</span>
				</span>
			))}
			{kept.length > 0 ? (
				<span className="font-mono text-[11px] text-muted-foreground">{kept.length} unchanged</span>
			) : null}
		</div>
	);
}

function ProseDiff({ before, after }: { before: unknown; after: unknown }) {
	const left = typeof before === "string" ? before : "";
	const right = typeof after === "string" ? after : "";
	const parts = diffWords(left, right);

	return (
		<p className="m-0 rounded-[10px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2.5%,transparent)] px-3 py-2.5 text-[13.5px] leading-[1.6] text-ink-soft whitespace-pre-wrap">
			{parts.map((part, index) => {
				if (part.kind === "same") return <span key={index}>{part.text}</span>;
				if (part.kind === "del") {
					return (
						<del
							key={index}
							className="rounded-[4px] bg-destructive/12 px-0.5 text-destructive decoration-destructive/75 line-through"
						>
							{part.text}
						</del>
					);
				}
				return (
					<ins
						key={index}
						className="rounded-[4px] bg-success/14 px-0.5 text-foreground underline decoration-success/80 decoration-2 underline-offset-2"
					>
						{part.text}
					</ins>
				);
			})}
		</p>
	);
}

function MediaCard({ value, label }: { value: unknown; label: string }) {
	const asset = asMediaAsset(value);
	const href = mediaHref(asset);
	return (
		<div className="flex min-w-0 items-center gap-2.5 rounded-[10px] border border-line bg-surface-solid p-2">
			{asset && href ? (
				<img
					src={href}
					alt={asset.alt || asset.id}
					className="size-11 shrink-0 rounded-[7px] border border-line bg-muted object-cover"
				/>
			) : (
				<span
					aria-hidden="true"
					className="grid size-11 shrink-0 place-items-center rounded-[7px] border border-dashed border-line-strong font-mono text-[11px] text-muted-foreground"
				>
					—
				</span>
			)}
			<div className="min-w-0">
				<p className="mono-label m-0 text-[10px] text-muted-foreground">{label}</p>
				<p className="m-0 truncate text-[12.5px] font-medium text-foreground">
					{asset ? asset.alt || asset.id : "None"}
				</p>
				{asset ? (
					<p className="m-0 truncate font-mono text-[11px] text-muted-foreground">{asset.id}</p>
				) : null}
			</div>
		</div>
	);
}

function MediaDiff({
	before,
	after,
	beforeLabel,
	afterLabel,
}: {
	before: unknown;
	after: unknown;
	beforeLabel: string;
	afterLabel: string;
}) {
	return (
		<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
			<MediaCard value={before} label={beforeLabel} />
			<span aria-hidden="true" className="hidden font-mono text-muted-foreground sm:inline">
				→
			</span>
			<MediaCard value={after} label={afterLabel} />
		</div>
	);
}

function ShortDiff({
	before,
	after,
	beforeLabel,
	afterLabel,
}: {
	before: unknown;
	after: unknown;
	beforeLabel: string;
	afterLabel: string;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2 text-[13px]">
			<span
				className={cn(
					"inline-flex max-w-full items-center gap-1.5 rounded-[9px] border border-dashed border-line-strong bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] px-2.5 py-1 text-muted-foreground",
					isEmptyScalar(before) && "italic",
				)}
			>
				<span className="font-mono text-[10px] uppercase tracking-[0.06em] opacity-75">
					{beforeLabel}
				</span>
				<span className="break-all line-through decoration-destructive/65">
					{formatScalar(before)}
				</span>
			</span>
			<span aria-hidden="true" className="font-mono text-[12px] text-primary-text">
				→
			</span>
			<span
				className={cn(
					"inline-flex max-w-full items-center gap-1.5 rounded-[9px] border border-primary-line bg-primary-soft px-2.5 py-1 font-medium text-foreground",
					isEmptyScalar(after) && "italic text-muted-foreground",
				)}
			>
				<span className="font-mono text-[10px] uppercase tracking-[0.06em] text-primary-text">
					{afterLabel}
				</span>
				<span className="break-all">{formatScalar(after)}</span>
			</span>
		</div>
	);
}

function ListDiff({
	before,
	after,
	beforeLabel,
	afterLabel,
}: {
	before: unknown;
	after: unknown;
	beforeLabel: string;
	afterLabel: string;
}) {
	const left = Array.isArray(before) ? before : [];
	const right = Array.isArray(after) ? after : [];
	const max = Math.max(left.length, right.length);

	const summarize = (item: unknown): string => {
		if (typeof item === "string") return item;
		if (item && typeof item === "object") {
			const rec = item as Record<string, unknown>;
			const label = rec.label ?? rec.title ?? rec.platform ?? rec.key;
			const value = rec.value ?? rec.href ?? rec.handle;
			if (typeof label === "string" && typeof value === "string") return `${label}: ${value}`;
			if (typeof label === "string") return label;
		}
		return JSON.stringify(item);
	};

	return (
		<ul className="m-0 grid list-none gap-1.5 p-0">
			{Array.from({ length: max }).map((_, index) => {
				const l = left[index];
				const r = right[index];
				if (JSON.stringify(l) === JSON.stringify(r)) return null;
				if (l === undefined) {
					return (
						<li
							key={index}
							className="flex items-start gap-2 rounded-[9px] border border-success/35 bg-success/8 px-2.5 py-1.5 text-[13px] text-foreground"
						>
							<span className="font-mono text-[11px] font-semibold text-success">+</span>
							<span className="min-w-0 break-words">{summarize(r)}</span>
						</li>
					);
				}
				if (r === undefined) {
					return (
						<li
							key={index}
							className="flex items-start gap-2 rounded-[9px] border border-dashed border-destructive/35 bg-destructive/8 px-2.5 py-1.5 text-[13px] text-destructive line-through"
						>
							<span className="font-mono text-[11px] font-semibold">−</span>
							<span className="min-w-0 break-words">{summarize(l)}</span>
						</li>
					);
				}
				if (typeof l === "string" && typeof r === "string" && (l.length >= 60 || r.length >= 60)) {
					return (
						<li key={index} className="grid gap-1">
							<span className="font-mono text-[11px] text-muted-foreground">#{index + 1}</span>
							<ProseDiff before={l} after={r} />
						</li>
					);
				}
				return (
					<li key={index} className="grid gap-1">
						<ShortDiff
							before={summarize(l)}
							after={summarize(r)}
							beforeLabel={`${beforeLabel} #${index + 1}`}
							afterLabel={`${afterLabel} #${index + 1}`}
						/>
					</li>
				);
			})}
		</ul>
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
		<div className="grid gap-2 rounded-[12px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2%,transparent)] p-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex min-w-0 flex-wrap items-baseline gap-2">
					<span className="text-[13px] font-medium text-foreground">{field.label}</span>
					<code className="truncate font-mono text-[11px] text-muted-foreground">{field.path}</code>
				</div>
				{onRevertField && field.revertible ? (
					<button
						type="button"
						onClick={() => onRevertField(field.path)}
						className="pressable inline-flex min-h-7 items-center gap-1 rounded-full border border-line bg-surface-solid px-2.5 font-mono text-[11px] text-ink-soft hover:border-line-strong hover:text-foreground pointer-coarse:min-h-11"
					>
						<span aria-hidden="true">↺</span> Revert
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

function RowDiffCard({
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
	const meta = ROW_STATUS_STYLE[row.status];
	const movedLabel =
		row.beforeIndex !== null && row.afterIndex !== null && row.beforeIndex !== row.afterIndex
			? `#${row.beforeIndex} → #${row.afterIndex}`
			: null;

	return (
		<div className="grid gap-3 rounded-[12px] border border-line bg-surface-solid p-3.5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<span
						className={cn(
							"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium",
							meta.className,
						)}
					>
						<span aria-hidden="true">{meta.glyph}</span>
						<span>
							{meta.label}
							{row.status === "reordered" && movedLabel ? ` ${movedLabel}` : ""}
						</span>
					</span>
					{row.status === "edited" && movedLabel ? (
						<span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-muted px-2 py-0.5 font-mono text-[11px] text-ink-soft">
							<span aria-hidden="true">↕</span> Reordered {movedLabel}
						</span>
					) : null}
					<span className="min-w-0 truncate text-[14px] font-medium text-foreground">
						{row.title}
					</span>
					<code className="font-mono text-[11px] text-muted-foreground">{row.id}</code>
				</div>
				{showEditLinks && row.status !== "removed" ? (
					<Link
						to="/cms/content/$section"
						params={{ section: sectionId }}
						search={row.itemId ? { item: row.itemId } : {}}
						className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 font-mono text-[11.5px] text-primary-text no-underline hover:bg-primary-soft pointer-coarse:min-h-11"
					>
						Edit <span aria-hidden="true">→</span>
					</Link>
				) : null}
			</div>

			{row.preview ? <p className="m-0 text-[13px] text-muted-foreground">{row.preview}</p> : null}

			{row.fields.length > 0 ? (
				<div className="grid gap-2">
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

function SectionDiffCard({
	entry,
	beforeLabel,
	afterLabel,
	onRevertField,
	showEditLinks,
}: {
	entry: SectionDiff;
	beforeLabel: string;
	afterLabel: string;
	onRevertField?: (path: string) => void;
	showEditLinks: boolean;
}) {
	return (
		<section className="cms-panel grid min-w-0 gap-3.5 p-4 sm:p-5">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2.5">
					<span className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] text-primary-text">
						<SectionIcon id={entry.section.id} className="size-4" />
					</span>
					<div className="min-w-0">
						<h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
							{entry.section.label}
						</h3>
						<div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
							{entry.counts.added > 0 ? (
								<span className="text-success">+{entry.counts.added} added</span>
							) : null}
							{entry.counts.edited > 0 ? (
								<span className="text-primary-text">Δ {entry.counts.edited} edited</span>
							) : null}
							{entry.counts.removed > 0 ? (
								<span className="text-destructive">−{entry.counts.removed} removed</span>
							) : null}
							{entry.counts.reordered > 0 ? (
								<span>↕ {entry.counts.reordered} reordered</span>
							) : null}
							{entry.rows.length === 0 && entry.counts.fields > 0 ? (
								<span className="text-primary-text">
									Δ {entry.counts.fields} {entry.counts.fields === 1 ? "field" : "fields"}
								</span>
							) : null}
						</div>
					</div>
				</div>
				{showEditLinks ? (
					<Link
						to="/cms/content/$section"
						params={{ section: entry.section.id }}
						className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-surface-solid px-3 font-mono text-[11.5px] text-ink-soft no-underline hover:border-line-strong hover:text-foreground pointer-coarse:min-h-11"
					>
						Edit <span aria-hidden="true">→</span>
					</Link>
				) : null}
			</header>

			<div className="grid gap-2.5">
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
					<RowDiffCard
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
}: DiffViewProps) {
	const [unchangedOpen, setUnchangedOpen] = useState(false);

	if (diff.changedSections.length === 0) {
		return (
			<div className="cms-panel grid place-items-center gap-2 px-6 py-12 text-center">
				<span
					aria-hidden="true"
					className="grid size-10 place-items-center rounded-full border border-success/35 bg-success/10 font-mono text-[16px] text-success"
				>
					✓
				</span>
				<p className="m-0 text-[15px] font-semibold text-foreground">{emptyTitle}</p>
				<p className="m-0 max-w-[44ch] text-[13.5px] text-muted-foreground">{emptyDescription}</p>
			</div>
		);
	}

	return (
		<div className="grid gap-4">
			{diff.changedSections.map((entry) => (
				<SectionDiffCard
					key={entry.section.id}
					entry={entry}
					beforeLabel={beforeLabel}
					afterLabel={afterLabel}
					onRevertField={onRevertField}
					showEditLinks={showEditLinks}
				/>
			))}

			{showUnchanged && diff.unchangedSections.length > 0 ? (
				<div className="rounded-[14px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2%,transparent)]">
					<button
						type="button"
						aria-expanded={unchangedOpen}
						onClick={() => setUnchangedOpen((open) => !open)}
						className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-muted-foreground hover:text-foreground"
					>
						<span className="flex items-center gap-2">
							<span className="font-mono text-[11px] text-success" aria-hidden="true">
								✓
							</span>
							<span>
								{diff.unchangedSections.length} unchanged{" "}
								{diff.unchangedSections.length === 1 ? "section" : "sections"}
							</span>
						</span>
						<span className="font-mono text-[11px]">{unchangedOpen ? "Hide" : "Show"}</span>
					</button>
					{unchangedOpen ? (
						<ul className="m-0 grid list-none gap-1 border-t border-line p-2 sm:grid-cols-2 md:grid-cols-3">
							{diff.unchangedSections.map(({ section }) => (
								<li key={section.id}>
									{showEditLinks ? (
										<Link
											to="/cms/content/$section"
											params={{ section: section.id }}
											className="flex min-h-9 items-center justify-between gap-2 rounded-[9px] px-2.5 text-[13px] text-ink-soft no-underline hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] hover:text-foreground pointer-coarse:min-h-11"
										>
											<span className="flex items-center gap-2 truncate">
												<SectionIcon id={section.id} className="size-3.5 text-muted-foreground" />
												<span className="truncate">{section.label}</span>
											</span>
											<span
												aria-hidden="true"
												className="font-mono text-[11px] text-muted-foreground"
											>
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
