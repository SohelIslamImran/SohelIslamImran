import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLiveVisitors } from "../../components/cms/analytics/LiveVisitors";
import { RelativeTime } from "../../components/cms/analytics/RelativeTime";
import {
	AnalyticsUnavailable,
	EmptyState,
	PageHeader,
	Panel,
	QuietNote,
	TickingNumber,
	controlClass,
	inlineLinkClass,
	pageClass,
	staggerStyle,
	visitorDayDescription,
} from "../../components/cms/analytics/Widgets";
import { useDraftSelector } from "../../components/cms/draft/context";
import { diffPortfolioDocuments } from "../../components/cms/release/diff";
import { SECTION_GROUPS, SECTIONS } from "../../components/cms/sections/registry";
import {
	ActivityIcon,
	AlertTriangleIcon,
	CheckCircleIcon,
	DiscardIcon,
	HistoryIcon,
	MediaLibraryIcon,
	PublishIcon,
	ReleaseChangesIcon,
	SaveIcon,
	SectionIcon,
	UploadIcon,
} from "../../components/cms/shell/cms-icons";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { getAnalyticsOverview } from "../../server/analytics.functions";
import { listAuditEvents } from "../../server/cms-history.functions";
import type { AuditEventItem } from "../../server/cms-storage.server";

export const Route = createFileRoute("/cms/")({
	loader: () => getAnalyticsOverview().catch(() => null),
	pendingComponent: OverviewSkeleton,
	component: CmsOverview,
});

function OverviewSkeleton() {
	return (
		<div className={pageClass}>
			<div className="grid gap-2">
				<h1 className="sr-only">Overview</h1>
				<div aria-hidden="true" className="cms-skeleton h-8 w-44" />
				<div className="cms-skeleton h-4 w-72 max-w-full" />
			</div>
			<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
				<div className="cms-panel grid gap-3 p-5">
					<div className="cms-skeleton h-4 w-32" />
					<div className="cms-skeleton h-7 w-56" />
					<div className="cms-skeleton h-9 w-40" />
				</div>
				<div className="cms-panel grid gap-2.5 p-5">
					<div className="cms-skeleton h-4 w-28" />
					{[0, 1, 2].map((slot) => (
						<div key={slot} className="cms-skeleton h-10 w-full" />
					))}
				</div>
			</div>
			<div className="cms-skeleton h-[84px] w-full rounded-[18px]" />
			<div className="cms-panel grid gap-4 p-5">
				<div className="cms-skeleton h-5 w-32" />
				<div className="cms-skeleton h-32 w-full" />
			</div>
		</div>
	);
}

function describeCompactEvent(event: AuditEventItem): {
	label: string;
	icon: ReactNode;
	toneClass: string;
} {
	switch (event.eventType) {
		case "draft.publish":
			return {
				label: "Published to live",
				icon: <PublishIcon className="size-3.5" />,
				toneClass: "border-success/35 bg-success/10 text-success",
			};
		case "draft.save":
			return {
				label: "Saved draft",
				icon: <SaveIcon className="size-3.5" />,
				toneClass: "border-primary-line bg-primary-soft text-primary-text",
			};
		case "revision.restore":
			return {
				label: "Restored revision",
				icon: <HistoryIcon className="size-3.5" />,
				toneClass: "border-primary-line bg-primary-soft text-primary-text",
			};
		case "draft.discard":
			return {
				label: "Discarded draft",
				icon: <DiscardIcon className="size-3.5" />,
				toneClass: "border-destructive/35 bg-destructive/10 text-destructive",
			};
		case "media.upload":
			return {
				label: "Uploaded media",
				icon: <UploadIcon className="size-3.5" />,
				toneClass: "border-line-strong bg-muted text-foreground",
			};
		case "media.update_alt":
			return {
				label: "Updated media alt",
				icon: <MediaLibraryIcon className="size-3.5" />,
				toneClass: "border-line-strong bg-muted text-foreground",
			};
		default:
			return {
				label: "Other activity",
				icon: <ActivityIcon className="size-3.5" />,
				toneClass: "border-line-strong bg-muted text-ink-soft",
			};
	}
}

