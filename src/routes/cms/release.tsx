/**
 * Changes page (`/cms/release`, served at `/release` on the CMS host).
 * One publish gate at the top (title, validation line, Publish), the
 * per-section diff against live with per-field revert, a quiet Discard with a
 * confirm dialog, and a Raw JSON inspect / export / import tab. After a publish
 * the receipt replaces the page body.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Tabs } from "@base-ui/react/tabs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
	PageHeader,
	PageNotice,
	controlClass,
	pageClass,
} from "../../components/cms/analytics/Widgets";
import {
	useDraftSelector,
	useDraftStore,
	usePublicOrigin,
} from "../../components/cms/draft/context";
import { REDUCED, SPRING_MOVE } from "../../components/cms/motion";
import { diffPortfolioDocuments } from "../../components/cms/release/diff";
import { DiffView } from "../../components/cms/release/DiffView";
import { PublishGate, PublishedReceipt } from "../../components/cms/release/PublishGate";
import { RawJsonTab } from "../../components/cms/release/RawJsonTab";
import { DiscardIcon, HistoryIcon } from "../../components/cms/shell/cms-icons";
import { Button } from "../../components/ui/button";

export const Route = createFileRoute("/cms/release")({
	head: () => ({
		meta: [{ title: "Changes · Control plane" }],
	}),
	component: ReleaseRoute,
});

const tabs = [
	{ value: "changes", label: "Changes" },
	{ value: "json", label: "Raw JSON" },
] as const;

function ReleaseRoute() {
	const reduced = useReducedMotion();
	const store = useDraftStore();
	const publicOrigin = usePublicOrigin();
	const host = new URL(publicOrigin).host;

	const draft = useDraftSelector((state) => state.draft);
	const published = useDraftSelector((state) => state.published);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);
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
	const [publishedReceipt, setPublishedReceipt] = useState<{ revision: number } | null>(null);
	const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
	const receiptRef = useRef<HTMLElement>(null);
	const emptyRef = useRef<HTMLDivElement>(null);
	const focusAfterRender = useRef<"receipt" | "empty" | null>(null);

	const diff = useMemo(() => diffPortfolioDocuments(published, draft), [published, draft]);
	const hasChanges = diff.changedSections.length > 0 || ahead || dirty;
	const canPublish = hasChanges && issueCount === 0 && !conflict && !busy;

	// A new edit after publishing makes the receipt stale.
	useEffect(() => {
		if (hasChanges) setPublishedReceipt(null);
	}, [hasChanges]);

	useEffect(() => {
		const target = focusAfterRender.current;
		if (!target) return;
		focusAfterRender.current = null;
		(target === "receipt" ? receiptRef.current : emptyRef.current)?.focus();
	});

	const handleConfirmPublish = async () => {
		setNotice(null);
		if (!reviewedDraft) return;
		const ok = await store.publish({ reviewedDraft });
		if (ok) {
			setReviewedDraft(null);
			focusAfterRender.current = "receipt";
			setPublishedReceipt({ revision: store.getState().publishedRevision });
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
			focusAfterRender.current = "empty";
			setNotice({ tone: "ok", text: "Changes discarded. Your draft matches the live site again." });
		} else if (state.error) {
			setNotice({ tone: "error", text: state.error });
		}
	};

	return (
		<div className={pageClass}>
			<PageHeader
				title="Changes"
				description="Everything in your draft that differs from the live site."
				actions={
					<Tabs.Root value={tab} onValueChange={(value) => setTab(value as "changes" | "json")}>
						<Tabs.List className="cms-seg-track">
							{tabs.map((item) => {
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
										<span>{item.label}</span>
									</Tabs.Tab>
								);
							})}
						</Tabs.List>
					</Tabs.Root>
				}
			/>

			{notice ? (
				<PageNotice tone={notice.tone} text={notice.text} onDismiss={() => setNotice(null)} />
			) : null}

			{tab === "json" ? (
				<RawJsonTab />
			) : hasChanges ? (
				<>
					<PublishGate
						totalChanges={diff.totalChanges}
						sectionCount={diff.changedSections.length}
						issueCount={issueCount}
						conflict={conflict}
						dirty={dirty}
						busy={busy}
						canPublish={canPublish}
						confirming={confirmingPublish}
						host={host}
						onRequestPublish={() => setReviewedDraft(draft)}
						onCancel={() => setReviewedDraft(null)}
						onConfirm={() => void handleConfirmPublish()}
						onDiscard={() => setDiscardReview({ draft, publishedRevision })}
						discardDisabled={busy || discarding}
					/>
					<DiffView diff={diff} onRevertField={(path) => store.revertAt(path)} />
				</>
			) : publishedReceipt ? (
				<PublishedReceipt
					ref={receiptRef}
					revision={publishedReceipt.revision}
					publicOrigin={publicOrigin}
					onDismiss={() => {
						focusAfterRender.current = "empty";
						setPublishedReceipt(null);
					}}
				/>
			) : (
				<div ref={emptyRef} tabIndex={-1} className="outline-none">
					<DiffView
						diff={diff}
						emptyTitle="Your live site is up to date"
						emptyDescription="Edits you make show up here for review before you publish."
						emptyAction={
							<Link to="/cms/history" className={controlClass}>
								<HistoryIcon className="size-3.5 text-muted-foreground" />
								<span>Revision history</span>
							</Link>
						}
					/>
				</div>
			)}

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
								<AlertDialog.Title className="m-0 text-[17px] font-semibold tracking-[-0.015em]">
									Discard all unpublished changes?
								</AlertDialog.Title>
								<AlertDialog.Description className="m-0 text-[13.5px] leading-relaxed text-muted-foreground">
									Your draft goes back to what’s live, replacing changes in{" "}
									{diff.changedSections.length}{" "}
									{diff.changedSections.length === 1 ? "section" : "sections"}, unsaved edits
									included. Earlier saved drafts stay in revision history.
								</AlertDialog.Description>
							</div>
						</div>
						<div className="flex items-center justify-end gap-2 pt-1">
							<AlertDialog.Close
								render={<Button variant="outline" size="sm" disabled={discarding} />}
							>
								Keep editing
							</AlertDialog.Close>
							<Button
								variant="destructive"
								size="sm"
								disabled={discarding}
								onClick={() => void handleConfirmDiscard()}
							>
								{discarding ? "Discarding…" : "Discard changes"}
							</Button>
						</div>
					</AlertDialog.Popup>
				</AlertDialog.Portal>
			</AlertDialog.Root>
		</div>
	);
}
