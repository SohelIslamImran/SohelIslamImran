import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLiveVisitors } from "../../components/cms/analytics/LiveVisitors";
import { TrafficChart } from "../../components/cms/analytics/TrafficChart";
import {
	AnalyticsUnavailable,
	EmptyState,
	Kpi,
	LiveControls,
	NoVisits,
	PageHeader,
	Panel,
	RankedList,
	controlClass,
	staggerStyle,
	visitorDayDescription,
} from "../../components/cms/analytics/Widgets";
import { useDraftSelector } from "../../components/cms/draft/context";
import { diffPortfolioDocuments } from "../../components/cms/release/diff";
import { SECTION_GROUPS, SECTIONS } from "../../components/cms/sections/registry";
import {
	ActivityIcon,
	AlertTriangleIcon,
	AnalyticsIcon,
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
import { formatUtcTimestamp, useRelativeTime } from "../../components/cms/shell/time";
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
		<div className="grid min-w-0 max-w-[1160px] grid-cols-1 gap-6">
			<div className="grid gap-2">
				<div className="cms-skeleton h-3.5 w-36" />
				<div className="cms-skeleton h-8 w-44" />
				<div className="cms-skeleton h-4 w-72 max-w-full" />
			</div>
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
				<div className="cms-panel grid gap-3 p-5">
					<div className="cms-skeleton h-4 w-32" />
					<div className="cms-skeleton h-7 w-56" />
					<div className="cms-skeleton h-16 w-full" />
				</div>
				<div className="cms-panel grid gap-2.5 p-5">
					<div className="cms-skeleton h-4 w-28" />
					{[0, 1, 2].map((slot) => (
						<div key={slot} className="cms-skeleton h-10 w-full" />
					))}
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
				{[0, 1, 2, 3, 4].map((slot) => (
					<div key={slot} className="cms-panel grid gap-3 p-4">
						<div className="cms-skeleton h-3 w-16" />
						<div className="cms-skeleton h-7 w-14" />
						<div className="cms-skeleton h-7 w-full" />
						<div className="cms-skeleton h-3.5 w-24" />
					</div>
				))}
			</div>
			<div className="cms-panel grid gap-4 p-5">
				<div className="cms-skeleton h-5 w-32" />
				<div className="cms-skeleton h-48 w-full" />
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
				label: event.eventType,
				icon: <ActivityIcon className="size-3.5" />,
				toneClass: "border-line-strong bg-muted text-ink-soft",
			};
	}
}

function RecentActivityRow({ event }: { event: AuditEventItem }) {
	const meta = describeCompactEvent(event);
	const relative = useRelativeTime(event.createdAt, 30_000);

	return (
		<li className="cms-row-hover flex min-w-0 items-center justify-between gap-3 rounded-[10px] px-2 py-2">
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
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="truncate text-[13px] font-medium text-foreground">{meta.label}</span>
						{event.revision !== null ? (
							<Link
								to="/cms/history"
								search={{ revision: event.revision }}
								className="cms-page-focus inline-flex items-center rounded-full border border-line bg-surface-solid px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums text-primary-text no-underline hover:border-primary-line hover:bg-primary-soft"
							>
								r{event.revision}
							</Link>
						) : null}
					</div>
				</div>
			</div>
			<time
				dateTime={event.createdAt}
				title={formatUtcTimestamp(event.createdAt)}
				className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground"
			>
				{relative ?? formatUtcTimestamp(event.createdAt)}
			</time>
		</li>
	);
}

