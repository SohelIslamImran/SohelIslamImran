/**
 * Revision history page (`/cms/history`, served at `/history` on the CMS host).
 * A quiet revision timeline on the left and an inspector on the right that
 * diffs the selected revision against the current draft and restores it.
 * Revision details are cached by id, so switching rows never flashes a
 * skeleton; below `lg` selecting a row scrolls the inspector into view.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveReducedMotion } from "../../components/cms/shell/use-live-reduced-motion";
import { createFileRoute } from "@tanstack/react-router";
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
import { jsonEqual } from "../../components/cms/draft/paths";
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
import { getRevision, listRevisions } from "../../server/cms-history.functions";
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
): RevisionSummary[] {
	if (filter !== "all") return [...items];
	const published = new Map(
		items.filter((row) => row.kind === "published").map((row) => [row.revision, row.bytes]),
	);
	return items.filter((row) => row.kind !== "draft" || published.get(row.revision) !== row.bytes);
}

export const Route = createFileRoute("/cms/history")({
	validateSearch: z.object({
		revision: z.coerce.number().int().nonnegative().optional(),
	}),
	head: () => ({
		meta: [{ title: "Revision history · Control plane" }],
	}),
	component: HistoryRoute,
});

function HistoryRoute() {
	const reduced = useLiveReducedMotion();
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
	const listRequest = useRef(0);

	const [selectedId, setSelectedId] = useState<number | null>(null);
	const detailCache = useRef(new Map<number, RevisionDetail>());
	const [detail, setDetail] = useState<RevisionDetail | null>(null);
	const [detailError, setDetailError] = useState<string | null>(null);
	const inspectorRef = useRef<HTMLElement>(null);

	const [restoreOpen, setRestoreOpen] = useState(false);
	const [restoreReview, setRestoreReview] = useState<typeof draft | null>(null);
	const [restoring, setRestoring] = useState(false);
	const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
	const noticeRef = useRef<HTMLDivElement>(null);
	const restoredRef = useRef(false);

	const visibleItems = useMemo(() => visibleRevisions(items, filter), [filter, items]);

	const baselineBytes = useMemo(() => {
		const match = items.find((row) => row.kind === "draft" && row.revision === draftRevision);
		return match ? match.bytes : null;
	}, [items, draftRevision]);

	const loadDetail = useCallback(
		async (id: number) => {
			const cached = detailCache.current.get(id);
			if (cached) return cached;
			const loaded = await fetchDetail({ data: { id } });
			detailCache.current.set(id, loaded);
			return loaded;
		},
		[fetchDetail],
	);

	const loadInitial = useCallback(
		async (kindFilter: "all" | RevisionKind) => {
			const request = ++listRequest.current;
			setLoadingList(true);
			setListError(null);
			try {
				const result = await fetchList({
					data: { kind: kindFilter === "all" ? undefined : kindFilter, limit: 30 },
				});
				if (request !== listRequest.current) return;
				setItems(result.items);
				setNextBefore(result.nextBefore);

				const matching =
					result.items.find((row) => row.revision === searchRevision && row.kind === "published") ??
					result.items.find((row) => row.revision === searchRevision);
				if (matching || result.items.length === 0) {
					setSelectedId(matching?.id ?? null);
					return;
				}

				const current = store.getState();
				const visible = visibleRevisions(result.items, kindFilter);
				let defaultId = (visible[0] ?? result.items[0]!).id;
				for (const row of visible) {
					if (!current.dirty && row.revision === current.draftRevision) continue;
					try {
						const candidate = await loadDetail(row.id);
						if (request !== listRequest.current) return;
						if (jsonEqual(current.draft, candidate.content)) continue;
					} catch {
						// Let the inspector report an unreadable revision if it is selected.
					}
					defaultId = row.id;
					break;
				}
				if (request === listRequest.current) {
					setSelectedId((prev) => {
						if (visible.some((row) => row.id === prev)) return prev;
						// A draft hidden behind its identical published row selects that row.
						const hidden = result.items.find((row) => row.id === prev);
						const merged = hidden
							? visible.find((row) => row.kind === "published" && row.revision === hidden.revision)
							: undefined;
						return merged?.id ?? defaultId;
					});
				}
			} catch {
				if (request === listRequest.current) setListError("Could not load revision history.");
			} finally {
				if (request === listRequest.current) setLoadingList(false);
			}
		},
		[fetchList, loadDetail, searchRevision, store],
	);

	useEffect(() => {
		void loadInitial(filter);
	}, [filter, loadInitial]);

	useEffect(() => {
		if (selectedId === null) {
			setDetail(null);
			return;
		}
		setDetailError(null);
		const cached = detailCache.current.get(selectedId);
		if (cached) {
			setDetail(cached);
			return;
		}
		let cancelled = false;
		void loadDetail(selectedId)
			.then((loaded) => {
				if (!cancelled) setDetail(loaded);
			})
			.catch(() => {
				if (!cancelled) {
					setDetail(null);
					setDetailError("Could not read this revision.");
				}
			});
		return () => {
			cancelled = true;
		};
	}, [loadDetail, selectedId]);

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
		} catch {
			if (request === listRequest.current) setListError("Could not load older revisions.");
		} finally {
			setLoadingMore(false);
		}
	};

	const selectRevision = (id: number) => {
		setSelectedId(id);
		// Below the two-column layout the inspector sits under the timeline.
		if (window.matchMedia("(max-width: 1023.98px)").matches) {
			requestAnimationFrame(() =>
				inspectorRef.current?.scrollIntoView({
					behavior: reduced ? "auto" : "smooth",
					block: "start",
				}),
			);
		}
	};

	const diff = useMemo(() => {
		if (!detail) return null;
		return diffPortfolioDocuments(draft, detail.content);
	}, [detail, draft]);
	const stale = detail !== null && selectedId !== null && detail.id !== selectedId;

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
					aria-label="Revisions"
					style={staggerStyle(0)}
					className="cms-panel cms-enter grid gap-2 p-3"
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
											onSelect={() => selectRevision(item.id)}
										/>
									))}
								</ul>
							</div>
							{nextBefore !== null ? (
								<Button
									variant="ghost"
									size="sm"
									disabled={loadingList || loadingMore}
									onClick={() => void loadMore()}
									className="w-full pointer-coarse:min-h-11"
								>
									{loadingMore ? "Loading…" : "Load older revisions"}
								</Button>
							) : null}
						</>
					)}
				</section>

				<section
					ref={inspectorRef}
					aria-label="Selected revision"
					className="grid min-w-0 scroll-mt-20 gap-4"
				>
					{detailError ? (
						<InspectorError message={detailError} />
					) : detail && diff ? (
						<RevisionInspector
							detail={detail}
							diff={diff}
							stale={stale}
							baselineBytes={baselineBytes}
							restoring={restoring}
							onRestore={() => {
								restoredRef.current = false;
								setRestoreReview(draft);
								setRestoreOpen(true);
							}}
						/>
					) : selectedId !== null || loadingList ? (
						<InspectorSkeleton />
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
