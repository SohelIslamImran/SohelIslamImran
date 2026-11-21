import { Link, createFileRoute } from "@tanstack/react-router";
import { CountryMap } from "../../components/cms/analytics/CountryMap";
import { TrafficChart } from "../../components/cms/analytics/TrafficChart";
import {
	AnalyticsUnavailable,
	Delta,
	LiveControls,
	NoVisits,
	Panel,
	RankedList,
	controlClass,
	countLabel,
	useLiveVisitors,
	visitorDayDescription,
} from "../../components/cms/analytics/Widgets";
import { useDraftSelector } from "../../components/cms/draft/context";
import { analyticsSearch, getAnalyticsSummary } from "../../server/analytics.functions";

const ranges = [
	["24h", "24 hours"],
	["7d", "7 days"],
	["30d", "30 days"],
	["90d", "90 days"],
	["12m", "12 months"],
] as const;

export const Route = createFileRoute("/cms/analytics")({
	validateSearch: analyticsSearch,
	loaderDeps: ({ search: { range } }) => ({ range }),
	loader: ({ deps }) => getAnalyticsSummary({ data: deps }).catch(() => null),
	component: Analytics,
});

function Analytics() {
	const { range } = Route.useSearch();
	const summary = Route.useLoaderData();
	const live = useLiveVisitors();
	const profileLinks = useDraftSelector((state) => state.draft.profileLinks);
	const links = new Map(profileLinks.map((link) => [link.id, link.label]));
	const engagement = summary?.totals.medianEngagedSeconds ?? null;
	const active = live.data?.live.count;

	return (
		<div className="grid min-w-0 gap-4">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="m-0 text-headline">Analytics</h1>
				<a href="https://sohelislamimran.com/?analytics=off" className={controlClass}>
					Exclude this browser
				</a>
			</header>
			<nav aria-label="Traffic range" className="flex flex-wrap gap-2">
				{ranges.map(([value, label]) => (
					<Link
						key={value}
						to="/cms/analytics"
						search={{ range: value }}
						resetScroll={false}
						activeOptions={{ exact: true, includeSearch: true }}
						className={`${controlClass} aria-[current=page]:border-primary-text aria-[current=page]:bg-muted aria-[current=page]:text-primary-text`}
					>
						{label}
					</Link>
				))}
			</nav>
			{summary ? (
				<>
					{summary.totals.pageviews === 0 ? <NoVisits /> : null}
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						<Panel title="Visitor-days">
							<p className="m-0 text-2xl font-semibold tabular-nums" title={visitorDayDescription}>
								{countLabel(summary.totals.visitorDays)}
							</p>
							<Delta value={summary.deltas.visitorDays} comparison="than prior period" />
							<p className="m-0 text-xs text-muted-foreground">{visitorDayDescription}</p>
						</Panel>
						<Panel title="Pageviews">
							<p className="m-0 text-2xl font-semibold tabular-nums">
								{countLabel(summary.totals.pageviews)}
							</p>
							<Delta value={summary.deltas.pageviews} comparison="than prior period" />
						</Panel>
						<Panel title="Median engaged time" className="col-span-2 sm:col-span-1">
							<p className="m-0 text-2xl font-semibold tabular-nums">
								{engagement === null ? "—" : `${countLabel(engagement)} s`}
							</p>
							<Delta
								value={summary.deltas.medianEngagedSeconds}
								unit="s"
								comparison="than prior period"
							/>
							<p className="m-0 text-xs text-muted-foreground">Visible time per tab per UTC day.</p>
						</Panel>
					</div>
					<TrafficChart key={range} points={summary.series} hourly={range === "24h"} />
					<Panel title="Active now">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<p className="m-0 font-mono tabular-nums">
								{active !== undefined
									? `${countLabel(active)} ${active === 1 ? "tab" : "tabs"} in the last 2 minutes`
									: live.failed
										? "Active tab count unavailable"
										: live.paused
											? "Live updates paused"
											: "Checking active tabs…"}
							</p>
							<LiveControls {...live} />
						</div>
						{live.data ? <RankedList rows={live.data.live.paths} empty="No active tabs." /> : null}
					</Panel>
					<div className="grid gap-4 md:grid-cols-2">
						<Panel title="Top pages">
							<RankedList rows={summary.topPages} />
						</Panel>
						<Panel title="Top projects">
							<RankedList rows={summary.topProjects} />
						</Panel>
						<Panel title="Referrers">
							<RankedList rows={summary.referrers} />
						</Panel>
						<Panel title="Countries">
							<CountryMap rows={summary.countries} />
						</Panel>
						<Panel title="Devices">
							<RankedList rows={summary.devices} />
						</Panel>
						<Panel title="Browsers">
							<RankedList rows={summary.browsers} />
						</Panel>
						<Panel title="Profile link clicks">
							<RankedList
								rows={summary.outboundLinks.map((row) => ({
									...row,
									label: links.get(row.value) ?? row.value,
								}))}
							/>
						</Panel>
						<Panel title="Other outbound clicks">
							<RankedList rows={summary.outboundHosts} />
						</Panel>
					</div>
				</>
			) : (
				<AnalyticsUnavailable />
			)}
		</div>
	);
}