function DraftVsLiveCard() {
	const draft = useDraftSelector((state) => state.draft);
	const published = useDraftSelector((state) => state.published);
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const publishedRevision = useDraftSelector((state) => state.publishedRevision);
	const publishedAt = useDraftSelector((state) => state.publishedAt);
	const dirty = useDraftSelector((state) => state.dirty);
	const errors = useDraftSelector((state) => state.issues.all.length);

	const diff = useMemo(() => diffPortfolioDocuments(published, draft), [published, draft]);
	const relativePublished = useRelativeTime(publishedAt, 30_000);
	const changedSections = diff.changedSections;
	const hasChanges = changedSections.length > 0 || dirty;

	return (
		<section
			style={staggerStyle(0)}
			className="cms-panel cms-enter grid min-w-0 content-between gap-4 p-4 sm:p-5"
		>
			<div className="grid gap-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="mono-label text-[10.5px] text-muted-foreground">Release status</span>
					{errors > 0 ? (
						<span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/35 bg-destructive/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-destructive">
							<AlertTriangleIcon className="size-3.5" />
							<span>
								{errors} {errors === 1 ? "issue" : "issues"}
							</span>
						</span>
					) : hasChanges ? (
						<span className="inline-flex items-center gap-1.5 rounded-full border border-primary-line bg-primary-soft px-2.5 py-0.5 font-mono text-[11px] font-medium text-primary-text">
							<ReleaseChangesIcon className="size-3.5" />
							<span>
								{changedSections.length}{" "}
								{changedSections.length === 1 ? "section ahead" : "sections ahead"}
							</span>
						</span>
					) : (
						<span className="inline-flex items-center gap-1.5 rounded-full border border-success/35 bg-success/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-success">
							<CheckCircleIcon className="size-3.5" />
							<span>Synced with live</span>
						</span>
					)}
				</div>

				<div className="grid gap-1">
					<h2 className="m-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground">
						{errors > 0
							? "Resolve validation issues before publishing"
							: hasChanges
								? `Draft r${draftRevision} has ${diff.totalChanges} ${diff.totalChanges === 1 ? "change" : "changes"} since Live r${publishedRevision}`
								: `Live r${publishedRevision} is up to date`}
					</h2>
					<p className="m-0 font-mono text-[11.5px] tabular-nums text-muted-foreground">
						Draft r{draftRevision}
						{dirty ? " (unsaved)" : ""} · Live r{publishedRevision}
						{publishedAt ? (
							<>
								{" · "}
								<time dateTime={publishedAt} title={formatUtcTimestamp(publishedAt)}>
									{relativePublished ?? formatUtcTimestamp(publishedAt)}
								</time>
							</>
						) : (
							" · Never published"
						)}
					</p>
				</div>

				{/* What changed since publish */}
				{changedSections.length > 0 ? (
					<div className="grid gap-2 rounded-[12px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2%,transparent)] p-3">
						<p className="mono-label m-0 text-[10px] text-muted-foreground">
							Changed since publish
						</p>
						<ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
							{changedSections.slice(0, 6).map((entry) => {
								const total =
									entry.counts.added +
									entry.counts.removed +
									entry.counts.reordered +
									entry.counts.fields;
								return (
									<li key={entry.section.id}>
										<Link
											to="/cms/content/$section"
											params={{ section: entry.section.id }}
											className="cms-press cms-page-focus inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface-solid px-2.5 text-[12px] font-medium text-foreground no-underline hover:border-primary-line hover:text-primary-text pointer-coarse:min-h-11"
										>
											<SectionIcon id={entry.section.id} className="size-3.5 text-primary-text" />
											<span>{entry.section.label}</span>
											<span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
												{total}
											</span>
										</Link>
									</li>
								);
							})}
							{changedSections.length > 6 ? (
								<li>
									<Link
										to="/cms/release"
										className="cms-page-focus inline-flex min-h-8 items-center rounded-full border border-line bg-muted px-2.5 font-mono text-[11px] text-muted-foreground no-underline hover:text-foreground pointer-coarse:min-h-11"
									>
										+{changedSections.length - 6} more
									</Link>
								</li>
							) : null}
						</ul>
					</div>
				) : (
					<div className="flex items-center gap-3 rounded-[12px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2%,transparent)] px-3.5 py-3 text-[13px] text-muted-foreground">
						<span
							aria-hidden="true"
							className="grid size-7 shrink-0 place-items-center rounded-full border border-success/30 bg-success/10 text-success"
						>
							<CheckCircleIcon className="size-3.5" />
						</span>
						<span>Every content section in your draft matches what visitors see right now.</span>
					</div>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-2 pt-1">
				{hasChanges ? (
					<Button
						variant="default"
						size="sm"
						nativeButton={false}
						render={<Link to="/cms/release" />}
						className="no-underline pointer-coarse:min-h-11"
					>
						<ReleaseChangesIcon className="size-3.5" />
						<span>Review &amp; publish</span>
					</Button>
				) : (
					<Link to="/cms/release" className={controlClass}>
						<ReleaseChangesIcon className="size-3.5 text-muted-foreground" />
						<span>Inspect release</span>
					</Link>
				)}
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
				<Link
					to="/cms/activity"
					className="cms-page-focus inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 font-mono text-[11px] text-primary-text no-underline hover:bg-primary-soft pointer-coarse:min-h-11"
				>
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
		<Panel
			title="Quick jumps"
			description="Jump straight into any portfolio content section."
			stagger={6}
		>
			<div className="grid gap-5">
				{SECTION_GROUPS.map((group) => {
					const groupSections = SECTIONS.filter((section) => section.group === group.id);
					return (
						<div key={group.id} className="grid gap-2.5">
							<p className="mono-label m-0 text-[10.5px] text-muted-foreground">{group.label}</p>
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
														<span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10.5px] text-primary-text">
															<span
																aria-hidden="true"
																className="size-1.5 rounded-full bg-primary"
															/>
															Edited
														</span>
													) : (
														<span
															aria-hidden="true"
															className="shrink-0 font-mono text-[11px] text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
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
	const overview = Route.useLoaderData();
	const live = useLiveVisitors();
	const samples = live.data?.samples ?? [];
	const previous = samples.at(-2);
	const active = live.data?.live.count ?? null;

	return (
		<div className="grid min-w-0 max-w-[1160px] grid-cols-1 gap-6">
			<PageHeader
				eyebrow="Control plane · Overview"
				title="Overview"
				description="Draft release status, live signals, and direct access to every portfolio section."
				actions={
					<>
						<LiveControls {...live} />
						<Link to="/cms/analytics" className={controlClass}>
							<AnalyticsIcon className="size-3.5 text-primary-text" />
							<span>Analytics</span>
							<span aria-hidden="true" className="font-mono text-[11px] text-muted-foreground">
								→
							</span>
						</Link>
					</>
				}
			/>

			{/* Draft vs live status + Recent activity */}
			<div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
				<DraftVsLiveCard />
				<RecentActivityCard />
			</div>

			{/* Traffic KPIs & chart */}
			{overview ? (
				<div className="grid min-w-0 gap-4">
					{overview.allTime.totals.pageviews === 0 ? <NoVisits allTime /> : null}

					<div className="flex flex-wrap items-center justify-between gap-2">
						<p
							className="m-0 font-mono text-[11.5px] text-muted-foreground"
							title={visitorDayDescription}
						>
							Traffic in visitor-days · UTC · 7- and 30-day totals use completed days
						</p>
					</div>

					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
						<Kpi
							label="Active now"
							value={active}
							points={samples}
							delta={previous === undefined || active === null ? null : active - previous}
							comparison="since last check"
							live={!live.paused && (active ?? 0) > 0}
							paused={live.paused}
							stagger={2}
						/>
						<Kpi label="Today" {...overview.today} comparison="vs yesterday" stagger={3} />
						<Kpi label="7 days" {...overview.week} comparison="vs prior 7d" stagger={4} />
						<Kpi
							label="30 days"
							value={overview.recent.totals.visitorDays}
							points={overview.recent.series.map((point) => point.visitorDays)}
							delta={overview.recent.deltas.visitorDays}
							comparison="vs prior 30d"
							stagger={5}
						/>
						<Kpi
							label="All time"
							value={overview.allTime.totals.visitorDays}
							points={overview.allTime.points}
							delta={overview.allTime.delta}
							comparison="since midnight UTC"
							stagger={6}
						/>
					</div>

					<TrafficChart points={overview.recent.series} title="30-day traffic" stagger={4} />

					<div className="grid gap-4 md:grid-cols-2">
						<Panel title="Top pages" stagger={5}>
							<RankedList rows={overview.recent.topPages} empty="No page visits recorded yet." />
						</Panel>
						<Panel title="Top projects" stagger={5}>
							<RankedList
								rows={overview.recent.topProjects}
								empty="No project visits recorded yet."
							/>
						</Panel>
					</div>
				</div>
			) : (
				<AnalyticsUnavailable />
			)}

			<QuickJumpSections />
		</div>
	);
}
