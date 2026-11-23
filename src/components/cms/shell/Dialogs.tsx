/**
 * Conflict resolution dialog (`@base-ui/react/alert-dialog`) and
 * reusable publish confirmation dialog for the Control Plane shell.
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "../../ui/button";
import { useDraftSelector, useDraftStore, usePublicOrigin } from "../draft/context";
import { diffPortfolioDocuments } from "../release/diff";
import { AlertTriangleIcon, PublishIcon } from "./cms-icons";
import { draftActionAvailability } from "./draft-actions";
import { formatUtcTimestamp } from "./time";

export function ConflictDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<AlertDialog.Root open={open} onOpenChange={onOpenChange}>
			<AlertDialog.Portal>
				<ConflictDialogBody />
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}

function ConflictDialogBody() {
	const store = useDraftStore();
	const conflict = useDraftSelector((state) => state.conflict);
	const draft = useDraftSelector((state) => state.draft);
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const draftUpdatedAt = useDraftSelector((state) => state.draftUpdatedAt);
	const [busy, setBusy] = useState(false);
	const popupRef = useRef<HTMLDivElement>(null);

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
		<>
			<AlertDialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette)" />
			<AlertDialog.Popup
				data-slot="cms-conflict-dialog"
				ref={popupRef}
				initialFocus={popupRef}
				finalFocus={() => document.querySelector<HTMLElement>(".cms-status-pill")}
				className="cms-modal cms-overlay fixed top-1/2 left-1/2 z-(--z-palette) grid max-h-[calc(100dvh-24px)] w-[min(520px,calc(100vw-24px))] overflow-y-auto -translate-x-1/2 -translate-y-1/2 gap-5 rounded-[18px] border p-5 text-foreground outline-hidden sm:p-6"
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
							Autosave is paused. Loading the server draft discards your local edits. Keeping your
							draft overwrites the server revision.
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

				<div className="flex flex-wrap items-center gap-2">
					<AlertDialog.Close
						render={
							<Button variant="ghost" size="sm" className="mr-auto pointer-coarse:min-h-11" />
						}
					>
						Resolve later
					</AlertDialog.Close>
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
						variant="destructive"
						size="sm"
						disabled={busy}
						onClick={() => void handleOverwrite()}
						className="pointer-coarse:min-h-11"
					>
						{busy ? "Overwriting…" : "Keep mine and overwrite"}
					</Button>
				</div>
			</AlertDialog.Popup>
		</>
	);
}

export function PublishConfirmDialog({
	open,
	onOpenChange,
	publishFailed,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	publishFailed: boolean;
}) {
	return (
		<AlertDialog.Root open={open} onOpenChange={onOpenChange}>
			<AlertDialog.Portal>
				<PublishConfirmDialogBody onOpenChange={onOpenChange} publishFailed={publishFailed} />
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}

function PublishConfirmDialogBody({
	onOpenChange,
	publishFailed,
}: {
	onOpenChange: (open: boolean) => void;
	publishFailed: boolean;
}) {
	const store = useDraftStore();
	const publicHost = new URL(usePublicOrigin()).host;
	const cancelRef = useRef<HTMLButtonElement>(null);
	const reloadRef = useRef<HTMLButtonElement>(null);
	const publishedSuccessfully = useRef(false);
	const [attemptFailed, setAttemptFailed] = useState(false);
	const draft = useDraftSelector((state) => state.draft);
	const [reviewedDraft] = useState(() => store.getState().draft);
	const reviewExpired = reviewedDraft !== draft;
	const { canPublish } = useDraftSelector(draftActionAvailability);
	const published = useDraftSelector((state) => state.published);
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);
	const dirty = useDraftSelector((state) => state.dirty);
	const busy = useDraftSelector(
		(state) => state.status === "saving" || state.status === "publishing",
	);
	const error = useDraftSelector((state) => (state.status === "error" ? state.error : null));
	const authExpired = useDraftSelector((state) => state.authExpired);
	const showError = error !== null && (authExpired || publishFailed || attemptFailed);

	useLayoutEffect(() => {
		if (authExpired) reloadRef.current?.focus();
	}, [authExpired]);

	const changedSections = useMemo(
		() => diffPortfolioDocuments(published, reviewedDraft).changedSections,
		[published, reviewedDraft],
	);

	const confirmPublish = async () => {
		const state = store.getState();
		if (!draftActionAvailability(state).canPublish || state.draft !== reviewedDraft) return;
		const ok = await store.publish({ reviewedDraft });
		publishedSuccessfully.current = ok;
		if (ok || store.getState().conflict) onOpenChange(false);
		else setAttemptFailed(true);
	};

	return (
		<>
			<AlertDialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette)" />
			<AlertDialog.Popup
				data-slot="cms-publish-dialog"
				initialFocus={authExpired ? reloadRef : cancelRef}
				finalFocus={() => {
					if (store.getState().conflict) return false;
					return publishedSuccessfully.current && window.matchMedia("(width < 1024px)").matches
						? document.querySelector<HTMLElement>('[data-slot="cms-command-trigger"]')
						: true;
				}}
				className="cms-modal cms-overlay fixed top-1/2 left-1/2 z-(--z-palette) grid max-h-[calc(100dvh-24px)] w-[min(460px,calc(100vw-24px))] overflow-y-auto -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[18px] border p-5 text-foreground outline-hidden sm:p-6"
			>
				<div className="flex items-start gap-3">
					<span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-primary-line bg-primary-soft text-primary-text">
						<PublishIcon className="size-4" />
					</span>
					<div className="grid gap-1">
						<p className="mono-label m-0 text-[10.5px] text-primary-text">
							Release · <span className="normal-case">r{draftRevision}</span> → Live{" "}
							<span className="normal-case">r{publishedRevision}</span>
						</p>
						<AlertDialog.Title className="m-0 text-[17px] font-semibold tracking-[-0.015em]">
							Publish draft to live site?
						</AlertDialog.Title>
						<AlertDialog.Description className="m-0 text-[13.5px] leading-relaxed text-muted-foreground">
							{reviewExpired
								? "The draft changed. Close this dialog and review the updated draft."
								: dirty
									? "Unsaved edits will be saved first, then promoted live immediately."
									: `Visitors on ${publicHost} will see this revision immediately.`}
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

				{showError ? (
					<p
						role="alert"
						className="m-0 rounded-[10px] bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
					>
						{publishFailed && !authExpired
							? "The draft could not be published. Check your connection and try again."
							: error}
					</p>
				) : null}

				<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
					<Link
						to="/cms/release"
						preload="intent"
						viewTransition={false}
						resetScroll={false}
						onClick={() => onOpenChange(false)}
						className={buttonVariants({
							variant: "ghost",
							size: "sm",
							className: "cms-press pointer-coarse:min-h-11",
						})}
					>
						Review diff →
					</Link>
					<div className="flex items-center gap-2">
						<AlertDialog.Close
							render={
								<Button
									ref={cancelRef}
									variant="outline"
									size="sm"
									disabled={busy}
									focusableWhenDisabled
									className="pointer-coarse:min-h-11"
								/>
							}
						>
							Cancel
						</AlertDialog.Close>
						{authExpired ? (
							<Button
								ref={reloadRef}
								size="sm"
								className="pointer-coarse:min-h-11"
								onClick={() => window.location.reload()}
							>
								Reload console
							</Button>
						) : (
							<Button
								variant="default"
								size="sm"
								disabled={!canPublish || reviewExpired}
								focusableWhenDisabled
								aria-busy={busy || undefined}
								className="pointer-coarse:min-h-11"
								onClick={() => void confirmPublish()}
							>
								{busy ? "Publishing…" : showError ? "Retry publish" : "Publish now"}
							</Button>
						)}
					</div>
				</div>
			</AlertDialog.Popup>
		</>
	);
}
