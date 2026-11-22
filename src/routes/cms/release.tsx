/**
 * Release & Changes page (`/cms/release`, served at `/release` on the CMS host).
 * Shows per-section diffs against live, per-field revert, Publish with a confirm
 * step and satisfying confirmation moment, Discard draft with confirm, and a
 * Raw JSON inspect / export / import tab.
 */
import { useMemo, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Tabs } from "@base-ui/react/tabs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
	PageHeader,
	TickingNumber,
	controlClass,
	staggerStyle,
} from "../../components/cms/analytics/Widgets";
import { useDraftSelector, useDraftStore } from "../../components/cms/draft/context";
import { REDUCED, SPRING_MOVE, SPRING_SNAPPY } from "../../components/cms/motion";
import { diffPortfolioDocuments } from "../../components/cms/release/diff";
import { DiffView } from "../../components/cms/release/DiffView";
import { RawJsonTab } from "../../components/cms/release/RawJsonTab";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	DiscardIcon,
	ExternalArrowIcon,
	HistoryIcon,
	PublishIcon,
} from "../../components/cms/shell/cms-icons";
import { formatUtcTimestamp, useRelativeTime } from "../../components/cms/shell/time";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export const Route = createFileRoute("/cms/release")({
	head: () => ({
		meta: [{ title: "Changes & release · Control plane" }],
	}),
	component: ReleaseRoute,
});