function RecentActivityRow({ event }: { event: AuditEventItem }) {
	const meta = describeCompactEvent(event);

	return (
		<li className="cms-row-hover flex min-w-0 items-center justify-between gap-3 rounded-[10px] px-2 py-1.5">
			<div className="flex min-w-0 items-center gap-2.5">
				<span
					aria-hidden="true"
					className={cn(
						"grid size-7 shrink-0 place-items-center rounded-[8px] border",
						meta.toneClass,
					)}
				>
					{meta.icon}
				</span>
				<span className="truncate text-[13px] font-medium text-foreground">{meta.label}</span>
				{event.revision !== null ? (
					<Link
						to="/cms/history"
						search={{ revision: event.revision }}
						aria-label={`Revision ${event.revision} in history`}
						className="cms-press cms-page-focus inline-flex min-h-7 shrink-0 items-center rounded-full border border-line bg-surface-solid px-2 font-mono text-[11px] tabular-nums text-primary-text no-underline hover:border-primary-line hover:bg-primary-soft pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:justify-center"
					>
						r{event.revision}
					</Link>
				) : null}
			</div>
			<RelativeTime
				iso={event.createdAt}
				className="shrink-0 text-right text-[12px] text-muted-foreground"
			/>
		</li>
	);
}

function DraftVsLiveCard() {
	const draft = useDraftSelector((state) => state.draft);
	const published = useDraftSelector((state) => state.published);
	const publishedAt = useDraftSelector((state) => state.publishedAt);
	const dirty = useDraftSelector((state) => state.dirty);
	const errors = useDraftSelector((state) => state.issues.all.length);

	const diff = useMemo(() => diffPortfolioDocuments(published, draft), [published, draft]);
	const changedSections = diff.changedSections;
	const ahead = useDraftSelector((state) => state.ahead);
	const hasChanges = changedSections.length > 0 || ahead || dirty;
	const tone = errors > 0 ? "error" : hasChanges ? "changes" : "synced";

	return (
		<section
			style={staggerStyle(0)}
			className="cms-panel cms-enter grid min-w-0 content-start gap-4 p-4 sm:p-5"
		>
			<div className="flex min-w-0 items-start gap-3">
				<span
					aria-hidden="true"
					className={cn(
						"grid size-9 shrink-0 place-items-center rounded-[10px] border",
						tone === "error"
							? "border-destructive/35 bg-destructive/10 text-destructive"
							: tone === "changes"
								? "border-primary-line bg-primary-soft text-primary-text"
								: "border-success/35 bg-success/10 text-success",
					)}
				>
					{tone === "error" ? (
						<AlertTriangleIcon className="size-4" />
					) : tone === "changes" ? (
						<ReleaseChangesIcon className="size-4" />
					) : (
						<CheckCircleIcon className="size-4" />
					)}
				</span>
				<div className="grid min-w-0 gap-0.5">
					<h2 className="m-0 text-[17px] font-semibold tracking-[-0.018em] text-foreground">
						{tone === "error"
							? `Fix ${errors} ${errors === 1 ? "issue" : "issues"} before publishing`
							: tone === "changes"
								? diff.totalChanges > 0
									? `${diff.totalChanges} ${diff.totalChanges === 1 ? "change" : "changes"} ready to publish`
									: "Unpublished draft"
								: "Your live site is up to date"}
					</h2>
					<p className="m-0 text-[13px] text-muted-foreground">
						{publishedAt ? (
							<>
								Last published <RelativeTime iso={publishedAt} />
							</>
						) : (
							"Not published yet"
						)}
					</p>
				</div>
			</div>

			{changedSections.length > 0 ? (
				<ul aria-label="Changed sections" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
					{changedSections.slice(0, 6).map((entry) => (
						<li key={entry.section.id}>
							<Link
								to="/cms/content/$section"
								params={{ section: entry.section.id }}
								className="cms-press cms-page-focus inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface-solid px-2.5 text-[12.5px] font-medium text-foreground no-underline hover:border-primary-line hover:text-primary-text pointer-coarse:min-h-11"
							>
								<SectionIcon id={entry.section.id} className="size-3.5 text-primary-text" />
								<span>{entry.section.label}</span>
							</Link>
						</li>
					))}
					{changedSections.length > 6 ? (
						<li>
							<Link
								to="/cms/release"
								className="cms-press cms-page-focus inline-flex min-h-8 items-center rounded-full border border-line bg-muted px-2.5 text-[12.5px] text-ink-soft no-underline hover:text-foreground pointer-coarse:min-h-11"
							>
								{changedSections.length - 6} more
							</Link>
						</li>
					) : null}
				</ul>
			) : null}

			<div className="flex flex-wrap items-center gap-2">
				{hasChanges ? (
					<Button
						variant="default"
						size="sm"
						nativeButton={false}
						render={<Link to="/cms/release" />}
						className="no-underline pointer-coarse:min-h-11"
					>
						<ReleaseChangesIcon className="size-3.5" />
						<span>Review changes</span>
					</Button>
				) : null}
				<Link to="/cms/history" className={controlClass}>
					<HistoryIcon className="size-3.5 text-muted-foreground" />
					<span>History</span>
				</Link>
			</div>
		</section>
	);
}

