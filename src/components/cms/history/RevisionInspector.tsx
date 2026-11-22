/**
 * History inspector: the selected revision's header, details, and its diff
 * against the current draft, plus the restore confirmation dialog. While a new
 * revision loads, the previous one stays on screen at reduced opacity.
 */
import { useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { cn } from "../../../lib/utils";
import type { RevisionDetail } from "../../../server/cms-storage.server";
import { RelativeTime, asUtcIso } from "../analytics/RelativeTime";
import { EmptyState, controlClass } from "../analytics/Widgets";
import type { DocumentDiff } from "../release/diff";
import { DiffView } from "../release/DiffView";
import { AlertTriangleIcon, HistoryIcon } from "../shell/cms-icons";
import { formatBytes, formatUtcTimestamp } from "../shell/time";
import { Button } from "../../ui/button";

function formatByteDelta(delta: number): string {
	if (delta === 0) return "Same size";
	const prefix = delta > 0 ? "+" : "−";
	return `${prefix}${formatBytes(Math.abs(delta))}`;
}

const kindLabel = (detail: RevisionDetail) => (detail.kind === "published" ? "Published" : "Draft");

export function InspectorSkeleton() {
	return (
		<div className="cms-panel grid gap-4 p-5">
			<div className="flex items-center justify-between gap-3">
				<div className="grid gap-2">
					<div className="cms-skeleton h-5 w-36" />
					<div className="cms-skeleton h-3.5 w-48" />
				</div>
				<div className="cms-skeleton h-9 w-36 rounded-full" />
			</div>
			<div className="cms-skeleton h-44 w-full rounded-[12px]" />
		</div>
	);
}

export function RevisionInspector({
	detail,
	diff,
	stale,
	baselineBytes,
	restoring,
	onRestore,
}: {
	detail: RevisionDetail;
	diff: DocumentDiff;
	/** A different revision is loading; keep this one visible but dimmed. */
	stale: boolean;
	baselineBytes: number | null;
	restoring: boolean;
	onRestore: () => void;
}) {
	const [detailsOpen, setDetailsOpen] = useState(false);
	const differs = diff.changedSections.length > 0;

	return (
		<div
			key={detail.id}
			aria-busy={stale}
			className={cn(
				"cms-collapse-panel grid min-w-0 gap-4 transition-opacity duration-200",
				stale && "opacity-55",
			)}
		>
			<div className="cms-panel">
				<div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
					<div className="grid min-w-0 gap-1">
						<h2 className="m-0 text-[17px] font-semibold tracking-[-0.018em] text-foreground">
							{kindLabel(detail)} <span className="font-mono tabular-nums">r{detail.revision}</span>
						</h2>
						<p className="m-0 text-[13px] text-muted-foreground">
							Saved <RelativeTime iso={detail.changedAt} />
						</p>
						{differs ? (
							<p className="m-0 mt-1 max-w-[56ch] text-[13px] text-muted-foreground">
								Restoring creates a new draft. The live site stays as it is until you publish.
							</p>
						) : null}
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							aria-expanded={detailsOpen}
							onClick={() => setDetailsOpen((open) => !open)}
							className={controlClass}
						>
							<span>Details</span>
							<svg
								viewBox="0 0 16 16"
								aria-hidden="true"
								className={cn(
									"size-3.5 fill-none stroke-current stroke-[1.7] transition-[rotate] duration-200 ease-trace [stroke-linecap:round] [stroke-linejoin:round]",
									detailsOpen && "rotate-180",
								)}
							>
								<path d="m4 6 4 4 4-4" />
							</svg>
						</button>
						<Button
							variant="default"
							size="sm"
							disabled={!differs || restoring || stale}
							onClick={onRestore}
							className="pointer-coarse:min-h-11"
						>
							<HistoryIcon className="size-3.5" />
							<span>Restore as draft</span>
						</Button>
					</div>
				</div>

				{detailsOpen ? (
					<dl className="cms-collapse-panel m-0 grid grid-cols-2 gap-3 border-t border-line px-4 py-3.5 text-[13px] sm:grid-cols-4 sm:px-5">
						<div>
							<dt className="text-[12px] text-muted-foreground">Saved</dt>
							<dd className="m-0 mt-0.5 font-mono text-[12.5px] text-foreground">
								{formatUtcTimestamp(asUtcIso(detail.changedAt))}
							</dd>
						</div>
						<div>
							<dt className="text-[12px] text-muted-foreground">Size</dt>
							<dd className="m-0 mt-0.5 font-mono text-[12.5px] text-foreground">
								{formatBytes(detail.bytes)}
								{baselineBytes !== null && detail.bytes !== baselineBytes ? (
									<span className="text-muted-foreground">
										{" "}
										({formatByteDelta(detail.bytes - baselineBytes)} vs draft)
									</span>
								) : null}
							</dd>
						</div>
						<div>
							<dt className="text-[12px] text-muted-foreground">Changes vs draft</dt>
							<dd className="m-0 mt-0.5 font-mono text-[12.5px] text-foreground">
								{diff.totalChanges}
							</dd>
						</div>
						<div>
							<dt className="text-[12px] text-muted-foreground">Schema</dt>
							<dd className="m-0 mt-0.5 font-mono text-[12.5px] text-foreground">
								v{detail.content.schemaVersion}
							</dd>
						</div>
					</dl>
				) : null}
			</div>

			<DiffView
				diff={diff}
				beforeLabel="Current draft"
				afterLabel={`r${detail.revision}`}
				showEditLinks={false}
				emptyTitle="Same as your current draft"
				emptyDescription="Restoring this revision would not change anything."
			/>
		</div>
	);
}

export function InspectorError({ message }: { message: string }) {
	return (
		<div className="cms-panel">
			<EmptyState
				icon={<AlertTriangleIcon className="size-4 text-destructive" />}
				title="Revision unavailable"
				description={message}
			/>
		</div>
	);
}

export function RestoreDialog({
	detail,
	diff,
	open,
	restoring,
	onCancel,
	onConfirm,
}: {
	detail: RevisionDetail | null;
	diff: DocumentDiff | null;
	open: boolean;
	restoring: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	const sections = diff?.changedSections.length ?? 0;
	return (
		<AlertDialog.Root
			open={open}
			onOpenChange={(next) => {
				if (!next) onCancel();
			}}
		>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className="cms-backdrop fixed inset-0 z-(--z-palette) bg-[rgb(0_0_0/0.35)] dark:bg-[rgb(0_0_0/0.6)]" />
				<AlertDialog.Popup className="cms-dialog-popup cms-glass fixed top-1/2 left-1/2 z-(--z-palette) grid w-[min(460px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[18px] border p-5 text-foreground outline-hidden sm:p-6">
					<div className="flex items-start gap-3">
						<span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-primary-line bg-primary-soft text-primary-text">
							<HistoryIcon className="size-4" />
						</span>
						<div className="grid gap-1.5">
							<AlertDialog.Title className="m-0 text-[17px] font-semibold tracking-[-0.015em]">
								Restore r{detail?.revision} as your draft?
							</AlertDialog.Title>
							<AlertDialog.Description className="m-0 text-[13.5px] leading-relaxed text-muted-foreground">
								Your current draft, unsaved edits included, is replaced with this revision (
								{sections} {sections === 1 ? "section" : "sections"} change). The live site stays as
								it is until you publish.
							</AlertDialog.Description>
						</div>
					</div>
					<div className="flex items-center justify-end gap-2 pt-1">
						<AlertDialog.Close render={<Button variant="outline" size="sm" disabled={restoring} />}>
							Cancel
						</AlertDialog.Close>
						<Button variant="default" size="sm" disabled={restoring} onClick={onConfirm}>
							{restoring ? "Restoring…" : "Restore as draft"}
						</Button>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}
