/**
 * Release & Changes page (`/cms/release`, served at `/release` on the CMS host).
 * Shows per-section diffs against live, per-field revert, Publish with a confirm
 * step, Discard draft with confirm, and a Raw JSON inspect / export / import tab.
 */
import { useMemo, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Tabs } from "@base-ui/react/tabs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { useCmsSession, useDraftSelector, useDraftStore } from "../../components/cms/draft/context";
import { diffPortfolioDocuments } from "../../components/cms/release/diff";
import { DiffView } from "../../components/cms/release/DiffView";
import { RawJsonTab } from "../../components/cms/release/RawJsonTab";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	DiscardIcon,
	PublishIcon,
} from "../../components/cms/shell/cms-icons";
import { formatUtcTimestamp, useRelativeTime } from "../../components/cms/shell/time";
import { discardDraft } from "../../server/cms-history.functions";

export const Route = createFileRoute("/cms/release")({
	head: () => ({
		meta: [{ title: "Changes & release · Control plane" }],
	}),
	component: ReleaseRoute,
});

function ReleaseRoute() {
	const store = useDraftStore();
	const { csrfToken } = useCmsSession();
	const runDiscardDraft = useServerFn(discardDraft);

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
	const [confirmingPublish, setConfirmingPublish] = useState(false);
	const [discardOpen, setDiscardOpen] = useState(false);
	const [discarding, setDiscarding] = useState(false);
	const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

	const diff = useMemo(() => diffPortfolioDocuments(published, draft), [published, draft]);
	const relativePublished = useRelativeTime(publishedAt, 30_000);

	const hasChanges = diff.changedSections.length > 0 || ahead || dirty;
	const canPublish = hasChanges && issueCount === 0 && !conflict && !busy;

	const handleConfirmPublish = async () => {
		setNotice(null);
		const ok = await store.publish();
		if (ok) {
			setConfirmingPublish(false);
			const nextRev = store.getState().publishedRevision;
			setNotice({ tone: "ok", text: `Published Live r${nextRev} to sohelislamimran.com.` });
		}
	};

	const handleConfirmDiscard = async () => {
		setDiscarding(true);
		setNotice(null);
		try {
			const state = store.getState();
			if (state.ahead) {
				const result = await runDiscardDraft({
					data: { expectedRevision: state.draftRevision, csrfToken },
				});
				if (result.ok) {
					store.adoptSnapshot(result.snapshot);
					setDiscardOpen(false);
					setConfirmingPublish(false);
					setNotice({
						tone: "ok",
						text: `Draft discarded. Reset to Live r${result.snapshot.publishedRevision} as Draft r${result.snapshot.draftRevision}.`,
					});
				} else {
					store.adoptSnapshot(result.current);
					setDiscardOpen(false);
					setNotice({
						tone: "error",
						text: "The draft changed in another session. Loaded the latest server state instead.",
					});
				}
			} else {
				// Only unsaved local edits exist; server draft already equals live.
				store.adoptSnapshot({
					draft: structuredClone(state.published),
					published: state.published,
					draftRevision: state.draftRevision,
					publishedRevision: state.publishedRevision,
					draftUpdatedAt: state.draftUpdatedAt,
					publishedAt: state.publishedAt,
				});
				setDiscardOpen(false);
				setConfirmingPublish(false);
				setNotice({ tone: "ok", text: "Unsaved local edits cleared." });
			}
		} catch {
			setNotice({ tone: "error", text: "Could not discard the draft. Try again in a moment." });
		} finally {
			setDiscarding(false);
		}
	};

	return (
		<div className="grid max-w-[1120px] gap-6">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div className="grid gap-1.5">
					<p className="mono-label m-0 text-primary-text">
						Release · Draft r{draftRevision} vs Live r{publishedRevision}
					</p>
					<h1 className="m-0 text-headline">Changes and release</h1>
					<p className="m-0 text-[14px] text-muted-foreground">
						Review every field that differs from what visitors see before promoting a revision live.
					</p>
				</div>

				<Tabs.Root value={tab} onValueChange={(value) => setTab(value as "changes" | "json")}>
					<Tabs.List className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-solid p-1">
						<Tabs.Tab
							value="changes"
							className="min-h-8 rounded-full px-3.5 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground data-[active]:bg-foreground data-[active]:text-background pointer-coarse:min-h-11"
						>
							Changes ({diff.changedSections.length})
						</Tabs.Tab>
						<Tabs.Tab
							value="json"
							className="min-h-8 rounded-full px-3.5 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground data-[active]:bg-foreground data-[active]:text-background pointer-coarse:min-h-11"
						>
							Raw JSON
						</Tabs.Tab>
					</Tabs.List>
				</Tabs.Root>
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

			{tab === "changes" ? (
				<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
					<div className="min-w-0">
						<DiffView diff={diff} onRevertField={(path) => store.revertAt(path)} />
					</div>

					{/* Sticky Release Action Panel */}
					<aside className="cms-panel grid gap-4 p-4 sm:p-5 xl:sticky xl:top-[76px]">
						<div className="grid gap-1">
							<p className="mono-label m-0 text-[10.5px] text-muted-foreground">Release gate</p>
							<h2 className="m-0 text-[15px] font-semibold text-foreground">
								{hasChanges
									? `${diff.changedSections.length} ${diff.changedSections.length === 1 ? "section" : "sections"} ready`
									: "Nothing to publish"}
							</h2>
							<p className="m-0 font-mono text-[11.5px] text-muted-foreground">
								Live r{publishedRevision}
								{relativePublished ? ` · ${relativePublished}` : ""}
							</p>
						</div>

						<div className="grid gap-2 rounded-[12px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2.5%,transparent)] p-3 text-[12.5px]">
							<div className="flex items-center justify-between gap-2">
								<span className="text-muted-foreground">Validation</span>
								{issueCount === 0 ? (
									<span className="inline-flex items-center gap-1 font-mono text-[11.5px] text-success">
										<span aria-hidden="true">✓</span> Valid
									</span>
								) : (
									<span className="inline-flex items-center gap-1 font-mono text-[11.5px] text-destructive">
										<span aria-hidden="true">!</span> {issueCount} issues
									</span>
								)}
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

						{/* Publish with explicit confirm step */}
						{confirmingPublish ? (
							<div className="grid gap-3 rounded-[12px] border border-primary-line bg-primary-soft/65 p-3.5">
								<p className="m-0 text-[13px] font-medium text-foreground">
									Publish Draft r{draftRevision} to sohelislamimran.com?
								</p>
								<p className="m-0 text-[12px] text-muted-foreground">
									{dirty
										? "Unsaved edits will be saved first, then promoted live."
										: "This revision will immediately replace what visitors see."}
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
										onClick={() => setConfirmingPublish(false)}
										className="pointer-coarse:min-h-11"
									>
										Cancel
									</Button>
								</div>
							</div>
						) : (
							<Button
								variant="default"
								size="default"
								disabled={!canPublish}
								onClick={() => setConfirmingPublish(true)}
								className="w-full"
							>
								<PublishIcon className="size-4" />
								<span>Publish draft</span>
							</Button>
						)}

						<div className="border-t border-line pt-3">
							<Button
								variant="destructive"
								size="sm"
								disabled={!hasChanges || busy || discarding}
								onClick={() => setDiscardOpen(true)}
								className="w-full pointer-coarse:min-h-11"
							>
								<DiscardIcon className="size-3.5" />
								<span>Discard draft to live</span>
							</Button>
						</div>

						<div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
							<Link to="/cms/history" className="text-primary-text no-underline hover:underline">
								Revision history →
							</Link>
							<Link
								to="/cms/activity"
								className="text-muted-foreground no-underline hover:text-foreground"
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
			<AlertDialog.Root open={discardOpen} onOpenChange={setDiscardOpen}>
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
									Reset draft back to Live r{publishedRevision}?
								</AlertDialog.Title>
								<AlertDialog.Description className="m-0 text-[13.5px] leading-relaxed text-muted-foreground">
									All unpublished changes across {diff.changedSections.length}{" "}
									{diff.changedSections.length === 1 ? "section" : "sections"} will be replaced by
									the live revision. Older drafts remain recoverable in Revision history.
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