function AnimatedCheckBadge() {
	const reduced = useReducedMotion();
	return (
		<span
			aria-hidden="true"
			className="grid size-9 shrink-0 place-items-center rounded-full border border-success/40 bg-success/12 text-success"
		>
			<svg
				viewBox="0 0 20 20"
				className="size-4.5 fill-none stroke-current stroke-[2] [stroke-linecap:round] [stroke-linejoin:round]"
			>
				<motion.path
					d="m5 10.5 3.2 3.2L15 7"
					initial={reduced ? { opacity: 0 } : { pathLength: 0, opacity: 0.4 }}
					animate={reduced ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
					transition={reduced ? REDUCED : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
				/>
			</svg>
		</span>
	);
}

function ReleaseRoute() {
	const reduced = useReducedMotion();
	const store = useDraftStore();

	const draft = useDraftSelector((state) => state.draft);
	const published = useDraftSelector((state) => state.published);
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);
	const publishedAt = useDraftSelector((state) => state.publishedAt);
	const dirty = useDraftSelector((state) => state.dirty);
	const ahead = useDraftSelector((state) => state.ahead);
	const issueCount = useDraftSelector((state) => state.issues.all.length);
	const conflict = useDraftSelector((state) => state.conflict !== null);
	const busy = useDraftSelector(
		(state) => state.status === "saving" || state.status === "publishing",
	);

	const [tab, setTab] = useState<"changes" | "json">("changes");
	const [reviewedDraft, setReviewedDraft] = useState<typeof draft | null>(null);
	const confirmingPublish = reviewedDraft === draft;
	const [discardReview, setDiscardReview] = useState<{
		draft: typeof draft;
		publishedRevision: number;
	} | null>(null);
	const [discarding, setDiscarding] = useState(false);
	const [publishedReceipt, setPublishedReceipt] = useState<{
		revision: number;
		publishedAt: string | null;
	} | null>(null);
	const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

	const diff = useMemo(() => diffPortfolioDocuments(published, draft), [published, draft]);
	const relativePublished = useRelativeTime(publishedAt, 30_000);

	const hasChanges = diff.changedSections.length > 0 || ahead || dirty;
	const canPublish = hasChanges && issueCount === 0 && !conflict && !busy;

	const handleConfirmPublish = async () => {
		setNotice(null);
		if (!reviewedDraft) return;
		const ok = await store.publish({ reviewedDraft });
		if (ok) {
			setReviewedDraft(null);
			const nextState = store.getState();
			setPublishedReceipt({
				revision: nextState.publishedRevision,
				publishedAt: nextState.publishedAt,
			});
		}
	};

	const handleConfirmDiscard = async () => {
		if (!discardReview) return;
		setDiscarding(true);
		setNotice(null);
		setPublishedReceipt(null);
		const ok = await store.discard(discardReview.publishedRevision, discardReview.draft);
		setDiscarding(false);
		setDiscardReview(null);
		const state = store.getState();
		if (ok) {
			setReviewedDraft(null);
			setNotice({
				tone: "ok",
				text: `Draft discarded. Reset to Live r${state.publishedRevision} as Draft r${state.draftRevision}.`,
			});
		} else if (state.error) {
			setNotice({ tone: "error", text: state.error });
		}
	};

	return (
		<div className="grid min-w-0 max-w-[1160px] grid-cols-1 gap-6">
			<PageHeader
				eyebrow={`Release · Draft r${draftRevision} vs Live r${publishedRevision}`}
				title="Changes and release"
				description="Review every field that differs from what visitors see before promoting a revision live."
				actions={
					<Tabs.Root value={tab} onValueChange={(value) => setTab(value as "changes" | "json")}>
						<Tabs.List className="cms-seg-track">
							{(
								[
									{ value: "changes", label: "Changes", badge: diff.changedSections.length },
									{ value: "json", label: "Raw JSON" },
								] as const
							).map((item) => {
								const active = tab === item.value;
								return (
									<Tabs.Tab
										key={item.value}
										value={item.value}
										data-active={active ? "true" : "false"}
										className="cms-seg-item"
									>
										{active ? (
											<motion.span
												layoutId="cms-release-tab-pill"
												aria-hidden="true"
												transition={reduced ? REDUCED : SPRING_MOVE}
												className="cms-seg-pill"
											/>
										) : null}
										{active ? (
											<span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
										) : null}
										<span>{item.label}</span>
										{"badge" in item ? (
											<span
												className={cn(
													"font-mono text-[10.5px] tabular-nums",
													active ? "text-primary-text" : "text-muted-foreground",
												)}
											>
												{item.badge}
											</span>
										) : null}
									</Tabs.Tab>
								);
							})}
						</Tabs.List>
					</Tabs.Root>
				}
			/>

			{/* Satisfying publish confirmation moment */}
			<AnimatePresence>
				{publishedReceipt ? (
					<motion.section
						key={`published-${publishedReceipt.revision}`}
						role="status"
						initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.99 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0 }}
						transition={reduced ? REDUCED : SPRING_SNAPPY}
						className="cms-panel cms-confirm-card flex flex-wrap items-center justify-between gap-4 border-success/40 bg-surface-solid p-4 sm:px-5"
					>
						<div className="flex min-w-0 items-center gap-3.5">
							<AnimatedCheckBadge />
							<div className="grid min-w-0 gap-0.5">
								<p className="m-0 text-[14.5px] font-semibold tracking-[-0.01em] text-foreground">
									Live r{publishedReceipt.revision} is now published
								</p>
								<p className="m-0 font-mono text-[11.5px] tabular-nums text-muted-foreground">
									Promoted to sohelislamimran.com ·{" "}
									{formatUtcTimestamp(publishedReceipt.publishedAt)}
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<a
								href="https://sohelislamimran.com/"
								target="_blank"
								rel="noreferrer"
								className={controlClass}
							>
								<span>View live site</span>
								<ExternalArrowIcon className="size-3.5 text-muted-foreground" />
							</a>
							<button
								type="button"
								onClick={() => setPublishedReceipt(null)}
								className="cms-press cms-page-focus inline-flex min-h-9 items-center rounded-full px-3 font-mono text-[11px] text-muted-foreground hover:text-foreground pointer-coarse:min-h-11"
							>
								Dismiss
							</button>
						</div>
					</motion.section>
				) : null}
			</AnimatePresence>

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

			{tab === "changes" ? (
				<div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_328px]">
					<div className="min-w-0">
						<DiffView
							diff={diff}
							onRevertField={(path) => store.revertAt(path)}
							emptyAction={
								<>
									<Link to="/cms/history" className={controlClass}>
										<HistoryIcon className="size-3.5 text-muted-foreground" />
										<span>View revision history</span>
									</Link>
									<Link to="/cms" className={controlClass}>
										<span>Back to overview</span>
									</Link>
								</>
							}
						/>
					</div>

					{/* Sticky Release Gate Panel — single clear primary publish CTA */}
					<aside
						style={staggerStyle(1)}
						className="cms-panel cms-enter grid gap-4 p-4 sm:p-5 xl:sticky xl:top-[76px]"
					>
						<div className="grid gap-1">
							<p className="mono-label m-0 text-[10.5px] text-muted-foreground">Release gate</p>
							<h2 className="m-0 text-[16px] font-semibold tracking-[-0.015em] text-foreground">
								{hasChanges ? (
									<>
										<TickingNumber value={diff.changedSections.length} />{" "}
										{diff.changedSections.length === 1 ? "section" : "sections"} ready
									</>
								) : (
									"Nothing to publish"
								)}
							</h2>
							<p className="m-0 font-mono text-[11.5px] tabular-nums text-muted-foreground">
								Live r{publishedRevision}
								{relativePublished ? ` · ${relativePublished}` : ""}
							</p>
						</div>

						<div className="grid gap-2 rounded-[12px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2.5%,transparent)] p-3 text-[12.5px]">
							<div className="flex items-center justify-between gap-2">
								<span className="text-muted-foreground">Validation</span>
								{issueCount === 0 ? (
									<span className="inline-flex items-center gap-1 font-mono text-[11.5px] text-success">
										<CheckCircleIcon className="size-3.5" />
										<span>Valid</span>
									</span>
								) : (
									<span className="inline-flex items-center gap-1 font-mono text-[11.5px] text-destructive">
										<AlertTriangleIcon className="size-3.5" />
										<span>
											{issueCount} {issueCount === 1 ? "issue" : "issues"}
										</span>
									</span>
								)}
							</div>
							<div className="flex items-center justify-between gap-2">
								<span className="text-muted-foreground">Changes</span>
								<span className="font-mono text-[11.5px] tabular-nums text-foreground">
									<TickingNumber value={diff.totalChanges} />{" "}
									{diff.totalChanges === 1 ? "field" : "fields"}
								</span>
							</div>
							<div className="flex items-center justify-between gap-2">
								<span className="text-muted-foreground">Draft revision</span>
								<span className="font-mono text-[11.5px] tabular-nums text-foreground">
									r{draftRevision} {dirty ? "(unsaved)" : "(saved)"}
								</span>
							</div>
							<div className="flex items-center justify-between gap-2">
								<span className="text-muted-foreground">Last published</span>
								<span className="font-mono text-[11px] tabular-nums text-muted-foreground">
									{formatUtcTimestamp(publishedAt)}
								</span>
							</div>
						</div>

						{/* Single clear primary Publish CTA with smooth inline confirm */}
						<AnimatePresence mode="wait" initial={false}>
							{confirmingPublish ? (
								<motion.div
									key="confirm"
									initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
									animate={{ opacity: 1, y: 0 }}
									exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
									transition={reduced ? REDUCED : SPRING_SNAPPY}
									className="grid gap-3 rounded-[12px] border border-primary-line bg-primary-soft/65 p-3.5"
								>
									<p className="m-0 text-[13px] font-medium text-foreground">
										Publish Draft r{draftRevision} to sohelislamimran.com?
									</p>
									<p className="m-0 text-[12px] leading-relaxed text-muted-foreground">
										{dirty
											? "Unsaved edits will be saved first, then promoted live immediately."
											: `Promotes ${diff.totalChanges} ${diff.totalChanges === 1 ? "change" : "changes"} across ${diff.changedSections.length} ${diff.changedSections.length === 1 ? "section" : "sections"} immediately.`}
									</p>
									<div className="flex items-center gap-2">
										<Button
											variant="default"
											size="sm"
											disabled={!canPublish}
											onClick={() => void handleConfirmPublish()}
											className="flex-1 pointer-coarse:min-h-11"
										>
											<PublishIcon className="size-3.5" />
											<span>{busy ? "Publishing…" : "Confirm publish"}</span>
										</Button>
										<Button
											variant="outline"
											size="sm"
											disabled={busy}
											onClick={() => setReviewedDraft(null)}
											className="pointer-coarse:min-h-11"
										>
											Cancel
										</Button>
									</div>
								</motion.div>
							) : (
								<motion.div
									key="idle"
									initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
									animate={{ opacity: 1, y: 0 }}
									exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
									transition={reduced ? REDUCED : SPRING_SNAPPY}
								>
									<Button
										variant="default"
										size="default"
										disabled={!canPublish}
										onClick={() => setReviewedDraft(draft)}
										className="w-full"
									>
										<PublishIcon className="size-4" />
										<span>Publish draft</span>
									</Button>
								</motion.div>
							)}
						</AnimatePresence>

						<div className="border-t border-line pt-3">
							<Button
								variant="destructive"
								size="sm"
								disabled={!hasChanges || busy || discarding}
								onClick={() => setDiscardReview({ draft, publishedRevision })}
								className="w-full pointer-coarse:min-h-11"
							>
								<DiscardIcon className="size-3.5" />
								<span>Discard draft to live</span>
							</Button>
						</div>

						<div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
							<Link
								to="/cms/history"
								className="cms-page-focus rounded-md px-1 py-0.5 text-primary-text no-underline hover:underline"
							>
								Revision history →
							</Link>
							<Link
								to="/cms/activity"
								className="cms-page-focus rounded-md px-1 py-0.5 text-muted-foreground no-underline hover:text-foreground"
							>
								Activity log
							</Link>
						</div>
					</aside>
				</div>
			) : (
				<RawJsonTab />
			)}

			{/* Discard confirmation AlertDialog */}
			<AlertDialog.Root
				open={discardReview !== null}
				onOpenChange={(open) => {
					if (!open) setDiscardReview(null);
				}}
			>
				<AlertDialog.Portal>
					<AlertDialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette) bg-[rgb(0_0_0/0.35)] dark:bg-[rgb(0_0_0/0.6)]" />
					<AlertDialog.Popup className="cms-dialog-popup cms-glass fixed top-1/2 left-1/2 z-(--z-palette) grid w-[min(460px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[18px] border p-5 text-foreground outline-hidden sm:p-6">
						<div className="flex items-start gap-3">
							<span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-destructive/35 bg-destructive/10 text-destructive">
								<DiscardIcon className="size-4" />
							</span>
							<div className="grid gap-1">
								<p className="mono-label m-0 text-[10.5px] text-destructive">Discard draft</p>
								<AlertDialog.Title className="m-0 text-[17px] font-semibold tracking-[-0.015em]">
									Reset draft back to Live r{discardReview?.publishedRevision}?
								</AlertDialog.Title>
								<AlertDialog.Description className="m-0 text-[13.5px] leading-relaxed text-muted-foreground">
									All unpublished changes across {diff.changedSections.length}{" "}
									{diff.changedSections.length === 1 ? "section" : "sections"} will be replaced by
									the live revision, including unsaved edits. Saved drafts remain in Revision
									history.
								</AlertDialog.Description>
							</div>
						</div>
						<div className="flex items-center justify-end gap-2 pt-1">
							<AlertDialog.Close
								render={<Button variant="outline" size="sm" disabled={discarding} />}
							>
								Keep draft
							</AlertDialog.Close>
							<Button
								variant="destructive"
								size="sm"
								disabled={discarding}
								onClick={() => void handleConfirmDiscard()}
							>
								{discarding ? "Discarding…" : "Discard draft"}
							</Button>
						</div>
					</AlertDialog.Popup>
				</AlertDialog.Portal>
			</AlertDialog.Root>
		</div>
	);
}
