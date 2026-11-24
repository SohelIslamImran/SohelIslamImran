/**
 * Revision history page (`/cms/history`, served at `/history` on the CMS host).
 * A quiet revision timeline on the left and an inspector on the right that
 * diffs the selected revision against the current draft and restores it.
 * Revision details are cached by id, so switching rows never flashes a
 * skeleton. Below `lg`, selecting a row moves focus to the inspector.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLiveReducedMotion } from "../../components/cms/shell/use-live-reduced-motion";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	EmptyState,
	PageHeader,
	PageNotice,
	SegmentedControl,
	controlClass,
	pageClass,
	staggerStyle,
} from "../../components/cms/analytics/Widgets";
import { useDraftSelector, useDraftStore } from "../../components/cms/draft/context";
import {
	cacheRevision,
	defaultRevision,
	readCachedRevision,
} from "../../components/cms/history/history-select";
import {
	InspectorError,
	InspectorSkeleton,
	RestoreDialog,
	RevisionInspector,
} from "../../components/cms/history/RevisionInspector";
import { RevisionRow } from "../../components/cms/history/RevisionRow";
import { diffPortfolioDocuments } from "../../components/cms/release/diff";
import { AlertTriangleIcon, HistoryIcon } from "../../components/cms/shell/cms-icons";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { getRevision, listRevisions, resolveRevision } from "../../server/cms-history.functions";
import type {
	RevisionDetail,
	RevisionKind,
	RevisionSummary,
} from "../../server/cms-storage.server";

/**
 * Publishing copies draft rN to published rN, so "All" would list every
 * published revision twice. Show the published row and hide its identical draft.
 */
function visibleRevisions(
	items: readonly RevisionSummary[],
	filter: "all" | RevisionKind,
	selectedId?: number,
): RevisionSummary[] {
	if (filter !== "all") return [...items];
	const published = new Map(
		items.filter((row) => row.kind === "published").map((row) => [row.revision, row.bytes]),
	);
	return items.filter(
		(row) =>
			row.id === selectedId || row.kind !== "draft" || published.get(row.revision) !== row.bytes,
	);
}

export const Route = createFileRoute("/cms/history")({
	validateSearch: z.object({
		id: z.number().int().positive().optional().catch(undefined),
		kind: z.enum(["draft", "published"]).optional().catch(undefined),
		revision: z.number().int().nonnegative().optional().catch(undefined),
	}),
	head: () => ({
		meta: [{ title: "Revision history · Control plane" }],
	}),
	component: HistoryRoute,
});

