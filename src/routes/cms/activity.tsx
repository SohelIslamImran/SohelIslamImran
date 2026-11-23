/**
 * Activity log page (`/cms/activity`, served at `/activity` on the CMS host).
 * Owner audit events grouped by UTC day, newest first. Filters run on the
 * server, so a filter's list, pagination, and empty state cover every event,
 * not just the loaded page.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	EmptyState,
	PageHeader,
	SegmentedControl,
	controlClass,
	pageClass,
	staggerStyle,
} from "../../components/cms/analytics/Widgets";
import { RelativeTime } from "../../components/cms/analytics/RelativeTime";
import { useDraftSelector } from "../../components/cms/draft/context";
import { AuditEventSummary } from "../../components/cms/history/audit-events";
import { ActivityIcon, AlertTriangleIcon } from "../../components/cms/shell/cms-icons";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { listAuditEvents } from "../../server/cms-history.functions";
import type { AuditEventItem, AuditEventKind } from "../../server/cms-storage.server";

export const Route = createFileRoute("/cms/activity")({
	head: () => ({
		meta: [{ title: "Activity · Control plane" }],
	}),
	component: ActivityRoute,
});

type FilterKind = "all" | AuditEventKind;

const FILTERS: ReadonlyArray<{ value: FilterKind; label: string; empty: string }> = [
	{ value: "all", label: "All", empty: "No activity recorded yet" },
	{ value: "publish", label: "Publishes", empty: "No publishes yet" },
	{ value: "save", label: "Saves", empty: "No saves yet" },
	{ value: "restore", label: "Restores", empty: "No restores yet" },
	{ value: "discard", label: "Discards", empty: "No discards yet" },
	{ value: "media", label: "Media", empty: "No media changes yet" },
];

const PAGE_SIZE = 40;

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

function EventRow({ event, stagger }: { event: AuditEventItem; stagger: number }) {
	return (
		<li
			style={staggerStyle(stagger)}
			className="cms-enter flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"
		>
			<AuditEventSummary event={event} />
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
	const [moreError, setMoreError] = useState(false);
	const [filter, setFilter] = useState<FilterKind>("all");
	const request = useRef(0);
	const [todayKeys, setTodayKeys] = useState<{ today: string; yesterday: string } | null>(null);

	// Hydration-safe "Today" / "Yesterday" labels (populated post-mount only).
	useEffect(() => {
		const now = Date.now();
		setTodayKeys({
			today: new Date(now).toISOString().slice(0, 10),
			yesterday: new Date(now - 86_400_000).toISOString().slice(0, 10),
		});
	}, []);

	const loadInitial = useCallback(
		async (kind: FilterKind) => {
			const current = ++request.current;
			setLoading(true);
			setError(null);
			setMoreError(false);
			try {
				const result = await fetchEvents({
					data: { limit: PAGE_SIZE, kind: kind === "all" ? undefined : kind },
				});
				if (current !== request.current) return;
				setEvents(result.items);
				setNextBefore(result.nextBefore);
			} catch {
				if (current === request.current) setError("Could not load activity events.");
			} finally {
				if (current === request.current) setLoading(false);
			}
		},
		[fetchEvents],
	);

	// Saves, publishes, restores, and discards move a revision and add an event.
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);

	useEffect(() => {
		void loadInitial(filter);
	}, [filter, loadInitial, draftRevision, publishedRevision]);

	// A failed "Load older" keeps the list and offers a retry beside the button.
	const loadMore = async () => {
		if (!nextBefore || loadingMore || loading) return;
		const current = request.current;
		setLoadingMore(true);
		setMoreError(false);
		try {
			const result = await fetchEvents({
				data: {
					limit: PAGE_SIZE,
					before: nextBefore,
					kind: filter === "all" ? undefined : filter,
				},
			});
			if (current !== request.current) return;
			setEvents((prev) => [...prev, ...result.items]);
			setNextBefore(result.nextBefore);
		} catch {
			if (current === request.current) setMoreError(true);
		} finally {
			setLoadingMore(false);
		}
	};

	const visible = events;
	const filterMeta = FILTERS.find((entry) => entry.value === filter) ?? FILTERS[0]!;

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
				description="Draft and media changes, newest first."
				actions={
					<SegmentedControl
						layoutId="cms-activity-filter-pill"
						ariaLabel="Filter activity"
						value={filter}
						onChange={setFilter}
						options={FILTERS.map(({ value, label }) => ({ value, label }))}
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
							<button
								type="button"
								className={controlClass}
								onClick={() => void loadInitial(filter)}
							>
								Try again
							</button>
						}
					/>
				</section>
			) : loading && visible.length === 0 ? (
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
						title={filterMeta.empty}
						description={
							filter === "all"
								? "Draft saves, publishes, restores, discards, and media updates appear here automatically."
								: "Try another filter, or show every event."
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
				<div
					aria-busy={loading}
					className={cn("grid gap-5 transition-opacity duration-200", loading && "opacity-55")}
				>
					{groupedByDay.map((group, groupIndex) => (
						<section key={group.dayKey} className="cms-panel overflow-hidden">
							<h2 className="m-0 border-b border-line px-4 py-2.5 text-[16px] font-semibold tracking-[-0.01em] sm:px-5">
								{/* After hydration the date may become "Today"; fade the swap. */}
								<DayLabel
									label={formatDayHeading(
										group.dayKey,
										todayKeys?.today ?? null,
										todayKeys?.yesterday ?? null,
									)}
								/>
							</h2>
							<ul className="m-0 list-none divide-y divide-line p-0">
								{group.items.map((event, index) => (
									<EventRow
										key={event.id}
										event={event}
										stagger={Math.min((groupOffsets[groupIndex] ?? 0) + index, 10)}
									/>
								))}
							</ul>
						</section>
					))}
				</div>
			)}

			{nextBefore && !error ? (
				<div className="flex flex-wrap items-center justify-center gap-3">
					{moreError ? (
						<p
							role="status"
							className="m-0 inline-flex items-center gap-1.5 text-[13px] text-destructive"
						>
							<AlertTriangleIcon className="size-3.5 shrink-0" />
							Could not load older events.
						</p>
					) : null}
					<Button
						variant="outline"
						size="sm"
						disabled={loadingMore || loading}
						onClick={() => void loadMore()}
						className="pointer-coarse:min-h-11"
					>
						{loadingMore ? "Loading…" : moreError ? "Try again" : "Load older events"}
					</Button>
				</div>
			) : null}
		</div>
	);
}

function DayLabel({ label }: { label: string }) {
	const first = useRef(label);
	return (
		<span key={label} className={label === first.current ? undefined : "cms-time-in"}>
			{label}
		</span>
	);
}
