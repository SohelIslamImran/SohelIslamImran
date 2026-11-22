/**
 * Revision history page (`/cms/history`, served at `/history` on the CMS host).
 * Shows the revision timeline (draft + published) with live/draft markers,
 * hover preview, smooth detail expansion, diff against current draft, and
 * restore with clear consequence copy.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { z } from "zod";
import {
	EmptyState,
	PageHeader,
	SegmentedControl,
	controlClass,
	staggerStyle,
} from "../../components/cms/analytics/Widgets";
import { useDraftSelector, useDraftStore } from "../../components/cms/draft/context";
import { REDUCED, SPRING_MOVE, SPRING_SNAPPY } from "../../components/cms/motion";
import { diffPortfolioDocuments } from "../../components/cms/release/diff";
import { DiffView } from "../../components/cms/release/DiffView";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	HistoryIcon,
} from "../../components/cms/shell/cms-icons";
import { formatBytes, formatUtcTimestamp, useRelativeTime } from "../../components/cms/shell/time";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { getRevision, listRevisions } from "../../server/cms-history.functions";
import type {
	RevisionDetail,
	RevisionKind,
	RevisionSummary,
} from "../../server/cms-storage.server";

export const Route = createFileRoute("/cms/history")({
	validateSearch: z.object({
		revision: z.coerce.number().int().nonnegative().optional(),
	}),
	head: () => ({
		meta: [{ title: "Revision history · Control plane" }],
	}),
	component: HistoryRoute,
});

function formatByteDelta(delta: number): string {
	if (delta === 0) return "Same size";
	const prefix = delta > 0 ? "+" : "−";
	return `${prefix}${formatBytes(Math.abs(delta))}`;
}

function RevisionRow({
	item,
	selected,
	highlighted,
	isCurrentLive,
	isCurrentDraft,
	baselineBytes,
	stagger,
	onSelect,
}: {
	item: RevisionSummary;
	selected: boolean;
	highlighted: boolean;
	isCurrentLive: boolean;
	isCurrentDraft: boolean;
	baselineBytes: number | null;
	stagger: number;
	onSelect: () => void;
}) {
	const reduced = useReducedMotion();
	const relative = useRelativeTime(item.changedAt, 30_000);
	const isPublished = item.kind === "published";
	const byteDelta = baselineBytes !== null ? item.bytes - baselineBytes : null;

	return (
		<li style={staggerStyle(stagger)} className="cms-enter relative pl-7">
			{/* Timeline node marker */}
			<span
				aria-hidden="true"
				className={cn(
					"absolute top-4 left-[5px] z-[1] grid size-3 place-items-center rounded-full border-2 transition-transform duration-150",
					isCurrentLive
						? "border-success bg-success shadow-[0_0_0_3px_color-mix(in_srgb,var(--theme-success)_22%,transparent)]"
						: isPublished
							? "border-success bg-surface-solid"
							: isCurrentDraft
								? "border-primary bg-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--theme-accent)_22%,transparent)]"
								: "border-line-strong bg-surface-solid",
					selected && "scale-110",
				)}
			/>
			<button
				type="button"
				aria-current={selected ? "true" : undefined}
				onClick={onSelect}
				className={cn(
					"cms-press cms-page-focus group relative grid w-full gap-1.5 rounded-[12px] border p-3 text-left transition-colors duration-150 pointer-coarse:min-h-11",
					selected
						? "border-transparent"
						: highlighted
							? "border-line-strong bg-surface-raised"
							: "border-line bg-surface-solid hover:border-line-strong hover:bg-surface-raised",
				)}
			>
				{selected ? (
					<motion.span
						layoutId="cms-history-active-row"
						aria-hidden="true"
						transition={reduced ? REDUCED : SPRING_MOVE}
						className="pointer-events-none absolute inset-0 rounded-[12px] border border-primary-line bg-primary-soft/60 shadow-[0_2px_10px_-4px_var(--theme-accent-shadow)]"
					/>
				) : null}

				<div className="relative z-[1] flex flex-wrap items-center justify-between gap-2">
					<span className="flex flex-wrap items-center gap-1.5">
						<span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
							r{item.revision}
						</span>
						<span
							className={cn(
								"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-medium",
								isCurrentLive
									? "border-success/40 bg-success/12 text-success"
									: isPublished
										? "border-success/30 bg-success/8 text-success"
										: isCurrentDraft
											? "border-primary-line bg-primary-soft text-primary-text"
											: "border-line-strong bg-muted text-ink-soft",
							)}
						>
							<span aria-hidden="true">
								{isCurrentLive ? "●" : isPublished ? "✓" : isCurrentDraft ? "◆" : "○"}
							</span>
							<span>
								{isCurrentLive
									? "Live now"
									: isPublished
										? "Published"
										: isCurrentDraft
											? "Current draft"
											: "Draft"}
							</span>
						</span>
					</span>
					<span className="font-mono text-[11px] tabular-nums text-muted-foreground">
						{formatBytes(item.bytes)}
					</span>
				</div>

				<div className="relative z-[1] flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
					<span className="truncate">{item.changedBy}</span>
					<time dateTime={item.changedAt} title={formatUtcTimestamp(item.changedAt)}>
						{relative ?? formatUtcTimestamp(item.changedAt)}
					</time>
				</div>

				{/* Hover preview row — smoothly fades in without layout shift */}
				<div
					className={cn(
						"relative z-[1] flex items-center justify-between gap-2 border-t border-line/60 pt-1.5 font-mono text-[10.5px] text-muted-foreground transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100",
						selected ? "opacity-100" : "opacity-75",
					)}
				>
					<span className="truncate tabular-nums">
						{byteDelta !== null
							? byteDelta === 0
								? "Same size as draft"
								: `${formatByteDelta(byteDelta)} vs draft`
							: formatUtcTimestamp(item.changedAt)}
					</span>
					<span
						className={cn(
							"shrink-0",
							selected ? "text-primary-text" : "group-hover:text-foreground",
						)}
					>
						{selected ? "Inspecting" : "Preview diff →"}
					</span>
				</div>
			</button>
		</li>
	);
}

