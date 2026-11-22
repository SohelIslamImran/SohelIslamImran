import { Link, createFileRoute, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { CountryMap } from "../../components/cms/analytics/CountryMap";
import { useLiveVisitors } from "../../components/cms/analytics/LiveVisitors";
import { TrafficChart } from "../../components/cms/analytics/TrafficChart";
import {
	AnalyticsUnavailable,
	Kpi,
	LiveControls,
	LiveDot,
	PageHeader,
	Panel,
	QuietNote,
	RankedList,
	TickingNumber,
	controlClass,
	inlineLinkClass,
	pageClass,
	staggerStyle,
	visitorDayDescription,
} from "../../components/cms/analytics/Widgets";
import { useDraftSelector, usePublicOrigin } from "../../components/cms/draft/context";
import { REDUCED, SPRING_MOVE } from "../../components/cms/motion";
import { ExternalArrowIcon } from "../../components/cms/shell/cms-icons";
import { cn } from "../../lib/utils";
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
	pendingComponent: AnalyticsSkeleton,
	head: () => ({
		meta: [{ title: "Analytics · Control plane" }],
	}),
	component: Analytics,
});

function AnalyticsSkeleton() {
	return (
		<div className={pageClass}>
			<div className="grid gap-2">
				<div className="cms-skeleton h-8 w-40" />
				<div className="cms-skeleton h-4 w-64" />
			</div>
			<div className="cms-skeleton h-10 w-[380px] max-w-full rounded-full" />
			<div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
				{[0, 1, 2].map((slot) => (
					<div key={slot} className="cms-panel grid gap-3 p-4">
						<div className="cms-skeleton h-3 w-20" />
						<div className="cms-skeleton h-7 w-16" />
						<div className="cms-skeleton h-4 w-28" />
					</div>
				))}
			</div>
			<div className="cms-panel grid gap-4 p-5">
				<div className="cms-skeleton h-5 w-28" />
				<div className="cms-skeleton h-52 w-full" />
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				{[0, 1, 2, 3].map((slot) => (
					<div key={slot} className="cms-panel grid gap-3 p-5">
						<div className="cms-skeleton h-5 w-28" />
						<div className="cms-skeleton h-8 w-full" />
						<div className="cms-skeleton h-8 w-4/5" />
						<div className="cms-skeleton h-8 w-3/5" />
					</div>
				))}
			</div>
		</div>
	);
}

