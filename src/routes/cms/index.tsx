/**
 * Overview (`/cms`): one status line for the draft (with the sections that
 * changed or need fixing), recent activity, and a compact traffic row. The
 * rail already lists every section and the live visitor count, so this page
 * doesn't repeat them.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { RelativeTime } from "../../components/cms/analytics/RelativeTime";
import {
	AnalyticsUnavailable,
	EmptyState,
	PageHeader,
	Panel,
	QuietNote,
	TickingNumber,
	inlineLinkClass,
	pageClass,
	staggerStyle,
	visitorDayDescription,
} from "../../components/cms/analytics/Widgets";
import { useDraftSelector } from "../../components/cms/draft/context";
import { AuditEventSummary } from "../../components/cms/history/audit-events";
import { diffPortfolioDocuments } from "../../components/cms/release/diff";
import { SECTIONS } from "../../components/cms/sections/registry";
import {
	ActivityIcon,
	AlertTriangleIcon,
	CheckCircleIcon,
	HistoryIcon,
	ReleaseChangesIcon,
	SectionIcon,
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
				<div className="grid gap-4">
					<div className="cms-panel flex items-center gap-3 px-5 py-3">
						<div className="cms-skeleton size-9 rounded-[10px]" />
						<div className="cms-skeleton h-5 w-56 max-w-full" />
					</div>
					<div className="cms-skeleton h-[84px] w-full rounded-[18px]" />
				</div>
				<div className="cms-panel grid gap-2.5 p-5">
					<div className="cms-skeleton h-4 w-28" />
					{[0, 1, 2].map((slot) => (
						<div key={slot} className="cms-skeleton h-10 w-full" />
					))}
				</div>
			</div>
		</div>
	);
}

function RecentActivityRow({ event }: { event: AuditEventItem }) {
	return (
		<li className="flex min-w-0 items-center justify-between gap-3 px-2 py-1.5">
			<AuditEventSummary event={event} compact />
			<RelativeTime
				iso={event.createdAt}
				className="shrink-0 text-right text-[12px] text-muted-foreground"
			/>
		</li>
	);
}

function DraftStatus() {
	const draft = useDraftSelector((state) => state.draft);
	const published = useDraftSelector((state) => state.published);
	const dirty = useDraftSelector((state) => state.dirty);
	const ahead = useDraftSelector((state) => state.ahead);
	const errors = useDraftSelector((state) => state.issues.all.length);
	const issueCounts = useDraftSelector((state) =>
		Object.fromEntries(
			SECTIONS.map((section) => [
				section.id,
				section.paths.reduce((sum, path) => sum + state.issues.under(path).length, 0),
			]),
		),
	);

	const diff = useMemo(() => diffPortfolioDocuments(published, draft), [published, draft]);
	const hasChanges = diff.changedSections.length > 0 || ahead || dirty;
	const tone = errors > 0 ? "error" : hasChanges ? "changes" : "synced";
	// Sections worth a jump: anything edited, plus anything that needs fixing.
	const changedIds = new Set(diff.changedSections.map((entry) => entry.section.id));
	const attention = SECTIONS.filter(
		(section) => changedIds.has(section.id) || (issueCounts[section.id] ?? 0) > 0,
	);

	const icon = (
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
	);

	// In sync: one quiet line, no box of buttons.
	if (tone === "synced") {
		return (
			<section
				style={staggerStyle(0)}
				className="cms-panel cms-enter flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5"
			>
				{icon}
				<h2 className="m-0 min-w-0 flex-1 text-[15px] font-semibold tracking-[-0.012em] text-foreground">
					Live site is up to date
				</h2>
				<Link to="/cms/history" className={inlineLinkClass}>
					<HistoryIcon className="size-3.5" />
					<span>History</span>
				</Link>
			</section>
		);
	}

	return (
		<section
			style={staggerStyle(0)}
			className="cms-panel cms-enter grid min-w-0 content-start gap-4 p-4 sm:p-5"
		>
			<div className="flex min-w-0 flex-wrap items-center gap-3">
				<div className="flex min-w-[200px] flex-1 items-center gap-3">
					{icon}
					<h2 className="m-0 min-w-0 flex-1 text-[17px] font-semibold tracking-[-0.018em] text-foreground">
						{tone === "error"
							? `Fix ${errors} ${errors === 1 ? "issue" : "issues"} before publishing`
							: diff.totalChanges > 0
								? `${diff.totalChanges} ${diff.totalChanges === 1 ? "change" : "changes"} ready to publish`
								: "Unpublished draft"}
					</h2>
				</div>
				<Button
					variant="outline"
					size="sm"
					nativeButton={false}
					render={<Link to="/cms/release" />}
					className="no-underline pointer-coarse:min-h-11"
				>
					<ReleaseChangesIcon className="size-3.5" />
					<span>Review changes</span>
				</Button>
			</div>

			{attention.length > 0 ? (
				<ul aria-label="Sections to review" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
					{attention.map((section) => {
						const issues = issueCounts[section.id] ?? 0;
						return (
							<li key={section.id}>
								<Link
									to="/cms/content/$section"
									params={{ section: section.id }}
									className={cn(
										"cms-press cms-page-focus inline-flex min-h-8 items-center gap-1.5 rounded-full border bg-surface-solid px-2.5 text-[12.5px] font-medium text-foreground no-underline pointer-coarse:min-h-11",
										issues > 0
											? "border-destructive/40 hover:border-destructive/70"
											: "border-line-strong hover:border-primary-line hover:text-primary-text",
									)}
								>
									<SectionIcon
										id={section.id}
										className={cn(
											"size-3.5",
											issues > 0 ? "text-destructive" : "text-primary-text",
										)}
									/>
									<span>{section.label}</span>
									{issues > 0 ? (
										<span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-destructive">
											<AlertTriangleIcon className="size-3" />
											{issues}
											<span className="sr-only"> {issues === 1 ? "issue" : "issues"}</span>
										</span>
									) : (
										<span className="sr-only"> (edited)</span>
									)}
								</Link>
							</li>
						);
					})}
				</ul>
			) : null}
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
					description="Saves, publishes, restores, discards, and media updates appear here automatically."
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

function CmsOverview() {
	return (
		<div className={pageClass}>
			<PageHeader
				title="Overview"
				description="What’s ready to publish, what changed recently, and how the site is doing."
			/>

			<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
				<div className="grid min-w-0 content-start gap-4">
					<DraftStatus />
					<TrafficSummary />
				</div>
				<RecentActivityCard />
			</div>
		</div>
	);
}

/** One compact traffic row (Today, Past 7 days) that opens Analytics; Live now is in the rail. */
function TrafficSummary() {
	const overview = Route.useLoaderData();

	if (!overview) return <AnalyticsUnavailable />;

	if (overview.allTime.totals.pageviews === 0 && overview.today.value === 0) {
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
			<dl className="m-0 grid min-w-0 flex-1 grid-cols-2 gap-3">
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
					className="transition-[translate,color] duration-150 group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:group-hover:translate-x-0"
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