function HistoryRoute() {
	const reduced = useReducedMotion();
	const { revision: searchRevision } = Route.useSearch();
	const store = useDraftStore();
	const draft = useDraftSelector((state) => state.draft);
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);

	const fetchList = useServerFn(listRevisions);
	const fetchDetail = useServerFn(getRevision);

	const [filter, setFilter] = useState<"all" | RevisionKind>("all");
	const [items, setItems] = useState<RevisionSummary[]>([]);
	const [nextBefore, setNextBefore] = useState<number | null>(null);
	const [loadingList, setLoadingList] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [listError, setListError] = useState<string | null>(null);

	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [detail, setDetail] = useState<RevisionDetail | null>(null);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [detailError, setDetailError] = useState<string | null>(null);
	const [metaOpen, setMetaOpen] = useState(false);

	const [restoreReview, setRestoreReview] = useState<typeof draft | null>(null);
	const [restoring, setRestoring] = useState(false);
	const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

	const baselineBytes = useMemo(() => {
		const match = items.find((row) => row.kind === "draft" && row.revision === draftRevision);
		return match ? match.bytes : null;
	}, [items, draftRevision]);

	const loadInitial = useCallback(
		async (kindFilter: "all" | RevisionKind) => {
			setLoadingList(true);
			setListError(null);
			try {
				const result = await fetchList({
					data: { kind: kindFilter === "all" ? undefined : kindFilter, limit: 30 },
				});
				setItems(result.items);
				setNextBefore(result.nextBefore);
				if (result.items.length > 0) {
					const matching =
						searchRevision !== undefined
							? result.items.find((row) => row.revision === searchRevision)
							: undefined;
					setSelectedId((prev) => {
						if (matching) return matching.id;
						if (prev && result.items.some((row) => row.id === prev)) return prev;
						return result.items[0]!.id;
					});
				} else {
					setSelectedId(null);
					setDetail(null);
				}
			} catch {
				setListError("Could not load revision history.");
			} finally {
				setLoadingList(false);
			}
		},
		[fetchList, searchRevision],
	);

	useEffect(() => {
		void loadInitial(filter);
	}, [filter, loadInitial]);

	useEffect(() => {
		if (selectedId === null) {
			setDetail(null);
			return;
		}
		let cancelled = false;
		setLoadingDetail(true);
		setDetailError(null);
		void fetchDetail({ data: { id: selectedId } })
			.then((loaded) => {
				if (!cancelled) setDetail(loaded);
			})
			.catch(() => {
				if (!cancelled) {
					setDetail(null);
					setDetailError("Could not read this revision.");
				}
			})
			.finally(() => {
				if (!cancelled) setLoadingDetail(false);
			});
		return () => {
			cancelled = true;
		};
	}, [fetchDetail, selectedId]);

	const loadMore = async () => {
		if (nextBefore === null || loadingMore) return;
		setLoadingMore(true);
		try {
			const result = await fetchList({
				data: {
					kind: filter === "all" ? undefined : filter,
					limit: 30,
					before: nextBefore,
				},
			});
			setItems((prev) => [...prev, ...result.items]);
			setNextBefore(result.nextBefore);
		} catch {
			setListError("Could not load older revisions.");
		} finally {
			setLoadingMore(false);
		}
	};

	const diff = useMemo(() => {
		if (!detail) return null;
		return diffPortfolioDocuments(draft, detail.content);
	}, [detail, draft]);

	const handleRestore = async () => {
		if (!detail || !restoreReview) return;
		setRestoring(true);
		setNotice(null);
		const ok = await store.restore(detail.id, restoreReview);
		setRestoring(false);
		setRestoreReview(null);
		const state = store.getState();
		if (ok) {
			setNotice({
				tone: "ok",
				text: `Restored ${detail.kind} r${detail.revision} into Draft r${state.draftRevision}. Publish when ready to go live.`,
			});
			void loadInitial(filter);
		} else if (state.error) {
			setNotice({ tone: "error", text: state.error });
		}
	};

	return (
		<div className="grid min-w-0 max-w-[1160px] grid-cols-1 gap-6">
			<PageHeader
				eyebrow="Release · Revision timeline"
				title="Revision history"
				description={`Inspect any saved draft or published snapshot against your current Draft r${draftRevision}, and restore into a new draft revision.`}
				actions={
					<SegmentedControl
						layoutId="cms-history-filter-pill"
						ariaLabel="Filter revisions"
						value={filter}
						onChange={setFilter}
						options={[
							{ value: "all", label: "All" },
							{ value: "published", label: "Published" },
							{ value: "draft", label: "Drafts" },
						]}
					/>
				}
			/>

			{notice ? (
				<div
					role="status"
					className={cn(
						"cms-enter flex items-center justify-between gap-3 rounded-[12px] border px-4 py-2.5 text-[13px]",
						notice.tone === "ok"
							? "border-success/35 bg-success/10 text-success"
							: "border-destructive/35 bg-destructive/10 text-destructive",
					)}
				>
					<span className="flex items-center gap-2">
						{notice.tone === "ok" ? (
							<CheckCircleIcon className="size-4 shrink-0" />
						) : (
							<AlertTriangleIcon className="size-4 shrink-0" />
						)}
						<span>{notice.text}</span>
					</span>
					<button
						type="button"
						onClick={() => setNotice(null)}
						className="cms-page-focus rounded-full px-2 py-1 font-mono text-[11px] opacity-80 hover:opacity-100"
					>
						Dismiss
					</button>
				</div>
			) : null}

			<div className="grid min-w-0 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
				{/* Left Timeline */}
				<section
					aria-label="Revisions"
					style={staggerStyle(0)}
					className="cms-panel cms-enter grid gap-3 p-4"
				>
					<div className="flex items-center justify-between gap-2 px-1">
						<span className="mono-label text-[10.5px] text-muted-foreground">Timeline</span>
						<span className="font-mono text-[11px] tabular-nums text-muted-foreground">
							{loadingList ? "Loading…" : `${items.length} shown`}
						</span>
					</div>

					{listError ? (
						<EmptyState
							icon={<AlertTriangleIcon className="size-4 text-destructive" />}
							title="Could not load timeline"
							description={listError}
							action={
								<button
									type="button"
									className={controlClass}
									onClick={() => void loadInitial(filter)}
								>
									Retry
								</button>
							}
							className="py-6"
						/>
					) : loadingList ? (
						<div className="grid gap-2.5">
							{[0, 1, 2, 3].map((slot) => (
								<div key={slot} className="cms-skeleton h-20 w-full rounded-[12px]" />
							))}
						</div>
					) : items.length === 0 ? (
						<EmptyState
							icon={<HistoryIcon className="size-4" />}
							title="No revisions here"
							description="No snapshots match this filter yet."
							action={
								filter !== "all" ? (
									<button type="button" className={controlClass} onClick={() => setFilter("all")}>
										Show all revisions
									</button>
								) : undefined
							}
							className="py-8"
						/>
					) : (
						<>
							<div className="relative">
								<span
									aria-hidden="true"
									className="absolute top-4 bottom-4 left-[10px] w-px bg-line-strong"
								/>
								<ul className="m-0 grid list-none gap-2 p-0">
									{items.map((item, idx) => (
										<RevisionRow
											key={item.id}
											item={item}
											selected={item.id === selectedId}
											highlighted={searchRevision === item.revision}
											isCurrentLive={
												item.kind === "published" && item.revision === publishedRevision
											}
											isCurrentDraft={item.kind === "draft" && item.revision === draftRevision}
											baselineBytes={baselineBytes}
											stagger={Math.min(idx, 8)}
											onSelect={() => setSelectedId(item.id)}
										/>
									))}
								</ul>
							</div>
							{nextBefore !== null ? (
								<Button
									variant="outline"
									size="sm"
									disabled={loadingMore}
									onClick={() => void loadMore()}
									className="w-full pointer-coarse:min-h-11"
								>
									{loadingMore ? "Loading…" : "Load older revisions"}
								</Button>
							) : null}
						</>
					)}
				</section>

				{/* Right Revision Inspector with smooth expand & transitions */}
				<section aria-label="Revision diff" className="grid min-w-0 gap-4">
					{loadingDetail ? (
						<div className="cms-panel grid gap-4 p-5">
							<div className="flex items-center justify-between gap-3">
								<div className="grid gap-2">
									<div className="cms-skeleton h-4 w-44" />
									<div className="cms-skeleton h-3.5 w-64" />
								</div>
								<div className="cms-skeleton h-9 w-36 rounded-full" />
							</div>
							<div className="cms-skeleton h-44 w-full rounded-[12px]" />
						</div>
					) : detailError ? (
						<div className="cms-panel">
							<EmptyState
								icon={<AlertTriangleIcon className="size-4 text-destructive" />}
								title="Revision unavailable"
								description={detailError}
							/>
						</div>
					) : detail && diff ? (
						<AnimatePresence mode="wait" initial={false}>
							<motion.div
								key={detail.id}
								initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
								animate={{ opacity: 1, y: 0 }}
								exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
								transition={reduced ? REDUCED : SPRING_SNAPPY}
								className="grid min-w-0 gap-4"
							>
								<div className="cms-panel overflow-hidden">
									<div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
										<div className="grid min-w-0 gap-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="mono-label text-[11px] text-primary-text">
													{detail.kind === "published" ? "Published snapshot" : "Draft snapshot"} ·
													r{detail.revision}
												</span>
												<span className="inline-flex items-center rounded-full border border-line bg-muted px-2 py-0.5 font-mono text-[10.5px] tabular-nums text-muted-foreground">
													{formatBytes(detail.bytes)}
												</span>
											</div>
											<p className="m-0 text-[13.5px] text-muted-foreground">
												Saved{" "}
												<time dateTime={detail.changedAt}>
													{formatUtcTimestamp(detail.changedAt)}
												</time>{" "}
												by <span className="text-foreground">{detail.changedBy}</span>
											</p>
											{diff.changedSections.length > 0 ? (
												<p className="m-0 mt-0.5 text-[12px] text-muted-foreground">
													Restoring writes a new draft revision ({diff.changedSections.length}{" "}
													{diff.changedSections.length === 1 ? "section" : "sections"} changed) —
													Live r{publishedRevision} stays untouched until you publish.
												</p>
											) : null}
										</div>

										<div className="flex flex-wrap items-center gap-2">
											<button
												type="button"
												aria-expanded={metaOpen}
												onClick={() => setMetaOpen((open) => !open)}
												className={controlClass}
											>
												<span>{metaOpen ? "Hide details" : "Details"}</span>
												<svg
													viewBox="0 0 16 16"
													aria-hidden="true"
													className={cn(
														"size-3.5 fill-none stroke-current stroke-[1.7] transition-transform duration-200 ease-trace [stroke-linecap:round] [stroke-linejoin:round]",
														metaOpen && "rotate-180",
													)}
												>
													<path d="m4 6 4 4 4-4" />
												</svg>
											</button>
											<Button
												variant="default"
												size="sm"
												disabled={diff.changedSections.length === 0 || restoring}
												onClick={() => setRestoreReview(draft)}
												className="pointer-coarse:min-h-11"
											>
												<HistoryIcon className="size-3.5" />
												<span>Restore as draft</span>
											</Button>
										</div>
									</div>

									{/* Smoothly expandable snapshot metadata */}
									{metaOpen ? (
										<dl className="cms-collapse-panel m-0 grid grid-cols-2 gap-3 border-t border-line bg-[color-mix(in_srgb,var(--theme-ink)_2%,transparent)] px-4 py-3.5 text-[12.5px] sm:grid-cols-4 sm:px-5">
											<div>
												<dt className="mono-label text-[10px] text-muted-foreground">
													Snapshot ID
												</dt>
												<dd className="m-0 mt-0.5 font-mono text-foreground">#{detail.id}</dd>
											</div>
											<div>
												<dt className="mono-label text-[10px] text-muted-foreground">Schema</dt>
												<dd className="m-0 mt-0.5 font-mono text-foreground">
													v{detail.content.schemaVersion}
												</dd>
											</div>
											<div>
												<dt className="mono-label text-[10px] text-muted-foreground">Size delta</dt>
												<dd className="m-0 mt-0.5 font-mono text-foreground">
													{baselineBytes !== null
														? formatByteDelta(detail.bytes - baselineBytes)
														: formatBytes(detail.bytes)}
												</dd>
											</div>
											<div>
												<dt className="mono-label text-[10px] text-muted-foreground">
													Diff vs draft
												</dt>
												<dd className="m-0 mt-0.5 font-mono text-foreground">
													{diff.totalChanges} {diff.totalChanges === 1 ? "change" : "changes"}
												</dd>
											</div>
										</dl>
									) : null}
								</div>

								<DiffView
									diff={diff}
									beforeLabel={`Current r${draftRevision}`}
									afterLabel={`${detail.kind === "published" ? "Published" : "Draft"} r${detail.revision}`}
									showEditLinks={false}
									emptyTitle="Matches current draft"
									emptyDescription="Restoring this revision would not change any field in your current draft."
								/>
							</motion.div>
						</AnimatePresence>
					) : (
						<div className="cms-panel">
							<EmptyState
								icon={<HistoryIcon className="size-5" />}
								title="Select a revision"
								description="Pick any draft or published snapshot from the timeline to inspect every field that differs from your current draft."
							/>
						</div>
					)}
				</section>
			</div>

			<AlertDialog.Root
				open={restoreReview !== null}
				onOpenChange={(open) => {
					if (!open) setRestoreReview(null);
				}}
			>
				<AlertDialog.Portal>
					<AlertDialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette) bg-[rgb(0_0_0/0.35)] dark:bg-[rgb(0_0_0/0.6)]" />
					<AlertDialog.Popup className="cms-dialog-popup cms-glass fixed top-1/2 left-1/2 z-(--z-palette) grid w-[min(460px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[18px] border p-5 text-foreground outline-hidden sm:p-6">
						<div className="flex items-start gap-3">
							<span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-primary-line bg-primary-soft text-primary-text">
								<HistoryIcon className="size-4" />
							</span>
							<div className="grid gap-1.5">
								<p className="mono-label m-0 text-[10.5px] text-primary-text">Restore revision</p>
								<AlertDialog.Title className="m-0 text-[17px] font-semibold tracking-[-0.015em]">
									Restore {detail?.kind} r{detail?.revision} into your draft?
								</AlertDialog.Title>
								<AlertDialog.Description className="m-0 text-[13.5px] leading-relaxed text-muted-foreground">
									This replaces Draft r{draftRevision} (including any unsaved edits) with{" "}
									{diff?.totalChanges ?? 0} {diff?.totalChanges === 1 ? "change" : "changes"} across{" "}
									{diff?.changedSections.length ?? 0}{" "}
									{diff?.changedSections.length === 1 ? "section" : "sections"}, creating a new
									draft revision. Your live site (Live r{publishedRevision}) will not change until
									you publish.
								</AlertDialog.Description>
							</div>
						</div>
						<div className="flex items-center justify-end gap-2 pt-1">
							<AlertDialog.Close
								render={<Button variant="outline" size="sm" disabled={restoring} />}
							>
								Cancel
							</AlertDialog.Close>
							<Button
								variant="default"
								size="sm"
								disabled={restoring}
								onClick={() => void handleRestore()}
							>
								{restoring ? "Restoring…" : "Restore as draft"}
							</Button>
						</div>
					</AlertDialog.Popup>
				</AlertDialog.Portal>
			</AlertDialog.Root>
		</div>
	);
}
