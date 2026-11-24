/**
 * Changes page (`/cms/release`, served at `/release` on the CMS host).
 * One publish gate at the top (title, validation line, Publish), the
 * per-section diff against live with per-field revert, a quiet Discard with a
 * confirm dialog, and a Raw JSON inspect / export / import tab. After a publish
 * the receipt replaces the page body.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useLiveReducedMotion } from "../../components/cms/shell/use-live-reduced-motion";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Tabs } from "@base-ui/react/tabs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
	PageHeader,
	PageNotice,
	inlineLinkClass,
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
import { publishStep } from "../../components/cms/release/publish-steps";
import { PublishGate, PublishedReceipt } from "../../components/cms/release/PublishGate";
import { RawJsonTab } from "../../components/cms/release/RawJsonTab";
import { RELEASE_GATE_ID } from "../../components/cms/shell/CmsShell";
import { CheckCircleIcon, DiscardIcon, HistoryIcon } from "../../components/cms/shell/cms-icons";
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
	const status = useDraftSelector((state) => state.status);
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const busy = status === "saving" || status === "publishing";

	const [tab, setTab] = useState<"changes" | "json">("changes");
	const [reviewedDraft, setReviewedDraft] = useState<typeof draft | null>(null);
	// Held from Confirm until the publish settles, so the gate stays in its busy
	// state instead of flashing the "up to date" empty state before the receipt.
	const [publishing, setPublishing] = useState(false);
	const confirmingPublish = reviewedDraft === draft;
	const [failedPublish, setFailedPublish] = useState<{
		draft: typeof draft;
		revision: number;
	} | null>(null);
	const retry = failedPublish?.draft === draft && failedPublish.revision === draftRevision;
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
	const step = publishStep({
		status,
		revision: showGate ? draftRevision : publishedRevision,
		dirty,
		ahead,
		attempting: publishing,
		unconfirmed: retry && !publishing,
		published: !showGate && publishedReceipt !== null,
	});

	// Let the shell's Publish / Review actions switch back from Raw JSON synchronously
	// before locating and focusing the inline PublishGate.
	useEffect(() => {
		const selectReview = () => {
			flushSync(() => setTab("changes"));
		};
		window.addEventListener("cms:release-select-review", selectReview);
		return () => window.removeEventListener("cms:release-select-review", selectReview);
	}, []);

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

	const handlePublish = async (review: typeof draft) => {
		if (!canPublish || store.getState().draft !== review) return;
		setNotice(null);
		setPublishing(true);
		setJustDiscarded(false);
		let submittedRevision: number | undefined;
		const unsubscribe = store.subscribe(() => {
			const state = store.getState();
			if (state.status === "publishing") submittedRevision = state.draftRevision;
		});
		let ok = false;
		try {
			ok = await store.publish({ reviewedDraft: review });
		} finally {
			unsubscribe();
			setPublishing(false);
			setReviewedDraft(null);
		}
		const current = store.getState();
		if (ok) {
			setFailedPublish(null);
			setTab("changes");
			if (current.draft === review) {
				focusAfterRender.current = "receipt";
				setPublishedReceipt({ revision: current.publishedRevision });
			}
		} else if (
			submittedRevision !== undefined &&
			current.status === "error" &&
			current.draft === review
		) {
			setFailedPublish({ draft: review, revision: submittedRevision });
		} else if (current.status !== "conflict") {
			setNotice({
				tone: "error",
				text: current.error ?? "Review the draft and try publishing again.",
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
											layoutId={reduced ? undefined : "cms-release-tab-pill"}
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
				<PageNotice
					tone={notice.tone}
					text={notice.text}
					onDismiss={() => {
						setNotice(null);
						// The dismissed notice held focus; hand it to the gate or the page.
						requestAnimationFrame(() =>
							(
								document.getElementById(RELEASE_GATE_ID) ?? document.getElementById("main-content")
							)?.focus({ preventScroll: true }),
						);
					}}
				/>
			) : null}

			<Tabs.Panel value="changes" hidden={tab !== "changes"} className="min-w-0 empty:hidden">
				<div className="grid min-w-0 gap-5">
					<p role="status" className="sr-only">
						{step?.text}
					</p>
					{showGate ? (
						<PublishGate
							totalChanges={diff.totalChanges}
							sectionCount={diff.changedSections.length}
							issueCount={issueCount}
							conflict={conflict}
							dirty={dirty}
							step={step}
							onRetry={retry && !conflict ? () => void handlePublish(draft) : undefined}
							busy={gateBusy}
							canPublish={canPublish}
							confirming={confirmingPublish}
							host={host}
							onRequestPublish={() => setReviewedDraft(draft)}
							onCancel={() => setReviewedDraft(null)}
							onConfirm={() => {
								if (reviewedDraft) void handlePublish(reviewedDraft);
							}}
							onDiscard={() => setDiscardReview({ draft, publishedRevision })}
							discardDisabled={gateBusy || discarding}
						/>
					) : publishedReceipt ? (
						<PublishedReceipt
							ref={receiptRef}
							revision={publishedReceipt.revision}
							step={step}
							publicOrigin={publicOrigin}
							onDismiss={() => {
								setTab("changes");
								focusAfterRender.current = "empty";
								setPublishedReceipt(null);
							}}
						/>
					) : null}

					{showGate ? (
						diff.changedSections.length > 0 ? (
							<DiffView diff={diff} showIndex onRevertField={(path) => store.revertAt(path)} />
						) : null
					) : publishedReceipt ? null : (
						<div
							ref={emptyRef}
							tabIndex={-1}
							className="cms-panel cms-enter flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3.5 outline-none sm:px-5"
						>
							<div className="flex min-w-0 items-center gap-2.5">
								<CheckCircleIcon className="size-4 shrink-0 text-success" />
								<p className="m-0 text-[14px] text-foreground">
									{justDiscarded
										? "Changes discarded — draft matches live."
										: "No unpublished changes. Draft matches live."}
								</p>
							</div>
							<Link to="/cms/history" className={inlineLinkClass}>
								<HistoryIcon className="size-3.5" />
								<span>History</span>
							</Link>
						</div>
					)}
				</div>
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
					<AlertDialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette)" />
					<AlertDialog.Popup className="cms-modal cms-overlay fixed top-1/2 left-1/2 z-(--z-palette) grid max-h-[calc(100dvh-24px)] w-[min(460px,calc(100vw-24px))] overflow-y-auto -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[18px] border p-5 text-foreground outline-hidden sm:p-6">
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
								render={
									<Button
										variant="outline"
										size="sm"
										disabled={discarding}
										className="pointer-coarse:min-h-11"
									/>
								}
							>
								Keep editing
							</AlertDialog.Close>
							<Button
								variant="destructive"
								size="sm"
								className="pointer-coarse:min-h-11"
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