function HistoryRoute() {
	const reduced = useLiveReducedMotion();
	const { id, kind, revision } = Route.useSearch();
	const navigate = Route.useNavigate();
	const hasTarget = id !== undefined || revision !== undefined;
	const targetKey = id !== undefined ? `id:${id}` : `${kind ?? ""}:${revision}`;
	const resolve = useServerFn(resolveRevision);
	const [target, setTarget] = useState<{
		key: string;
		row: RevisionSummary | null;
		error?: boolean;
	}>();
	const [targetRetry, setTargetRetry] = useState(0);
	const pickedRow = useRef<RevisionSummary | null>(null);
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
	const listRequest = useRef(0);

	const [pageError, setPageError] = useState(false);
	const [defaultRow, setDefaultRow] = useState<RevisionSummary | null>(null);
	const selected = hasTarget ? (target?.key === targetKey ? target.row : null) : defaultRow;
	const selectedId = selected?.id ?? null;
	const targetLoading = hasTarget && target?.key !== targetKey;
	const detailCache = useRef(new Map<number, RevisionDetail>());
	const [detail, setDetail] = useState<RevisionDetail | null>(null);
	const [failedDetailId, setFailedDetailId] = useState<number | null>(null);
	const [detailRetry, setDetailRetry] = useState(0);
	const [retryingDetailId, setRetryingDetailId] = useState<number | null>(null);
	const forceDetail = useRef<number | null>(null);
	const forceHeadingFocus = useRef<number | null>(null);
	const detailError = selectedId !== null && failedDetailId === selectedId;
	const olderButton = useRef<HTMLButtonElement>(null);
	const inspectorRef = useRef<HTMLElement>(null);
	const timelineRef = useRef<HTMLElement>(null);
	const inspectorFocusRequest = useRef<number | null>(null);

	const [restoreOpen, setRestoreOpen] = useState(false);
	const [restoreReview, setRestoreReview] = useState<typeof draft | null>(null);
	const [restoring, setRestoring] = useState(false);
	const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
	const noticeRef = useRef<HTMLDivElement>(null);
	const restoredRef = useRef(false);

	const visibleItems = useMemo(
		() => visibleRevisions(items, filter, selected?.id),
		[filter, items, selected?.id],
	);

	const baselineBytes = useMemo(() => {
		const match = items.find((row) => row.kind === "draft" && row.revision === draftRevision);
		return match ? match.bytes : null;
	}, [items, draftRevision]);

	const loadInitial = useCallback(
		async (kindFilter: "all" | RevisionKind) => {
			const request = ++listRequest.current;
			setLoadingList(true);
			setLoadingMore(false);
			setListError(null);
			setPageError(false);
			try {
				const result = await fetchList({
					data: { kind: kindFilter === "all" ? undefined : kindFilter, limit: 30 },
				});
				if (request !== listRequest.current) return;
				setItems(result.items);
				setNextBefore(result.nextBefore);
				const visible = visibleRevisions(result.items, kindFilter);
				setDefaultRow(
					(previous) =>
						visible.find((row) => row.id === previous?.id) ??
						defaultRevision(visible, store.getState()),
				);
			} catch {
				if (request === listRequest.current) setListError("Could not load revision history.");
			} finally {
				if (request === listRequest.current) setLoadingList(false);
			}
		},
		[fetchList, store],
	);

	useEffect(() => {
		void loadInitial(filter);
		return () => {
			listRequest.current += 1;
		};
	}, [filter, loadInitial]);

	// The first list page and an explicit target are independent reads.
	useEffect(() => {
		if (!hasTarget) return;
		if (pickedRow.current?.id === id && pickedRow.current) {
			setTarget({ key: targetKey, row: pickedRow.current });
			pickedRow.current = null;
			return;
		}
		let cancelled = false;
		void resolve({ data: { id, kind, revision } }).then(
			(row) => {
				if (!cancelled) setTarget({ key: targetKey, row });
			},
			() => {
				if (!cancelled) setTarget({ key: targetKey, row: null, error: true });
			},
		);
		return () => {
			cancelled = true;
		};
	}, [hasTarget, id, kind, revision, resolve, targetKey, targetRetry]);

	useEffect(() => {
		if (selectedId === null) return;
		const bypass = forceDetail.current === selectedId;
		if (!bypass) setFailedDetailId(null);
		forceDetail.current = null;
		const cached = bypass ? undefined : readCachedRevision(detailCache.current, selectedId);
		if (cached) {
			setDetail(cached);
			return;
		}
		let cancelled = false;
		void fetchDetail({ data: { id: selectedId } }).then(
			(loaded) => {
				if (cancelled) return;
				cacheRevision(detailCache.current, loaded);
				setDetail(loaded);
				setFailedDetailId(null);
				setRetryingDetailId(null);
			},
			() => {
				if (cancelled) return;
				setFailedDetailId(selectedId);
				setRetryingDetailId(null);
				forceHeadingFocus.current = null;
			},
		);
		return () => {
			cancelled = true;
		};
	}, [fetchDetail, selectedId, detailRetry]);

	const loadMore = async () => {
		if (nextBefore === null || loadingList || loadingMore) return;
		const request = listRequest.current;
		setLoadingMore(true);
		try {
			const result = await fetchList({
				data: {
					kind: filter === "all" ? undefined : filter,
					limit: 30,
					before: nextBefore,
				},
			});
			if (request !== listRequest.current) return;
			setItems((prev) => [...prev, ...result.items]);
			setNextBefore(result.nextBefore);
			setPageError(false);
			if (result.nextBefore === null && document.activeElement === olderButton.current) {
				timelineRef.current?.focus({ preventScroll: true });
			}
		} catch {
			if (request === listRequest.current) setPageError(true);
		} finally {
			if (request === listRequest.current) setLoadingMore(false);
		}
	};

	const focusInspector = useCallback(() => {
		const inspector = inspectorRef.current;
		if (!inspector || !window.matchMedia("(width < 1024px)").matches) return;
		const target = inspector.querySelector<HTMLElement>("#cms-revision-heading") ?? inspector;
		target.focus({ preventScroll: true });
		inspector.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
	}, [reduced]);

	useLayoutEffect(() => {
		if (selectedId === null || inspectorFocusRequest.current !== selectedId) return;
		if (detail?.id !== selectedId && !detailError) return;
		inspectorFocusRequest.current = null;
		focusInspector();
	}, [detail?.id, detailError, focusInspector, selectedId]);

	const selectRevision = (row: RevisionSummary) => {
		const mobile = window.matchMedia("(width < 1024px)").matches;
		if (mobile) {
			if (row.id === selectedId && (detail?.id === row.id || detailError)) focusInspector();
			else inspectorFocusRequest.current = row.id;
		}
		if (id === row.id) return;
		pickedRow.current = row;
		setTarget({ key: `id:${row.id}`, row });
		void navigate({ search: { id: row.id }, replace: true, resetScroll: false });
	};

	useLayoutEffect(() => {
		if (
			selectedId !== null &&
			detail?.id === selectedId &&
			forceHeadingFocus.current === selectedId
		) {
			forceHeadingFocus.current = null;
			document.getElementById("cms-revision-heading")?.focus({ preventScroll: true });
		}
	}, [detail, selectedId]);

	const retryDetail = () => {
		setRetryingDetailId(selectedId);
		forceDetail.current = selectedId;
		forceHeadingFocus.current = selectedId;
		setDetailRetry((value) => value + 1);
	};

	const focusSelectedRow = () => {
		const row = timelineRef.current?.querySelector<HTMLButtonElement>(
			'button[aria-current="true"]',
		);
		if (!row) return;
		row.focus({ preventScroll: true });
		row.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "nearest" });
	};

	const canReturnToRow = visibleItems.some((item) => item.id === selectedId);

	const diff = useMemo(() => {
		if (!detail) return null;
		return diffPortfolioDocuments(draft, detail.content);
	}, [detail, draft]);
	const stale = detail !== null && selectedId !== null && detail.id !== selectedId;
	const missingLabel =
		id !== undefined
			? `Revision #${id}`
			: `${kind === "draft" ? "Draft" : kind === "published" ? "Published" : "Revision"} r${revision}`;

	const handleRestore = async () => {
		if (!detail || !restoreReview) return;
		setRestoring(true);
		setNotice(null);
		const ok = await store.restore(detail.id, restoreReview);
		setRestoring(false);
		setRestoreOpen(false);
		setRestoreReview(null);
		const state = store.getState();
		if (ok) {
			restoredRef.current = true;
			setNotice({
				tone: "ok",
				text: `Restored r${detail.revision} as your draft. Publish when you’re ready.`,
			});
			void loadInitial(filter);
		} else if (state.error) {
			setNotice({ tone: "error", text: state.error });
		}
	};

	return (
		<div className={pageClass}>
			<PageHeader
				title="Revision history"
				description="Compare or restore any saved revision."
				actions={
					<SegmentedControl
						className="max-sm:grid max-sm:w-full max-sm:grid-cols-3"
						layoutId={reduced ? "" : "cms-history-filter-pill"}
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
				<PageNotice
					ref={noticeRef}
					tone={notice.tone}
					text={notice.text}
					onDismiss={() => {
						setNotice(null);
						// The dismissed notice held focus; hand it to the inspector heading.
						requestAnimationFrame(() =>
							(
								document.getElementById("cms-revision-heading") ??
								document.getElementById("main-content")
							)?.focus({ preventScroll: true }),
						);
					}}
				/>
			) : null}

			<div className="grid min-w-0 items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
				<section
					ref={timelineRef}
					aria-label="Revisions"
					tabIndex={-1}
					style={staggerStyle(0)}
					className="cms-panel cms-enter grid min-w-0 gap-2 p-3"
				>
					{listError ? (
						<EmptyState
							icon={<AlertTriangleIcon className="size-4 text-destructive" />}
							title="Could not load revisions"
							description={listError}
							action={
								<button
									type="button"
									className={controlClass}
									onClick={() => void loadInitial(filter)}
								>
									Try again
								</button>
							}
							className="py-6"
						/>
					) : loadingList && items.length === 0 ? (
						<div className="grid gap-2 p-1">
							{[0, 1, 2, 3].map((slot) => (
								<div key={slot} className="cms-skeleton h-11 w-full rounded-[12px]" />
							))}
						</div>
					) : items.length === 0 ? (
						<EmptyState
							icon={<HistoryIcon className="size-4" />}
							title="No revisions here"
							description="Nothing matches this filter yet."
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
							<div
								aria-busy={loadingList || undefined}
								className={cn(
									"relative transition-opacity duration-150",
									loadingList && "opacity-60",
								)}
							>
								<span
									aria-hidden="true"
									className="absolute top-5 bottom-5 left-[10.5px] w-px bg-line-strong"
								/>
								<ul className="m-0 grid list-none gap-0.5 p-0">
									{visibleItems.map((item, idx) => (
										<RevisionRow
											key={item.id}
											item={item}
											selected={item.id === selectedId}
											isCurrentLive={
												item.kind === "published" && item.revision === publishedRevision
											}
											isCurrentDraft={item.kind === "draft" && item.revision === draftRevision}
											stagger={Math.min(idx, 8)}
											onSelect={() => selectRevision(item)}
										/>
									))}
								</ul>
							</div>
							{selected && !canReturnToRow && !loadingList ? (
								<p className="m-0 px-2 text-[13px] text-muted-foreground">
									r{selected.revision} · {selected.kind === "draft" ? "Draft" : "Published"}
									{(filter === "all" || selected.kind === filter) && nextBefore !== null
										? " is older than this list."
										: " is outside this filter."}
								</p>
							) : null}
							{pageError ? (
								<p role="status" className="m-0 px-2 text-[13px] text-destructive">
									Couldn't load older revisions.
								</p>
							) : null}
							{nextBefore !== null ? (
								<Button
									ref={olderButton}
									variant="ghost"
									size="sm"
									aria-disabled={loadingList || loadingMore}
									onClick={() => void loadMore()}
									className="w-full pointer-coarse:min-h-11"
								>
									{loadingMore ? "Loading…" : pageError ? "Retry" : "Load older"}
								</Button>
							) : null}
						</>
					)}
				</section>

				<section
					ref={inspectorRef}
					aria-label="Selected revision"
					tabIndex={-1}
					className="grid min-w-0 scroll-mt-3 gap-4"
				>
					{targetLoading ? (
						<InspectorSkeleton />
					) : hasTarget && target?.error ? (
						<InspectorError
							message="Could not find this revision."
							onRetry={() => {
								setTarget(undefined);
								setTargetRetry((value) => value + 1);
							}}
						/>
					) : hasTarget && !selected ? (
						<div className="cms-panel">
							<EmptyState
								icon={<HistoryIcon className="size-5" />}
								title={`${missingLabel} doesn't exist.`}
								description={null}
								action={
									<Link
										to="/cms/history"
										search={{}}
										replace
										resetScroll={false}
										className={controlClass}
									>
										Show latest
									</Link>
								}
							/>
						</div>
					) : detailError ? (
						<>
							<InspectorError
								message="Could not read this revision."
								onRetry={retryDetail}
								retrying={retryingDetailId === selectedId}
							/>
							{canReturnToRow ? (
								<Button
									variant="ghost"
									size="sm"
									onClick={focusSelectedRow}
									className="justify-self-start lg:hidden pointer-coarse:min-h-11"
								>
									<span aria-hidden="true">←</span> Back to revisions
								</Button>
							) : null}
						</>
					) : selected && detail && diff ? (
						<RevisionInspector
							detail={detail}
							diff={diff}
							selected={selected}
							stale={stale}
							baselineBytes={baselineBytes}
							restoring={restoring}
							onBack={canReturnToRow ? focusSelectedRow : undefined}
							onRestore={() => {
								restoredRef.current = false;
								setRestoreReview(draft);
								setRestoreOpen(true);
							}}
						/>
					) : selectedId !== null || loadingList ? (
						<InspectorSkeleton selected={selected ?? undefined} />
					) : (
						<div className="cms-panel">
							<EmptyState
								icon={<HistoryIcon className="size-5" />}
								title="Select a revision"
								description="Pick a revision to see how it differs from your current draft."
							/>
						</div>
					)}
				</section>
			</div>

			<RestoreDialog
				detail={detail}
				diff={diff}
				open={restoreOpen}
				restoring={restoring}
				finalFocus={() => (restoredRef.current ? noticeRef.current : null)}
				onCancel={() => {
					setRestoreOpen(false);
					setRestoreReview(null);
				}}
				onConfirm={() => void handleRestore()}
			/>
		</div>
	);
}
