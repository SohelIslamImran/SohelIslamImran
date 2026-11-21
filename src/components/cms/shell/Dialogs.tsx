/**
 * Blocking conflict resolution dialog (`@base-ui/react/alert-dialog`) and
 * reusable publish confirmation dialog for the Control Plane shell.
 */
import { useMemo, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "../../ui/button";
import { useDraftSelector, useDraftStore } from "../draft/context";
import { diffPortfolioDocuments } from "../release/diff";
import { AlertTriangleIcon, PublishIcon } from "./cms-icons";
import { formatUtcTimestamp } from "./time";

export function ConflictDialog() {
	const hasConflict = useDraftSelector((state) => state.conflict !== null);
	if (!hasConflict) return null;
	return <ConflictDialogBody />;
}

function ConflictDialogBody() {
	const store = useDraftStore();
	const conflict = useDraftSelector((state) => state.conflict);
	const draft = useDraftSelector((state) => state.draft);
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const draftUpdatedAt = useDraftSelector((state) => state.draftUpdatedAt);
	const [busy, setBusy] = useState(false);

	const diffSections = useMemo(() => {
		if (!conflict) return [];
		return diffPortfolioDocuments(conflict.draft, draft).changedSections.map(
			(entry) => entry.section.label,
		);
	}, [conflict, draft]);

	if (!conflict) return null;

	const handleOverwrite = async () => {
		setBusy(true);
		try {
			await store.overwriteRemote();
		} finally {
			setBusy(false);
		}
	};

	return (
		<AlertDialog.Root open={true}>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette) bg-[rgb(0_0_0/0.35)] dark:bg-[rgb(0_0_0/0.6)]" />
				<AlertDialog.Popup
					data-slot="cms-conflict-dialog"
					className="cms-dialog-popup cms-glass fixed top-1/2 left-1/2 z-(--z-palette) grid w-[min(520px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-[18px] border p-5 text-foreground outline-hidden sm:p-6"
				>
					<div className="flex items-start gap-3">
						<span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-destructive/35 bg-destructive/10 text-destructive">
							<AlertTriangleIcon className="size-4" />
						</span>
						<div className="grid gap-1">
							<p className="mono-label m-0 text-[10.5px] text-destructive">Revision conflict</p>
							<AlertDialog.Title className="m-0 text-[17px] font-semibold tracking-[-0.015em]">
								The draft changed in another session.
							</AlertDialog.Title>
							<AlertDialog.Description className="m-0 text-[13.5px] leading-relaxed text-muted-foreground">
								Autosave paused so nothing is overwritten silently. Choose whether to load the
								server&apos;s newer revision or keep your local edits and overwrite it.
							</AlertDialog.Description>
						</div>
					</div>

					<div className="grid gap-2.5 sm:grid-cols-2">
						<div className="rounded-[12px] border border-primary-line bg-primary-soft/60 p-3">
							<p className="mono-label m-0 text-[10px] text-primary-text">Your tab</p>
							<p className="m-0 mt-1 font-mono text-[14px] font-semibold tabular-nums text-foreground">
								Draft r{draftRevision}
							</p>
							<p className="m-0 mt-0.5 font-mono text-[11px] text-muted-foreground">
								Base {formatUtcTimestamp(draftUpdatedAt)}
							</p>
						</div>
						<div className="rounded-[12px] border border-line-strong bg-surface-solid p-3">
							<p className="mono-label m-0 text-[10px] text-muted-foreground">Server</p>
							<p className="m-0 mt-1 font-mono text-[14px] font-semibold tabular-nums text-foreground">
								Draft r{conflict.draftRevision}
							</p>
							<p className="m-0 mt-0.5 font-mono text-[11px] text-muted-foreground">
								Updated {formatUtcTimestamp(conflict.draftUpdatedAt)}
							</p>
						</div>
					</div>

					{diffSections.length > 0 ? (
						<p className="m-0 rounded-[10px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] px-3 py-2 text-[12.5px] text-ink-soft">
							<span className="font-mono text-[11px] text-muted-foreground">Differing: </span>
							{diffSections.join(", ")}
						</p>
					) : null}

					<div className="flex flex-wrap items-center justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={busy}
							onClick={() => store.acceptRemote()}
							className="pointer-coarse:min-h-11"
						>
							Load theirs
						</Button>
						<Button
							variant="default"
							size="sm"
							disabled={busy}
							onClick={() => void handleOverwrite()}
							className="pointer-coarse:min-h-11"
						>
							{busy ? "Overwriting…" : "Keep mine and overwrite"}
						</Button>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}

export function PublishConfirmDialog({
	open,
	onOpenChange,
	onPublished,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onPublished?: () => void;
}) {
	if (!open) return null;
	return <PublishConfirmDialogBody onOpenChange={onOpenChange} onPublished={onPublished} />;
}

function PublishConfirmDialogBody({
	onOpenChange,
	onPublished,
}: {
	onOpenChange: (open: boolean) => void;
	onPublished?: () => void;
}) {
	const store = useDraftStore();
	const draft = useDraftSelector((state) => state.draft);
	const [reviewedDraft] = useState(() => store.getState().draft);
	const reviewExpired = reviewedDraft !== draft;
	const blocked = useDraftSelector(
		(state) => Boolean(state.conflict) || state.issues.all.length > 0,
	);
	const published = useDraftSelector((state) => state.published);
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);
	const dirty = useDraftSelector((state) => state.dirty);
	const busy = useDraftSelector(
		(state) => state.status === "saving" || state.status === "publishing",
	);

	const changedSections = useMemo(
		() => diffPortfolioDocuments(published, reviewedDraft).changedSections,
		[published, reviewedDraft],
	);

	const confirmPublish = async () => {
		const ok = await store.publish({ reviewedDraft });
		if (ok || store.getState().conflict) onOpenChange(false);
		if (ok) onPublished?.();
	};

	return (
		<AlertDialog.Root open={true} onOpenChange={onOpenChange}>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette) bg-[rgb(0_0_0/0.3)] dark:bg-[rgb(0_0_0/0.55)]" />
				<AlertDialog.Popup
					data-slot="cms-publish-dialog"
					className="cms-dialog-popup cms-glass fixed top-1/2 left-1/2 z-(--z-palette) grid w-[min(460px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[18px] border p-5 text-foreground outline-hidden sm:p-6"
				>
					<div className="flex items-start gap-3">
						<span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-primary-line bg-primary-soft text-primary-text">
							<PublishIcon className="size-4" />
						</span>
						<div className="grid gap-1">
							<p className="mono-label m-0 text-[10.5px] text-primary-text">
								Release · r{draftRevision} → Live r{publishedRevision}
							</p>
							<AlertDialog.Title className="m-0 text-[17px] font-semibold tracking-[-0.015em]">
								Publish draft to live site?
							</AlertDialog.Title>
							<AlertDialog.Description className="m-0 text-[13.5px] leading-relaxed text-muted-foreground">
								{reviewExpired
									? "The draft changed. Close this dialog and review the updated draft."
									: dirty
										? "Unsaved edits will be saved first, then promoted live immediately."
										: "Visitors on sohelislamimran.com will see this revision immediately."}
							</AlertDialog.Description>
						</div>
					</div>

					{changedSections.length > 0 ? (
						<div className="rounded-[12px] border border-line bg-surface-solid px-3.5 py-2.5 text-[12.5px]">
							<p className="mono-label m-0 text-[10px] text-muted-foreground">
								{changedSections.length} {changedSections.length === 1 ? "section" : "sections"}{" "}
								changed
							</p>
							<p className="m-0 mt-1 text-foreground">
								{changedSections.map((entry) => entry.section.label).join(" · ")}
							</p>
						</div>
					) : null}

					<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
						<Link
							to="/cms/release"
							onClick={() => onOpenChange(false)}
							className={buttonVariants({ variant: "ghost", size: "sm" })}
						>
							Review diff →
						</Link>
						<div className="flex items-center gap-2">
							<AlertDialog.Close render={<Button variant="outline" size="sm" disabled={busy} />}>
								Cancel
							</AlertDialog.Close>
							<Button
								variant="default"
								size="sm"
								disabled={busy || blocked || reviewExpired}
								onClick={() => void confirmPublish()}
							>
								{busy ? "Publishing…" : "Publish now"}
							</Button>
						</div>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}
