import { Link, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveReducedMotion } from "../../components/cms/shell/use-live-reduced-motion";
import { motion } from "motion/react";
import { CountryMap } from "../../components/cms/analytics/CountryMap";
import { TrafficChart } from "../../components/cms/analytics/TrafficChart";
import {
	AnalyticsUnavailable,
	KpiStrip,
	PageHeader,
	QuietNote,
	RankedList,
	SegmentedControl,
	controlClass,
	formatDuration,
	inlineLinkClass,
	pageClass,
	staggerStyle,
	visitorDayDescription,
} from "../../components/cms/analytics/Widgets";
import type { AnalyticsCount } from "../../server/analytics.server";
import { useDraftSelector, usePublicOrigin } from "../../components/cms/draft/context";
import { REDUCED, SPRING_MOVE } from "../../components/cms/motion";
import { ExternalArrowIcon } from "../../components/cms/shell/cms-icons";
import { cn } from "../../lib/utils";
import {
	analyticsSearch,
	getAnalyticsOverview,
	getAnalyticsSummary,
} from "../../server/analytics.functions";

const pageLabels = new Map([
	["/", "Home"],
	["/work", "Work"],
	["/story", "Story"],
	["/resume", "Résumé"],
	["/links", "Links"],
	["/field-notes", "Field notes"],
]);

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
	loader: async ({ deps }) => {
		const summary = await getAnalyticsSummary({ data: deps }).catch(() => null);
		const overview =
			summary?.totals.pageviews === 0 && deps.range !== "24h"
				? await getAnalyticsOverview().catch(() => null)
				: null;
		return { summary, hasVisitsToday: (overview?.today.value ?? 0) > 0 };
	},
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
				<h1 className="sr-only">Analytics</h1>
				<div aria-hidden="true" className="cms-skeleton h-8 w-40" />
				<div className="cms-skeleton h-4 w-64" />
			</div>
			<div className="cms-skeleton h-10 w-[380px] max-w-full rounded-full" />
			<div className="cms-panel grid grid-cols-3 divide-x divide-line">
				{[0, 1, 2].map((slot) => (
					<div key={slot} className="grid gap-2 p-3 sm:p-4">
						<div className="cms-skeleton h-3 w-16" />
						<div className="cms-skeleton h-6 w-12" />
						<div className="cms-skeleton h-4 w-10 rounded-full" />
					</div>
				))}
			</div>
			<div className="cms-panel grid gap-4 p-5">
				<div className="cms-skeleton h-5 w-28" />
				<div className="cms-skeleton h-56 w-full" />
			</div>
			<div className="cms-panel grid gap-3 p-5">
				<div className="cms-skeleton h-9 w-72 max-w-full rounded-full" />
				<div className="cms-skeleton h-8 w-full" />
				<div className="cms-skeleton h-8 w-4/5" />
				<div className="cms-skeleton h-8 w-3/5" />
			</div>
		</div>
	);
}

function Analytics() {
	const reduced = useLiveReducedMotion();
	const { range } = Route.useSearch();
	const { summary, hasVisitsToday } = Route.useLoaderData();
	const isPending = useRouterState({ select: (state) => state.status === "pending" });
	const publicOrigin = usePublicOrigin();
	const profileLinks = useDraftSelector((state) => state.draft.profileLinks);
	const links = new Map(profileLinks.map((link) => [link.id, link.label]));
	const projects = new Map(summary?.topProjects.map((row) => [row.value, row.label]));
	const pageLabel = (path: string) => pageLabels.get(path) ?? projects.get(path) ?? path;
	const rangeLabel = ranges.find(([value]) => value === range)?.[1] ?? "this range";

	// Profile links by label, then any other outbound host, in one list.
	const outbound: AnalyticsCount[] = summary
		? [
				...summary.outboundLinks.map((row) => ({
					...row,
					label: links.get(row.value) ?? row.value,
				})),
				...summary.outboundHosts,
			].sort((left, right) => right.count - left.count)
		: [];
	const breakdowns: Breakdown[] = summary
		? [
				{
					value: "pages",
					label: "Pages",
					rows: summary.topPages.map((row) => ({ ...row, label: pageLabel(row.value) })),
				},
				{ value: "referrers", label: "Referrers", rows: summary.referrers },
				{ value: "devices", label: "Devices", rows: summary.devices },
				{ value: "browsers", label: "Browsers", rows: summary.browsers },
				{ value: "links", label: "Links", rows: outbound },
				{ value: "countries", label: "Countries", rows: summary.countries },
			]
		: [];
	const filled = breakdowns.filter((entry) => entry.rows.length > 0);
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
					{noVisits ? null : " · changes vs the previous period"}
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
						<QuietNote
							action={
								hasVisitsToday ? (
									<Link
										to="/cms/analytics"
										search={{ range: "24h" }}
										resetScroll={false}
										className={inlineLinkClass}
									>
										<span>Last 24 hours</span>
										<span aria-hidden="true">→</span>
									</Link>
								) : undefined
							}
						>
							{hasVisitsToday
								? "Today’s visits appear here tomorrow."
								: `No visits in the last ${rangeLabel.toLowerCase()}.`}
						</QuietNote>
					) : (
						<>
							<KpiStrip
								stagger={1}
								comparison="vs the previous period"
								items={[
									{
										label: "Visitor-days",
										title: visitorDayDescription,
										value: summary.totals.visitorDays,
										delta: summary.deltas.visitorDays,
									},
									{
										label: "Pageviews",
										value: summary.totals.pageviews,
										delta: summary.deltas.pageviews,
									},
									{
										label: "Median time",
										title: "Median engaged time per page",
										value: summary.totals.medianEngagedSeconds,
										delta: summary.deltas.medianEngagedSeconds,
										format: formatDuration,
										emptyLabel: "Not enough data",
									},
								]}
							/>

							<TrafficChart
								key={range}
								points={summary.series}
								hourly={range === "24h"}
								title={range === "24h" ? "Last 24 hours" : "Traffic over time"}
								rangeLabel={range === "24h" ? "the last 24 hours" : `the last ${rangeLabel}`}
								stagger={2}
							/>
						</>
					)}

					{filled.length > 0 ? <BreakdownPanel breakdowns={filled} /> : null}
				</div>
			) : (
				<AnalyticsUnavailable />
			)}
		</div>
	);
}

interface Breakdown {
	value: "pages" | "referrers" | "devices" | "browsers" | "links" | "countries";
	label: string;
	rows: AnalyticsCount[];
}

/** Every breakdown in one panel, switched with a segmented picker. */
function BreakdownPanel({ breakdowns }: { breakdowns: Breakdown[] }) {
	const [picked, setPicked] = useState<Breakdown["value"]>(breakdowns[0]!.value);
	const current = breakdowns.find((entry) => entry.value === picked) ?? breakdowns[0]!;
	return (
		<section
			aria-label="Breakdown"
			style={staggerStyle(3)}
			className="cms-panel cms-enter grid min-w-0 content-start gap-3.5 p-4 sm:p-5"
		>
			<SegmentedControl
				layoutId="cms-analytics-breakdown-pill"
				ariaLabel="Breakdown"
				value={current.value}
				onChange={setPicked}
				options={breakdowns.map(({ value, label }) => ({ value, label }))}
				className="justify-self-start"
			/>
			<div key={current.value} className="cms-collapse-panel min-w-0">
				{current.value === "countries" ? (
					<CountryMap rows={current.rows} />
				) : (
					<RankedList rows={current.rows} />
				)}
			</div>
		</section>
	);
}
