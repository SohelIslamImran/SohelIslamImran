/**
 * Revision history page (`/cms/history`, served at `/history` on the CMS host).
 * Shows the revision timeline (draft + published), lets the owner inspect any
 * revision's diff against the current draft, and restores with confirmation.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { useCmsSession, useDraftSelector, useDraftStore } from "../../components/cms/draft/context";
import { diffPortfolioDocuments } from "../../components/cms/release/diff";
import { DiffView } from "../../components/cms/release/DiffView";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	HistoryIcon,
} from "../../components/cms/shell/cms-icons";
import { formatBytes, formatUtcTimestamp, useRelativeTime } from "../../components/cms/shell/time";
import { getRevision, listRevisions, restoreRevision } from "../../server/cms-history.functions";
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

function RevisionRow({
	item,
	selected,
	highlighted,
	onSelect,
}: {
	item: RevisionSummary;
	selected: boolean;
	highlighted: boolean;
	onSelect: () => void;
}) {
	const relative = useRelativeTime(item.changedAt, 30_000);
	const isPublished = item.kind === "published";

	return (
		<li className="relative pl-6">
			<span
				aria-hidden="true"
				className={cn(
					"absolute top-4 left-[5px] size-2.5 rounded-full border",
					isPublished ? "border-success bg-success" : "border-primary bg-surface-solid",
				)}
			/>
			<button
				type="button"
				onClick={onSelect}
				className={cn(
					"pressable grid w-full gap-1.5 rounded-[12px] border p-3 text-left transition-colors duration-150",
					selected
						? "border-primary-line bg-primary-soft/55"
						: highlighted
							? "border-line-strong bg-surface-raised"
							: "border-line bg-surface-solid hover:border-line-strong",
				)}
			>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="flex items-center gap-2">
						<span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
							r{item.revision}
						</span>
						<span
							className={cn(
								"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10.5px]",
								isPublished
									? "border-success/35 bg-success/10 text-success"
									: "border-line-strong bg-muted text-ink-soft",
							)}
						>
							<span aria-hidden="true">{isPublished ? "✓" : "○"}</span>
							<span>{isPublished ? "Published" : "Draft"}</span>
						</span>
					</span>
					<span className="font-mono text-[11px] tabular-nums text-muted-foreground">
						{formatBytes(item.bytes)}
					</span>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
					<span className="truncate">{item.changedBy}</span>
					<time dateTime={item.changedAt} title={formatUtcTimestamp(item.changedAt)}>
						{relative ?? formatUtcTimestamp(item.changedAt)}
					</time>
				</div>
			</button>
		</li>
	);
}

function HistoryRoute() {
	const { revision: searchRevision } = Route.useSearch();
	const store = useDraftStore();
	const { csrfToken } = useCmsSession();
	const draft = useDraftSelector((state) => state.draft);
	const draftRevision = useDraftSelector((state) => state.draftRevision);

	const fetchList = useServerFn(listRevisions);
	const fetchDetail = useServerFn(getRevision);
	const runRestore = useServerFn(restoreRevision);

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

	const [confirmOpen, setConfirmOpen] = useState(false);
	const [restoring, setRestoring] = useState(false);
	const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

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
		if (!detail) return;
		setRestoring(true);
		setNotice(null);
		try {
			const result = await runRestore({
				data: {
					id: detail.id,
					expectedRevision: store.getState().draftRevision,
					csrfToken,
				},
			});
			if (result.ok) {
				store.adoptSnapshot(result.snapshot);
				setConfirmOpen(false);
				setNotice({
					tone: "ok",
					text: `Restored ${detail.kind} r${detail.revision} into Draft r${result.snapshot.draftRevision}. Publish when ready to go live.`,
				});
				void loadInitial(filter);
			} else if (result.kind === "conflict") {
				store.adoptSnapshot(result.current);
				setConfirmOpen(false);
				setNotice({
					tone: "error",
					text: `Another session saved Draft r${result.current.draftRevision}. Synced your workspace — try restoring again if still needed.`,
				});
			} else {
				setConfirmOpen(false);
				setNotice({ tone: "error", text: "That revision could not be found." });
			}
		} catch {
			setNotice({ tone: "error", text: "Could not restore this revision. Check your connection." });
		} finally {
			setRestoring(false);
		}
	};

	return (
		<div className="grid max-w-[1160px] gap-6">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div className="grid gap-1.5">
					<p className="mono-label m-0 text-primary-text">Release · revision timeline</p>
					<h1 className="m-0 text-headline">Revision history</h1>
					<p className="m-0 text-[14px] text-muted-foreground">
						Inspect any saved draft or published snapshot against your current Draft r
						{draftRevision}, and restore into a new draft revision.
					</p>
				</div>

				<div
					role="group"
					aria-label="Filter revisions"
					className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-solid p-1"
				>
					{(["all", "published", "draft"] as const).map((option) => (
						<button
							key={option}
							type="button"
							aria-pressed={filter === option}
							onClick={() => setFilter(option)}
							className={cn(
								"min-h-8 rounded-full px-3 text-[12.5px] font-medium capitalize transition-colors duration-150 pointer-coarse:min-h-10",
								filter === option
									? "bg-foreground text-background"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{option}
						</button>
					))}
				</div>
			</header>

			{notice ? (
				<div
					role="status"
					className={cn(
						"flex items-center justify-between gap-3 rounded-[12px] border px-4 py-2.5 text-[13px]",
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
						className="font-mono text-[11px] opacity-80 hover:opacity-100"
					>
						Dismiss
					</button>
				</div>
			) : null}

			<div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
				{/* Left Timeline */}
				<section aria-label="Revisions" className="cms-panel grid gap-3 p-4">
					{listError ? (
						<p className="m-0 text-[13px] text-destructive">{listError}</p>
					) : loadingList ? (
						<div className="grid gap-2.5">
							{[0, 1, 2, 3].map((slot) => (
								<div key={slot} className="skeleton h-16 rounded-[12px]" />
							))}
						</div>
					) : items.length === 0 ? (
						<p className="m-0 py-6 text-center text-[13px] text-muted-foreground">
							No revisions recorded for this filter yet.
						</p>
					) : (
						<>
							<div className="relative">
								<span
									aria-hidden="true"
									className="absolute top-3 bottom-3 left-[9px] w-px bg-line-strong"
								/>
								<ul className="m-0 grid list-none gap-2 p-0">
									{items.map((item) => (
										<RevisionRow
											key={item.id}
											item={item}
											selected={item.id === selectedId}
											highlighted={searchRevision === item.revision}
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
									className="w-full"
								>
									{loadingMore ? "Loading…" : "Load older revisions"}
								</Button>
							) : null}
						</>
					)}
				</section>

				{/* Right Diff Inspector */}
				<section aria-label="Revision diff" className="grid min-w-0 gap-4">
					{loadingDetail ? (
						<div className="cms-panel grid gap-3 p-5">
							<div className="skeleton h-6 w-48 rounded-[8px]" />
							<div className="skeleton h-32 rounded-[12px]" />
						</div>
					) : detailError ? (
						<div className="cms-panel p-5 text-[13.5px] text-destructive">{detailError}</div>
					) : detail && diff ? (
						<>
							<div className="cms-panel flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
								<div className="grid gap-1">
									<div className="flex flex-wrap items-center gap-2">
										<span className="mono-label text-[11px] text-primary-text">
											{detail.kind === "published" ? "Published snapshot" : "Draft snapshot"} · r
											{detail.revision}
										</span>
										<span className="font-mono text-[11px] text-muted-foreground">
											{formatBytes(detail.bytes)}
										</span>
									</div>
									<p className="m-0 text-[13px] text-muted-foreground">
										Saved {formatUtcTimestamp(detail.changedAt)} by {detail.changedBy}
									</p>
								</div>
								<Button
									variant="default"
									size="sm"
									disabled={diff.changedSections.length === 0 || restoring}
									onClick={() => setConfirmOpen(true)}
									className="pointer-coarse:min-h-11"
								>
									<HistoryIcon className="size-3.5" />
									<span>Restore as draft</span>
								</Button>
							</div>

							<DiffView
								diff={diff}
								beforeLabel={`Current r${draftRevision}`}
								afterLabel={`${detail.kind === "published" ? "Published" : "Draft"} r${detail.revision}`}
								showEditLinks={false}
								emptyTitle="Matches current draft"
								emptyDescription="Restoring this revision would not change any field in your current draft."
							/>
						</>
					) : (
						<div className="cms-panel p-8 text-center text-[13.5px] text-muted-foreground">
							Select a revision from the timeline to inspect its changes against your current draft.
						</div>
					)}
				</section>
			</div>

			<AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialog.Portal>
					<AlertDialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette) bg-[rgb(0_0_0/0.35)] dark:bg-[rgb(0_0_0/0.6)]" />
					<AlertDialog.Popup className="cms-dialog-popup cms-glass fixed top-1/2 left-1/2 z-(--z-palette) grid w-[min(460px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[18px] border p-5 text-foreground outline-hidden sm:p-6">
						<div className="flex items-start gap-3">
							<span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-primary-line bg-primary-soft text-primary-text">
								<HistoryIcon className="size-4" />
							</span>
							<div className="grid gap-1">
								<p className="mono-label m-0 text-[10.5px] text-primary-text">Restore revision</p>
								<AlertDialog.Title className="m-0 text-[17px] font-semibold tracking-[-0.015em]">
									Restore {detail?.kind} r{detail?.revision} into your draft?
								</AlertDialog.Title>
								<AlertDialog.Description className="m-0 text-[13.5px] leading-relaxed text-muted-foreground">
									This writes a new draft revision (r{draftRevision + 1}) and upgrades older schema
									versions automatically. The live site does not change until you publish.
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
								{restoring ? "Restoring…" : "Restore revision"}
							</Button>
						</div>
					</AlertDialog.Popup>
				</AlertDialog.Portal>
			</AlertDialog.Root>
		</div>
	);
}
