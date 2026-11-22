/**
 * Changes page (`/cms/release`, served at `/release` on the CMS host).
 * One publish gate at the top (title, validation line, Publish), the
 * per-section diff against live with per-field revert, a quiet Discard with a
 * confirm dialog, and a Raw JSON inspect / export / import tab. After a publish
 * the receipt replaces the page body.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLiveReducedMotion } from "../../components/cms/shell/use-live-reduced-motion";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Tabs } from "@base-ui/react/tabs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
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
	{ value: "changes", label: "Review" },
	{ value: "json", label: "Raw JSON" },
] as const;

function ReleaseRoute() {
	const reduced = useLiveReducedMotion();
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
	// Held from Confirm until the publish settles, so the gate stays in its busy
	// state instead of flashing the "up to date" empty state before the receipt.
	const [publishing, setPublishing] = useState(false);
	const confirmingPublish = publishing || reviewedDraft === draft;
	const [discardReview, setDiscardReview] = useState<{
		draft: typeof draft;
		publishedRevision: number;
	} | null>(null);
	const [discarding, setDiscarding] = useState(false);
	const [publishedReceipt, setPublishedReceipt] = useState<{ revision: number } | null>(null);
	const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
	const [justDiscarded, setJustDiscarded] = useState(false);
	const receiptRef = useRef<HTMLElement>(null);
	const emptyRef = useRef<HTMLDivElement>(null);
	const focusAfterRender = useRef<"receipt" | "empty" | null>(null);

	const diff = useMemo(() => diffPortfolioDocuments(published, draft), [published, draft]);
	const hasChanges = diff.changedSections.length > 0 || ahead || dirty;
	const showGate = hasChanges || publishing;
	const gateBusy = busy || publishing;
	const canPublish = hasChanges && issueCount === 0 && !conflict && !gateBusy;

	// A new edit after publishing or discarding makes the receipt stale.
	useEffect(() => {
		if (hasChanges) {
			setPublishedReceipt(null);
			setJustDiscarded(false);
		}
	}, [hasChanges]);

	useLayoutEffect(() => {
		const target = focusAfterRender.current;
		if (!target) return;
		focusAfterRender.current = null;
		(target === "receipt" ? receiptRef.current : emptyRef.current)?.focus();
	});

	const handleConfirmPublish = async () => {
		setNotice(null);
		if (!reviewedDraft || publishing) return;
		setPublishing(true);
		setJustDiscarded(false);
		let ok = false;
		try {
			ok = await store.publish({ reviewedDraft });
		} finally {
			setPublishing(false);
			setReviewedDraft(null);
		}
		if (ok) {
			focusAfterRender.current = "receipt";
			setPublishedReceipt({ revision: store.getState().publishedRevision });
		} else {
			setNotice({
				tone: "error",
				text: store.getState().error ?? "Review the draft and try publishing again.",
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
			setTab("changes");
			focusAfterRender.current = "empty";
			setJustDiscarded(true);
		} else if (state.error) {
			setNotice({ tone: "error", text: state.error });
		}
	};

	return (
		<Tabs.Root
			className={pageClass}
			value={tab}
			onValueChange={(value: "changes" | "json") => setTab(value)}
		>
			<PageHeader
				title="Changes"
				description="Everything in your draft that differs from the live site."
				actions={
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
				}
			/>

			{notice ? (
				<PageNotice tone={notice.tone} text={notice.text} onDismiss={() => setNotice(null)} />
			) : null}

			{showGate ? (
				<PublishGate
					totalChanges={diff.totalChanges}
					sectionCount={diff.changedSections.length}
					issueCount={issueCount}
					conflict={conflict}
					dirty={dirty}
					busy={gateBusy}
					canPublish={canPublish}
					confirming={confirmingPublish}
					host={host}
					onRequestPublish={() => setReviewedDraft(draft)}
					onCancel={() => setReviewedDraft(null)}
					onConfirm={() => void handleConfirmPublish()}
					onDiscard={() => setDiscardReview({ draft, publishedRevision })}
					discardDisabled={gateBusy || discarding}
				/>
			) : publishedReceipt ? (
				<PublishedReceipt
					ref={receiptRef}
					revision={publishedReceipt.revision}
					publicOrigin={publicOrigin}
					onDismiss={() => {
						setTab("changes");
						focusAfterRender.current = "empty";
						setPublishedReceipt(null);
					}}
				/>
			) : null}

			<Tabs.Panel value="changes" hidden={tab !== "changes"} className="min-w-0 empty:hidden">
				{showGate ? (
					diff.changedSections.length > 0 ? (
						<DiffView diff={diff} onRevertField={(path) => store.revertAt(path)} />
					) : null
				) : publishedReceipt ? null : (
					<div ref={emptyRef} tabIndex={-1} className="outline-none">
						<DiffView
							diff={diff}
							emptyTitle={justDiscarded ? "Changes discarded" : "Your live site is up to date"}
							emptyDescription={
								justDiscarded
									? "Your draft matches the live site again. Earlier drafts stay in revision history."
									: "Edits you make show up here for review before you publish."
							}
							emptyAction={
								<Link to="/cms/history" className={controlClass}>
									<HistoryIcon className="size-3.5 text-muted-foreground" />
									<span>Revision history</span>
								</Link>
							}
						/>
					</div>
				)}
			</Tabs.Panel>
			<Tabs.Panel value="json" className="min-w-0">
				<RawJsonTab />
			</Tabs.Panel>

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
									{diff.changedSections.length > 0
										? `Your draft goes back to what’s live, replacing changes in ${diff.changedSections.length} ${diff.changedSections.length === 1 ? "section" : "sections"}${dirty ? ", unsaved edits included" : ""}.`
										: "Your draft goes back to what’s live."}{" "}
									Earlier saved drafts stay in revision history.
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
		</Tabs.Root>
	);
}