function Analytics() {
	const reduced = useReducedMotion();
	const { range } = Route.useSearch();
	const summary = Route.useLoaderData();
	const isPending = useRouterState({ select: (state) => state.status === "pending" });
	const publicOrigin = usePublicOrigin();
	const profileLinks = useDraftSelector((state) => state.draft.profileLinks);
	const links = new Map(profileLinks.map((link) => [link.id, link.label]));
	const rangeLabel = ranges.find(([value]) => value === range)?.[1] ?? "this range";

	const breakdowns = summary
		? [
				{ title: "Top pages", rows: summary.topPages },
				{ title: "Top projects", rows: summary.topProjects },
				{ title: "Referrers", rows: summary.referrers },
				{ title: "Devices", rows: summary.devices },
				{ title: "Browsers", rows: summary.browsers },
				{
					title: "Profile link clicks",
					rows: summary.outboundLinks.map((row) => ({
						...row,
						label: links.get(row.value) ?? row.value,
					})),
				},
				{ title: "Other outbound clicks", rows: summary.outboundHosts },
			]
		: [];
	const filled = breakdowns.filter((entry) => entry.rows.length > 0);
	const empty = breakdowns.filter((entry) => entry.rows.length === 0);
	const noVisits = summary !== null && summary.totals.pageviews === 0;

	return (
		<div className={pageClass}>
			<PageHeader
				title="Analytics"
				description="Cookieless visits to your public site, counted in UTC."
				actions={
					<a
						href={new URL("/?analytics=off", publicOrigin).href}
						target="_blank"
						rel="noreferrer"
						className={controlClass}
					>
						<span>Exclude this browser</span>
						<ExternalArrowIcon className="size-3.5 text-muted-foreground" />
					</a>
				}
			/>

			{/* Segmented range selector with sliding pill (never hue alone) */}
			<div
				className="cms-enter flex flex-wrap items-center justify-between gap-3"
				style={staggerStyle(0)}
			>
				<nav aria-label="Traffic range" className="cms-seg-track">
					{ranges.map(([value, label]) => {
						const isActive = range === value;
						return (
							<Link
								key={value}
								to="/cms/analytics"
								search={{ range: value }}
								resetScroll={false}
								activeOptions={{ exact: true, includeSearch: true }}
								data-active={isActive ? "true" : "false"}
								className="cms-seg-item shrink-0"
							>
								{isActive ? (
									<motion.span
										layoutId="cms-analytics-range-pill"
										aria-hidden="true"
										transition={reduced ? REDUCED : SPRING_MOVE}
										className="cms-seg-pill"
									/>
								) : null}
								<span className="sm:hidden">{value}</span>
								<span className="hidden sm:inline">{label}</span>
							</Link>
						);
					})}
				</nav>

				<span className="text-[12.5px] text-muted-foreground">
					{range === "24h" ? "Rolling 24 hours" : "Completed days, today excluded"}
				</span>
			</div>

			{summary ? (
				<div
					className={cn(
						"grid min-w-0 gap-5 transition-opacity duration-200",
						isPending && "opacity-60",
					)}
				>
					{noVisits ? (
						range === "24h" ? (
							<QuietNote>No visits in the last 24 hours.</QuietNote>
						) : (
							<QuietNote
								action={
									<Link
										to="/cms/analytics"
										search={{ range: "24h" }}
										resetScroll={false}
										className={inlineLinkClass}
									>
										<span>Last 24 hours</span>
										<span aria-hidden="true">→</span>
									</Link>
								}
							>
								No visits in the last {rangeLabel.toLowerCase()}. Today’s visits appear here
								tomorrow.
							</QuietNote>
						)
					) : null}

					<div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
						<Kpi
							label="Visitor-days"
							title={visitorDayDescription}
							value={summary.totals.visitorDays}
							points={summary.series.map((point) => point.visitorDays)}
							delta={summary.deltas.visitorDays}
							comparison="vs previous period"
							stagger={1}
						/>
						<Kpi
							label="Pageviews"
							value={summary.totals.pageviews}
							points={summary.series.map((point) => point.pageviews)}
							delta={summary.deltas.pageviews}
							comparison="vs previous period"
							stagger={2}
						/>
						<Kpi
							label="Median engaged time"
							value={summary.totals.medianEngagedSeconds}
							suffix="s"
							delta={summary.deltas.medianEngagedSeconds}
							unit="s"
							comparison="vs previous period"
							stagger={3}
						/>
					</div>

					<TrafficChart
						key={range}
						points={summary.series}
						hourly={range === "24h"}
						title={range === "24h" ? "Last 24 hours" : "Traffic over time"}
						stagger={3}
					/>

					<div className="grid items-start gap-4 md:grid-cols-2">
						<LivePanel />
						{filled.map((entry, index) => (
							<Panel key={entry.title} title={entry.title} stagger={Math.min(4 + index, 8)}>
								<RankedList rows={entry.rows} />
							</Panel>
						))}
						{summary.countries.length > 0 ? (
							<Panel title="Countries" stagger={8} className="md:col-span-2">
								<CountryMap rows={summary.countries} />
							</Panel>
						) : null}
					</div>

					{!noVisits && (empty.length > 0 || summary.countries.length === 0) ? (
						<p className="m-0 px-1 text-[13px] text-muted-foreground">
							Nothing recorded in this range for{" "}
							{listFormat.format(
								[
									...empty.map((entry) => entry.title),
									...(summary.countries.length === 0 ? ["Countries"] : []),
								].map((title) => title.toLowerCase()),
							)}
							.
						</p>
					) : null}
				</div>
			) : (
				<AnalyticsUnavailable />
			)}
		</div>
	);
}

const listFormat = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

/** One card for live presence: a single live dot, the count, the pages, and the pause toggle. */
function LivePanel() {
	const live = useLiveVisitors();
	const active = live.data?.live.count ?? null;
	const isLive = !live.paused && !live.failed && (active ?? 0) > 0;

	return (
		<Panel title="Active now" stagger={4} action={<LiveControls {...live} />}>
			<div className="flex items-baseline gap-2.5">
				<LiveDot active={isLive} paused={live.paused} className="self-center" />
				<span className="text-[28px] leading-none font-semibold tracking-[-0.03em] text-foreground">
					<TickingNumber value={active} />
				</span>
				<span className="text-[13px] text-muted-foreground">
					{active !== null
						? `${active === 1 ? "tab" : "tabs"} open in the last 2 minutes`
						: live.failed
							? "Unavailable right now"
							: live.paused
								? "Updates paused"
								: "Checking…"}
				</span>
			</div>
			{live.data && live.data.live.paths.length > 0 ? (
				<RankedList rows={live.data.live.paths} />
			) : null}
		</Panel>
	);
}
