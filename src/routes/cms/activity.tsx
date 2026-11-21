/**
 * Activity log page (`/cms/activity`, served at `/activity` on the CMS host).
 * Displays owner audit events (save, publish, restore, discard, media updates)
 * with explicit event icons + text, revision links, and hydration-safe times.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import {
	ActivityIcon,
	DiscardIcon,
	HistoryIcon,
	MediaLibraryIcon,
	PublishIcon,
	SaveIcon,
	UploadIcon,
} from "../../components/cms/shell/cms-icons";
import { formatUtcTimestamp, useRelativeTime } from "../../components/cms/shell/time";
import { listAuditEvents } from "../../server/cms-history.functions";
import type { AuditEventItem } from "../../server/cms-storage.server";

export const Route = createFileRoute("/cms/activity")({
	head: () => ({
		meta: [{ title: "Activity log · Control plane" }],
	}),
	component: ActivityRoute,
});

type FilterKind = "all" | "publish" | "save" | "restore" | "media";

function describeEvent(event: AuditEventItem): {
	label: string;
	detail?: string;
	icon: ReactNode;
	toneClass: string;
} {
	switch (event.eventType) {
		case "draft.publish":
			return {
				label: "Published to live",
				icon: <PublishIcon className="size-4" />,
				toneClass: "border-success/35 bg-success/10 text-success",
			};
		case "draft.save":
			return {
				label: "Draft saved",
				icon: <SaveIcon className="size-4" />,
				toneClass: "border-primary-line bg-primary-soft text-primary-text",
			};
		case "revision.restore": {
			const sourceKind =
				typeof event.details?.sourceKind === "string" ? event.details.sourceKind : null;
			const sourceRev =
				typeof event.details?.sourceRevision === "number" ? event.details.sourceRevision : null;
			return {
				label: "Restored revision",
				detail: sourceKind && sourceRev !== null ? `from ${sourceKind} r${sourceRev}` : undefined,
				icon: <HistoryIcon className="size-4" />,
				toneClass: "border-primary-line bg-primary-soft text-primary-text",
			};
		}
		case "draft.discard": {
			const liveRev =
				typeof event.details?.publishedRevision === "number"
					? event.details.publishedRevision
					: null;
			return {
				label: "Discarded draft",
				detail: liveRev !== null ? `reset to live r${liveRev}` : undefined,
				icon: <DiscardIcon className="size-4" />,
				toneClass: "border-destructive/35 bg-destructive/10 text-destructive",
			};
		}
		case "media.upload": {
			const assetId = typeof event.details?.assetId === "string" ? event.details.assetId : null;
			return {
				label: "Uploaded media",
				detail: assetId ? `asset ${assetId.slice(0, 12)}` : undefined,
				icon: <UploadIcon className="size-4" />,
				toneClass: "border-line-strong bg-muted text-foreground",
			};
		}
		case "media.update_alt": {
			const assetId = typeof event.details?.assetId === "string" ? event.details.assetId : null;
			return {
				label: "Updated media alt text",
				detail: assetId ? `asset ${assetId.slice(0, 12)}` : undefined,
				icon: <MediaLibraryIcon className="size-4" />,
				toneClass: "border-line-strong bg-muted text-foreground",
			};
		}
		default:
			return {
				label: event.eventType,
				icon: <ActivityIcon className="size-4" />,
				toneClass: "border-line-strong bg-muted text-ink-soft",
			};
	}
}

function matchesFilter(event: AuditEventItem, filter: FilterKind): boolean {
	if (filter === "all") return true;
	if (filter === "publish") return event.eventType === "draft.publish";
	if (filter === "save") return event.eventType === "draft.save";
	if (filter === "restore")
		return event.eventType === "revision.restore" || event.eventType === "draft.discard";
	if (filter === "media") return event.eventType.startsWith("media.");
	return true;
}

function EventRow({ event }: { event: AuditEventItem }) {
	const meta = describeEvent(event);
	const relative = useRelativeTime(event.createdAt, 30_000);

	return (
		<li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
			<div className="flex min-w-0 items-center gap-3">
				<span
					className={cn(
						"grid size-8 shrink-0 place-items-center rounded-[10px] border",
						meta.toneClass,
					)}
				>
					{meta.icon}
				</span>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-[13.5px] font-medium text-foreground">{meta.label}</span>
						{meta.detail ? (
							<span className="font-mono text-[11.5px] text-muted-foreground">{meta.detail}</span>
						) : null}
						{event.revision !== null ? (
							<Link
								to="/cms/history"
								search={{ revision: event.revision }}
								className="inline-flex items-center rounded-full border border-line bg-surface-solid px-2 py-0.5 font-mono text-[11px] tabular-nums text-primary-text no-underline hover:border-primary-line hover:bg-primary-soft"
							>
								r{event.revision}
							</Link>
						) : null}
					</div>
					<p className="m-0 mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground">
						{event.actorEmail}
					</p>
				</div>
			</div>

			<time
				dateTime={event.createdAt}
				title={formatUtcTimestamp(event.createdAt)}
				className="shrink-0 font-mono text-[11.5px] tabular-nums text-muted-foreground"
			>
				{relative ?? formatUtcTimestamp(event.createdAt)}
			</time>
		</li>
	);
}

function ActivityRoute() {
	const fetchEvents = useServerFn(listAuditEvents);
	const [events, setEvents] = useState<AuditEventItem[]>([]);
	const [nextBefore, setNextBefore] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<FilterKind>("all");

	const loadInitial = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await fetchEvents({ data: { limit: 40 } });
			setEvents(result.items);
			setNextBefore(result.nextBefore);
		} catch {
			setError("Could not load activity events.");
		} finally {
			setLoading(false);
		}
	}, [fetchEvents]);

	useEffect(() => {
		void loadInitial();
	}, [loadInitial]);

	const loadMore = async () => {
		if (!nextBefore || loadingMore) return;
		setLoadingMore(true);
		try {
			const result = await fetchEvents({ data: { limit: 40, before: nextBefore } });
			setEvents((prev) => [...prev, ...result.items]);
			setNextBefore(result.nextBefore);
		} catch {
			setError("Could not load older activity events.");
		} finally {
			setLoadingMore(false);
		}
	};

	const visible = useMemo(
		() => events.filter((event) => matchesFilter(event, filter)),
		[events, filter],
	);

	return (
		<div className="grid max-w-[920px] gap-6">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div className="grid gap-1.5">
					<p className="mono-label m-0 text-primary-text">Release · audit trail</p>
					<h1 className="m-0 text-headline">Activity log</h1>
					<p className="m-0 text-[14px] text-muted-foreground">
						Recorded metadata for every save, publish, restore, discard, and media update. No
						document body is stored here.
					</p>
				</div>

				<div
					role="group"
					aria-label="Filter activity"
					className="inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-surface-solid p-1"
				>
					{(
						[
							{ id: "all", label: "All" },
							{ id: "publish", label: "Publishes" },
							{ id: "save", label: "Saves" },
							{ id: "restore", label: "Restores" },
							{ id: "media", label: "Media" },
						] as const
					).map((option) => (
						<button
							key={option.id}
							type="button"
							aria-pressed={filter === option.id}
							onClick={() => setFilter(option.id)}
							className={cn(
								"min-h-8 rounded-full px-3 text-[12.5px] font-medium transition-colors duration-150 pointer-coarse:min-h-10",
								filter === option.id
									? "bg-foreground text-background"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{option.label}
						</button>
					))}
				</div>
			</header>

			<section className="cms-panel overflow-hidden">
				{error ? (
					<div className="p-5 text-[13.5px] text-destructive">{error}</div>
				) : loading ? (
					<div className="grid gap-2 p-4">
						{[0, 1, 2, 3, 4].map((slot) => (
							<div key={slot} className="skeleton h-14 rounded-[10px]" />
						))}
					</div>
				) : visible.length === 0 ? (
					<div className="grid place-items-center gap-2 px-6 py-12 text-center">
						<span className="grid size-10 place-items-center rounded-full border border-line bg-muted text-muted-foreground">
							<ActivityIcon className="size-4" />
						</span>
						<p className="m-0 text-[14.5px] font-medium text-foreground">
							No activity recorded yet
						</p>
						<p className="m-0 max-w-[42ch] text-[13px] text-muted-foreground">
							Draft saves, publishes, restores, discards, and media updates appear here
							automatically.
						</p>
					</div>
				) : (
					<ul className="m-0 list-none divide-y divide-line p-0">
						{visible.map((event) => (
							<EventRow key={event.id} event={event} />
						))}
					</ul>
				)}
			</section>

			{nextBefore ? (
				<div className="flex justify-center">
					<Button
						variant="outline"
						size="sm"
						disabled={loadingMore}
						onClick={() => void loadMore()}
					>
						{loadingMore ? "Loading…" : "Load older events"}
					</Button>
				</div>
			) : null}
		</div>
	);
}
