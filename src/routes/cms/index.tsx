import { Link, createFileRoute } from "@tanstack/react-router";
import { useLiveVisitors } from "../../components/cms/analytics/LiveVisitors";
import { TrafficChart } from "../../components/cms/analytics/TrafficChart";
import {
	AnalyticsUnavailable,
	Kpi,
	LiveControls,
	NoVisits,
	Panel,
	RankedList,
	controlClass,
	visitorDayDescription,
} from "../../components/cms/analytics/Widgets";
import { useDraftSelector } from "../../components/cms/draft/context";
import { SECTIONS } from "../../components/cms/sections/registry";
import { getAnalyticsOverview } from "../../server/analytics.functions";

export const Route = createFileRoute("/cms/")({
	loader: () => getAnalyticsOverview().catch(() => null),
	component: CmsOverview,
});

const publishedDate = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});
const releaseRoute: string = "/cms/release";

function ContentHealth() {
	const errors = useDraftSelector((state) => state.issues.all.length);
	const changed = useDraftSelector(
		(state, store) =>
			SECTIONS.filter((section) => section.paths.some((path) => store.changedAt(path, state)))
				.length,
	);
	const publishedAt = useDraftSelector((state) => state.publishedAt);
	return (
		<Panel title="Content health">
			<dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Validation errors</dt>
				<dd className="m-0 text-right font-mono">{errors}</dd>
				<dt className="text-muted-foreground">Sections ahead of live</dt>
				<dd className="m-0 text-right font-mono">{changed}</dd>
				<dt className="text-muted-foreground">Last published</dt>
				<dd className="m-0 text-right text-xs">
					{publishedAt ? (
						<time dateTime={publishedAt}>{publishedDate.format(new Date(publishedAt))} UTC</time>
					) : (
						"Never"
					)}
				</dd>
			</dl>
			<Link to={releaseRoute} className={`${controlClass} justify-self-start`}>
				Review changes
			</Link>
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
		<div className="grid min-w-0 gap-4">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="m-0 text-headline">Overview</h1>
				<Link to="/cms/analytics" className={controlClass}>
					Analytics
				</Link>
			</header>
			{overview ? (
				<>
					{overview.allTime.totals.pageviews === 0 ? <NoVisits allTime /> : null}
					<div className="flex flex-wrap items-center justify-between gap-3">
						<p className="m-0 text-sm text-muted-foreground" title={visitorDayDescription}>
							Traffic in visitor-days · UTC · 7- and 30-day totals use completed days
						</p>
						<LiveControls {...live} />
					</div>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
						<Kpi
							label="Active now"
							value={active}
							points={samples}
							delta={previous === undefined || active === null ? null : active - previous}
							comparison="since last check"
							live={!live.paused && (active ?? 0) > 0}
						/>
						<Kpi label="Today" {...overview.today} comparison="than this time yesterday" />
						<Kpi label="7 days" {...overview.week} comparison="than prior 7 days" />
						<Kpi
							label="30 days"
							value={overview.recent.totals.visitorDays}
							points={overview.recent.series.map((point) => point.visitorDays)}
							delta={overview.recent.deltas.visitorDays}
							comparison="than prior 30 days"
						/>
						<Kpi
							label="All time"
							value={overview.allTime.totals.visitorDays}
							points={overview.allTime.points}
							delta={overview.allTime.delta}
							comparison="since midnight UTC"
						/>
					</div>
					<TrafficChart points={overview.recent.series} title="30-day traffic" />
					<div className="grid gap-4 md:grid-cols-2">
						<Panel title="Top pages">
							<RankedList rows={overview.recent.topPages} />
						</Panel>
						<Panel title="Top projects">
							<RankedList rows={overview.recent.topProjects} />
						</Panel>
					</div>
				</>
			) : (
				<AnalyticsUnavailable />
			)}
			<ContentHealth />
		</div>
	);
}