function RecentActivityCard() {
	const fetchEvents = useServerFn(listAuditEvents);
	const [events, setEvents] = useState<AuditEventItem[] | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void fetchEvents({ data: { limit: 5 } })
			.then((result) => {
				if (!cancelled) setEvents(result.items);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});
		return () => {
			cancelled = true;
		};
	}, [fetchEvents]);

	return (
		<Panel
			title="Recent activity"
			stagger={1}
			action={
				<Link to="/cms/activity" className={inlineLinkClass}>
					<span>View all</span>
					<span aria-hidden="true">→</span>
				</Link>
			}
		>
			{failed ? (
				<p className="m-0 text-[13px] text-muted-foreground">
					Recent activity could not be loaded right now.
				</p>
			) : events === null ? (
				<div className="grid gap-2">
					{[0, 1, 2, 3].map((slot) => (
						<div key={slot} className="cms-skeleton h-10 w-full" />
					))}
				</div>
			) : events.length === 0 ? (
				<EmptyState
					icon={<ActivityIcon className="size-4" />}
					title="No activity yet"
					description="Saves, publishes, restores, and media updates appear here automatically."
					className="py-6"
				/>
			) : (
				<ul className="m-0 grid list-none gap-0.5 p-0">
					{events.map((event) => (
						<RecentActivityRow key={event.id} event={event} />
					))}
				</ul>
			)}
		</Panel>
	);
}

