/**
 * One description of every audit event, shared by Overview's Recent activity
 * and the Activity page so the same event reads the same everywhere.
 */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";
import type { AuditEventItem } from "../../../server/cms-storage.server";
import {
	ActivityIcon,
	DiscardIcon,
	HistoryIcon,
	MediaLibraryIcon,
	PublishIcon,
	SaveIcon,
	UploadIcon,
} from "../shell/cms-icons";

export interface AuditEventDescription {
	label: string;
	/** Quiet text after the label ("back to live"). */
	detail?: string;
	icon: (className: string) => ReactNode;
	toneClass: string;
	/** The one revision worth linking for this event, if any. */
	revision: number | null;
}

const numberDetail = (event: AuditEventItem, key: string) =>
	typeof event.details?.[key] === "number" ? (event.details[key] as number) : null;

export function describeAuditEvent(event: AuditEventItem): AuditEventDescription {
	switch (event.eventType) {
		case "draft.publish":
			return {
				label: "Published to live",
				icon: (className) => <PublishIcon className={className} />,
				toneClass: "border-success/35 bg-success/10 text-success",
				revision: event.revision,
			};
		case "draft.save":
			return {
				label: "Draft saved",
				icon: (className) => <SaveIcon className={className} />,
				toneClass: "border-primary-line bg-primary-soft text-primary-text",
				revision: event.revision,
			};
		case "revision.restore": {
			// Link the revision that was restored; the new draft is simply "your draft".
			const source = numberDetail(event, "sourceRevision");
			const kind = typeof event.details?.sourceKind === "string" ? event.details.sourceKind : null;
			return {
				label: "Revision restored",
				detail: source !== null && kind ? `from ${kind}` : undefined,
				icon: (className) => <HistoryIcon className={className} />,
				toneClass: "border-primary-line bg-primary-soft text-primary-text",
				revision: source ?? event.revision,
			};
		}
		case "draft.discard": {
			const live = numberDetail(event, "publishedRevision");
			return {
				label: "Draft discarded",
				detail: live !== null ? "back to live" : undefined,
				icon: (className) => <DiscardIcon className={className} />,
				toneClass: "border-destructive/35 bg-destructive/10 text-destructive",
				revision: live ?? event.revision,
			};
		}
		case "media.upload":
			return {
				label: "Media uploaded",
				icon: (className) => <UploadIcon className={className} />,
				toneClass: "border-line-strong bg-muted text-foreground",
				revision: null,
			};
		case "media.update_alt":
			return {
				label: "Alt text updated",
				icon: (className) => <MediaLibraryIcon className={className} />,
				toneClass: "border-line-strong bg-muted text-foreground",
				revision: null,
			};
		default:
			return {
				label: "Other activity",
				icon: (className) => <ActivityIcon className={className} />,
				toneClass: "border-line-strong bg-muted text-ink-soft",
				revision: event.revision,
			};
	}
}

/** Icon tile, label, optional detail, and one revision link. */
export function AuditEventSummary({
	event,
	compact = false,
}: {
	event: AuditEventItem;
	compact?: boolean;
}) {
	const meta = describeAuditEvent(event);
	return (
		<div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
			<span
				aria-hidden="true"
				className={cn(
					"grid shrink-0 place-items-center border",
					compact ? "size-7 rounded-[8px]" : "size-8 rounded-[10px]",
					meta.toneClass,
				)}
			>
				{meta.icon(compact ? "size-3.5" : "size-4")}
			</span>
			<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
				<span
					className={cn(
						"truncate font-medium text-foreground",
						compact ? "text-[13px]" : "text-[13.5px]",
					)}
				>
					{meta.label}
				</span>
				{meta.detail ? (
					<span className="text-[12.5px] text-muted-foreground">{meta.detail}</span>
				) : null}
				{meta.revision !== null ? (
					<Link
						to="/cms/history"
						search={{ revision: meta.revision }}
						aria-label={`Revision ${meta.revision} in history`}
						className="group/revision cms-press cms-page-focus inline-flex shrink-0 items-center justify-center rounded-full no-underline pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:justify-start"
					>
						<span className="inline-flex min-h-7 items-center rounded-full border border-line bg-surface-solid px-2 font-mono text-[11.5px] text-primary-text tabular-nums group-hover/revision:border-primary-line group-hover/revision:bg-primary-soft">
							r{meta.revision}
						</span>
					</Link>
				) : null}
			</div>
		</div>
	);
}
