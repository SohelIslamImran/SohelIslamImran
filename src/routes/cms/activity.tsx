/**
 * Activity log page (`/cms/activity`, served at `/activity` on the CMS host).
 * Displays owner audit events grouped cleanly by UTC day with explicit event
 * icons, relative times, revision links, and subtle staggered row entrance.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RelativeTime } from "../../components/cms/analytics/RelativeTime";
import {
	EmptyState,
	PageHeader,
	SegmentedControl,
	controlClass,
	pageClass,
	staggerStyle,
} from "../../components/cms/analytics/Widgets";
import {
	ActivityIcon,
	AlertTriangleIcon,
	DiscardIcon,
	HistoryIcon,
	MediaLibraryIcon,
	PublishIcon,
	SaveIcon,
	UploadIcon,
} from "../../components/cms/shell/cms-icons";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { listAuditEvents } from "../../server/cms-history.functions";
import type { AuditEventItem } from "../../server/cms-storage.server";

export const Route = createFileRoute("/cms/activity")({
	head: () => ({
		meta: [{ title: "Activity · Control plane" }],
	}),
	component: ActivityRoute,
});

type FilterKind = "all" | "publish" | "save" | "restore" | "media";

const dayFormatter = new Intl.DateTimeFormat("en", {
	weekday: "short",
	month: "short",
	day: "numeric",
	year: "numeric",
	timeZone: "UTC",
});

function utcDayKey(iso: string): string {
	return iso.slice(0, 10);
}

function formatDayHeading(dayKey: string, todayKey: string | null, yesterdayKey: string | null) {
	if (todayKey && dayKey === todayKey) return "Today";
	if (yesterdayKey && dayKey === yesterdayKey) return "Yesterday";
	const parsed = Date.parse(`${dayKey}T00:00:00.000Z`);
	return Number.isFinite(parsed) ? dayFormatter.format(new Date(parsed)) : dayKey;
}

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
				detail: liveRev !== null ? `back to live r${liveRev}` : undefined,
				icon: <DiscardIcon className="size-4" />,
				toneClass: "border-destructive/35 bg-destructive/10 text-destructive",
			};
		}
		case "media.upload": {
			return {
				label: "Uploaded media",
				icon: <UploadIcon className="size-4" />,
				toneClass: "border-line-strong bg-muted text-foreground",
			};
		}
		case "media.update_alt": {
			return {
				label: "Updated media alt text",
				icon: <MediaLibraryIcon className="size-4" />,
				toneClass: "border-line-strong bg-muted text-foreground",
			};
		}
		default:
			return {
				label: "Other activity",
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

function EventRow({ event, stagger }: { event: AuditEventItem; stagger: number }) {
	const meta = describeEvent(event);

	return (
		<li
			style={staggerStyle(stagger)}
			className="cms-enter cms-row-hover flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"
		>
			<div className="flex min-w-0 items-center gap-3">
				<span
					aria-hidden="true"
					className={cn(
						"grid size-8 shrink-0 place-items-center rounded-[10px] border",
						meta.toneClass,
					)}
				>
					{meta.icon}
				</span>
				<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
					<span className="text-[13.5px] font-medium text-foreground">{meta.label}</span>
					{meta.detail ? (
						<span className="text-[12.5px] text-muted-foreground">{meta.detail}</span>
					) : null}
					{event.revision !== null ? (
						<Link
							to="/cms/history"
							search={{ revision: event.revision }}
							aria-label={`Revision ${event.revision} in history`}
							className="cms-press cms-page-focus inline-flex min-h-7 items-center gap-1 rounded-full border border-line bg-surface-solid px-2 font-mono text-[11.5px] tabular-nums text-primary-text no-underline hover:border-primary-line hover:bg-primary-soft pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:justify-center"
						>
							r{event.revision}
						</Link>
					) : null}
				</div>
			</div>

			<RelativeTime
				iso={event.createdAt}
				className="shrink-0 text-right text-[12.5px] text-muted-foreground"
			/>
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
	const [todayKeys, setTodayKeys] = useState<{ today: string; yesterday: string } | null>(null);

	// Hydration-safe "Today" / "Yesterday" labels (populated post-mount only).
	useEffect(() => {
		const now = Date.now();
		setTodayKeys({
			today: new Date(now).toISOString().slice(0, 10),
			yesterday: new Date(now - 86_400_000).toISOString().slice(0, 10),
		});
	}, []);

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

	const groupedByDay = useMemo(() => {
		const groups: Array<{ dayKey: string; items: AuditEventItem[] }> = [];
		for (const event of visible) {
			const dayKey = utcDayKey(event.createdAt);
			const lastGroup = groups[groups.length - 1];
			if (lastGroup && lastGroup.dayKey === dayKey) {
				lastGroup.items.push(event);
			} else {
				groups.push({ dayKey, items: [event] });
			}
		}
		return groups;
	}, [visible]);

	const filterCounts = useMemo(
		() => ({
			all: events.length,
			publish: events.filter((e) => matchesFilter(e, "publish")).length,
			save: events.filter((e) => matchesFilter(e, "save")).length,
			restore: events.filter((e) => matchesFilter(e, "restore")).length,
			media: events.filter((e) => matchesFilter(e, "media")).length,
		}),
		[events],
	);

	// Stagger index of each group's first row, so rows enter in reading order.
	const groupOffsets = useMemo(() => {
		let offset = 0;
		return groupedByDay.map((group) => {
			const start = offset;
			offset += group.items.length;
			return start;
		});
	}, [groupedByDay]);

	return (
		<div className={pageClass}>
			<PageHeader
				title="Activity"
				description="Every save, publish, restore, and media change, newest first."
				actions={
					<SegmentedControl
						layoutId="cms-activity-filter-pill"
						ariaLabel="Filter activity"
						value={filter}
						onChange={setFilter}
						options={[
							{ value: "all", label: "All", badge: loading ? undefined : filterCounts.all },
							{
								value: "publish",
								label: "Publishes",
								badge: loading || filterCounts.publish === 0 ? undefined : filterCounts.publish,
							},
							{
								value: "save",
								label: "Saves",
								badge: loading || filterCounts.save === 0 ? undefined : filterCounts.save,
							},
							{
								value: "restore",
								label: "Restores",
								badge: loading || filterCounts.restore === 0 ? undefined : filterCounts.restore,
							},
							{
								value: "media",
								label: "Media",
								badge: loading || filterCounts.media === 0 ? undefined : filterCounts.media,
							},
						]}
					/>
				}
			/>

			{error ? (
				<section className="cms-panel">
					<EmptyState
						icon={<AlertTriangleIcon className="size-4 text-destructive" />}
						title="Could not load activity"
						description={error}
						action={
							<button type="button" className={controlClass} onClick={() => void loadInitial()}>
								Try again
							</button>
						}
					/>
				</section>
			) : loading ? (
				<div className="grid gap-4">
					<div className="cms-skeleton h-4 w-28" />
					<section className="cms-panel grid gap-2.5 p-4">
						{[0, 1, 2, 3, 4].map((slot) => (
							<div key={slot} className="cms-skeleton h-14 w-full rounded-[10px]" />
						))}
					</section>
				</div>
			) : visible.length === 0 ? (
				<section className="cms-panel cms-enter">
					<EmptyState
						icon={<ActivityIcon className="size-5" />}
						title={filter === "all" ? "No activity recorded yet" : `No ${filter} events yet`}
						description={
							filter === "all"
								? "Draft saves, publishes, restores, discards, and media updates appear here automatically."
								: "Try another filter or show every recorded audit event."
						}
						action={
							filter !== "all" ? (
								<button type="button" className={controlClass} onClick={() => setFilter("all")}>
									Show all activity
								</button>
							) : (
								<Link to="/cms" activeOptions={{ exact: true }} className={controlClass}>
									Back to overview
								</Link>
							)
						}
					/>
				</section>
			) : (
				<div className="grid gap-5">
					{groupedByDay.map((group, groupIndex) => (
						<section key={group.dayKey} className="grid gap-2">
							<h2 className="m-0 px-1 text-[13px] font-semibold text-muted-foreground">
								{formatDayHeading(
									group.dayKey,
									todayKeys?.today ?? null,
									todayKeys?.yesterday ?? null,
								)}
							</h2>
							<div className="cms-panel overflow-hidden">
								<ul className="m-0 list-none divide-y divide-line p-0">
									{group.items.map((event, index) => (
										<EventRow
											key={event.id}
											event={event}
											stagger={Math.min((groupOffsets[groupIndex] ?? 0) + index, 10)}
										/>
									))}
								</ul>
							</div>
						</section>
					))}
				</div>
			)}

			{nextBefore ? (
				<div className="flex justify-center">
					<Button
						variant="outline"
						size="sm"
						disabled={loadingMore}
						onClick={() => void loadMore()}
						className="pointer-coarse:min-h-11"
					>
						{loadingMore ? "Loading…" : "Load older events"}
					</Button>
				</div>
			) : null}
		</div>
	);
}