function QuickJumpSections() {
	const changedIds = useDraftSelector((state, store) =>
		SECTIONS.filter((section) => section.paths.some((path) => store.changedAt(path, state))).map(
			(section) => section.id,
		),
	);
	const issueCounts = useDraftSelector((state) =>
		Object.fromEntries(
			SECTIONS.map((section) => [
				section.id,
				section.paths.reduce((sum, path) => sum + state.issues.under(path).length, 0),
			]),
		),
	);
	const changedSet = useMemo(() => new Set<string>(changedIds), [changedIds]);

	return (
		<Panel title="Sections" stagger={3}>
			<div className="grid gap-5">
				{SECTION_GROUPS.map((group) => {
					const groupSections = SECTIONS.filter((section) => section.group === group.id);
					return (
						<div key={group.id} className="grid gap-2.5">
							<h3 className="m-0 text-[12.5px] font-medium text-muted-foreground">{group.label}</h3>
							<div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
								{groupSections.map((section) => {
									const isChanged = changedSet.has(section.id);
									const errors = issueCounts[section.id] ?? 0;
									return (
										<Link
											key={section.id}
											to="/cms/content/$section"
											params={{ section: section.id }}
											className={cn(
												"cms-jump-card cms-page-focus group flex min-w-0 items-start gap-3 rounded-[13px] border p-3.5 no-underline pointer-coarse:min-h-11",
												errors > 0
													? "border-destructive/35 bg-surface-solid"
													: isChanged
														? "border-primary-line/70 bg-surface-solid"
														: "border-line bg-surface-solid",
											)}
										>
											<span
												aria-hidden="true"
												className={cn(
													"grid size-8 shrink-0 place-items-center rounded-[9px] border transition-colors duration-150",
													errors > 0
														? "border-destructive/35 bg-destructive/10 text-destructive"
														: isChanged
															? "border-primary-line bg-primary-soft text-primary-text"
															: "border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] text-muted-foreground group-hover:text-foreground",
												)}
											>
												<SectionIcon id={section.id} className="size-4" />
											</span>
											<div className="grid min-w-0 flex-1 gap-0.5">
												<div className="flex items-center justify-between gap-2">
													<span className="truncate text-[13.5px] font-medium text-foreground">
														{section.label}
													</span>
													{errors > 0 ? (
														<span className="shrink-0 font-mono text-[10.5px] text-destructive">
															! {errors}
														</span>
													) : isChanged ? (
														<span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-medium text-primary-text">
															<span
																aria-hidden="true"
																className="size-1.5 rounded-full bg-primary"
															/>
															Edited
														</span>
													) : (
														<span
															aria-hidden="true"
															className="shrink-0 font-mono text-[11px] text-muted-foreground transition-[translate,color] duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
														>
															→
														</span>
													)}
												</div>
												<p className="m-0 line-clamp-1 text-[12px] text-muted-foreground">
													{section.summary}
												</p>
											</div>
										</Link>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		</Panel>
	);
}

function CmsOverview() {
	return (
		<div className={pageClass}>
			<PageHeader
				title="Overview"
				description="What’s ready to publish, what changed recently, and how the site is doing."
			/>

			<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
				<DraftVsLiveCard />
				<RecentActivityCard />
			</div>

			<TrafficSummary />

			<QuickJumpSections />
		</div>
	);
}

/** One compact traffic row (Active now, Today, Past 7 days) that opens Analytics. */
function TrafficSummary() {
	const overview = Route.useLoaderData();
	const live = useLiveVisitors();
	const active = live.data?.live.count ?? null;

	if (!overview) return <AnalyticsUnavailable />;

	if (overview.allTime.totals.pageviews === 0 && (active ?? 0) === 0) {
		return (
			<QuietNote
				action={
					<Link to="/cms/analytics" className={inlineLinkClass}>
						<span>Analytics</span>
						<span aria-hidden="true">→</span>
					</Link>
				}
			>
				No visits yet. Traffic shows up here once people browse your site.
			</QuietNote>
		);
	}

	const stats = [
		{ label: "Active now", value: active, title: "Open tabs in the last 2 minutes" },
		{ label: "Today", value: overview.today.value, title: "Visitors since midnight UTC" },
		{
			label: "Past 7 days",
			value: overview.week.value,
			title: `Visitor-days over the last 7 completed UTC days. ${visitorDayDescription}`,
		},
	];

	return (
		<Link
			to="/cms/analytics"
			style={staggerStyle(2)}
			aria-label={`Traffic: ${stats.map((stat) => `${stat.label} ${stat.value ?? "unknown"}`).join(", ")}. Open analytics`}
			className="cms-panel cms-jump-card cms-enter cms-page-focus group flex min-w-0 items-center gap-4 p-4 no-underline sm:px-5"
		>
			<dl className="m-0 grid min-w-0 flex-1 grid-cols-3 gap-3">
				{stats.map((stat) => (
					<div key={stat.label} title={stat.title} className="grid min-w-0 gap-1">
						<dt className="truncate text-[12.5px] font-medium text-muted-foreground">
							{stat.label}
						</dt>
						<dd className="m-0 text-[24px] leading-none font-semibold tracking-[-0.03em] text-foreground">
							<TickingNumber value={stat.value} />
						</dd>
					</div>
				))}
			</dl>
			<span className="hidden shrink-0 items-center gap-1 text-[13px] font-medium text-primary-text sm:inline-flex">
				Analytics
				<span
					aria-hidden="true"
					className="transition-[translate,color] duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
				>
					→
				</span>
			</span>
			<span aria-hidden="true" className="text-[15px] text-muted-foreground sm:hidden">
				→
			</span>
		</Link>
	);
}
