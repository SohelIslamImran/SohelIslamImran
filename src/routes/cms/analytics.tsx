import { Link, createFileRoute, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { CountryMap } from "../../components/cms/analytics/CountryMap";
import { useLiveVisitors } from "../../components/cms/analytics/LiveVisitors";
import { TrafficChart } from "../../components/cms/analytics/TrafficChart";
import {
	AnalyticsUnavailable,
	Delta,
	LiveControls,
	LiveDot,
	NoVisits,
	PageHeader,
	Panel,
	RankedList,
	TickingNumber,
	controlClass,
	countLabel,
	staggerStyle,
	visitorDayDescription,
} from "../../components/cms/analytics/Widgets";
import { useDraftSelector } from "../../components/cms/draft/context";
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
		<div className="grid min-w-0 max-w-[1160px] grid-cols-1 gap-6">
			<div className="grid gap-2">
				<div className="cms-skeleton h-3.5 w-32" />
				<div className="cms-skeleton h-8 w-40" />
				<div className="cms-skeleton h-4 w-64" />
			</div>
			<div className="cms-skeleton h-10 w-[380px] max-w-full rounded-full" />
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{[0, 1, 2, 3].map((slot) => (
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
	const live = useLiveVisitors();
	const isPending = useRouterState({ select: (state) => state.status === "pending" });
	const profileLinks = useDraftSelector((state) => state.draft.profileLinks);
	const links = new Map(profileLinks.map((link) => [link.id, link.label]));
	const engagement = summary?.totals.medianEngagedSeconds ?? null;
	const active = live.data?.live.count ?? null;

	return (
		<div className="grid min-w-0 max-w-[1160px] grid-cols-1 gap-6">
			<PageHeader
				eyebrow="Signals · Analytics"
				title="Analytics"
				description="First-party, cookieless portfolio telemetry in UTC."
				actions={
					<a
						href="https://sohelislamimran.com/?analytics=off"
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
								{isActive ? (
									<span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
								) : null}
								<span className="sm:hidden">{value}</span>
								<span className="hidden sm:inline">{label}</span>
							</Link>
						);
					})}
				</nav>

				<div className="flex flex-wrap items-center gap-3">
					{range !== "24h" ? (
						<span className="font-mono text-[11.5px] text-muted-foreground">
							Completed UTC days
						</span>
					) : (
						<span className="font-mono text-[11.5px] text-muted-foreground">
							Rolling 24 hours · UTC
						</span>
					)}
				</div>
			</div>

			{summary ? (
				<div
					className={cn(
						"grid min-w-0 gap-5 transition-opacity duration-200",
						isPending && "opacity-60",
					)}
				>
					{summary.totals.pageviews === 0 ? <NoVisits /> : null}

					{/* Primary KPI row */}
					<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
						<section
							style={staggerStyle(1)}
							className="cms-panel cms-kpi-card cms-enter grid min-w-0 content-between gap-2.5 p-4"
						>
							<div className="flex items-center justify-between gap-2">
								<h2 className="mono-label m-0 text-[10.5px] text-muted-foreground">Active now</h2>
								<LiveDot active={!live.paused && (active ?? 0) > 0} paused={live.paused} />
							</div>
							<div className="text-[28px] leading-none font-semibold tracking-[-0.03em] text-foreground">
								<TickingNumber value={active} />
							</div>
							<p className="m-0 text-[12px] text-muted-foreground">
								{active !== null
									? `${active === 1 ? "Active tab" : "Active tabs"} in last 2m`
									: live.failed
										? "Unavailable right now"
										: live.paused
											? "Live updates paused"
											: "Checking active tabs…"}
							</p>
						</section>

						<section
							style={staggerStyle(2)}
							className="cms-panel cms-kpi-card cms-enter grid min-w-0 content-between gap-2.5 p-4"
							title={visitorDayDescription}
						>
							<h2 className="mono-label m-0 text-[10.5px] text-muted-foreground">Visitor-days</h2>
							<div className="text-[28px] leading-none font-semibold tracking-[-0.03em] text-foreground">
								<TickingNumber value={summary.totals.visitorDays} />
							</div>
							<Delta value={summary.deltas.visitorDays} comparison="vs prior" />
						</section>

						<section
							style={staggerStyle(3)}
							className="cms-panel cms-kpi-card cms-enter grid min-w-0 content-between gap-2.5 p-4"
						>
							<h2 className="mono-label m-0 text-[10.5px] text-muted-foreground">Pageviews</h2>
							<div className="text-[28px] leading-none font-semibold tracking-[-0.03em] text-foreground">
								<TickingNumber value={summary.totals.pageviews} />
							</div>
							<Delta value={summary.deltas.pageviews} comparison="vs prior" />
						</section>

						<section
							style={staggerStyle(4)}
							className="cms-panel cms-kpi-card cms-enter grid min-w-0 content-between gap-2.5 p-4"
						>
							<h2 className="mono-label m-0 text-[10.5px] text-muted-foreground">Engaged time</h2>
							<div className="text-[28px] leading-none font-semibold tracking-[-0.03em] text-foreground">
								<TickingNumber value={engagement} suffix="s" />
							</div>
							<Delta value={summary.deltas.medianEngagedSeconds} unit="s" comparison="vs prior" />
						</section>
					</div>

					<TrafficChart
						key={range}
						points={summary.series}
						hourly={range === "24h"}
						title={range === "24h" ? "24-hour traffic" : "Traffic over time"}
						stagger={3}
					/>

					{/* Active now live breakdown (pulse kept outside aria-live) */}
					<Panel
						title="Live presence"
						stagger={4}
						badge={<LiveDot active={!live.paused && (active ?? 0) > 0} paused={live.paused} />}
						action={<LiveControls {...live} />}
					>
						<p className="m-0 font-mono text-[12.5px] tabular-nums text-muted-foreground">
							{active !== null
								? `${countLabel(active)} ${active === 1 ? "tab" : "tabs"} active in the last 2 minutes`
								: live.failed
									? "Active tab count unavailable"
									: live.paused
										? "Live updates paused"
										: "Checking active tabs…"}
						</p>
						{live.data ? (
							<RankedList rows={live.data.live.paths} empty="No active tabs right now." />
						) : !live.paused && !live.failed ? (
							<div className="grid gap-2">
								<div className="cms-skeleton h-8 w-full" />
								<div className="cms-skeleton h-8 w-3/4" />
							</div>
						) : null}
					</Panel>

					<div className="grid gap-4 md:grid-cols-2">
						<Panel title="Top pages" stagger={5}>
							<RankedList rows={summary.topPages} empty="No pageviews in this period." />
						</Panel>
						<Panel title="Top projects" stagger={5}>
							<RankedList rows={summary.topProjects} empty="No project views in this period." />
						</Panel>
						<Panel title="Referrers" stagger={6}>
							<RankedList rows={summary.referrers} empty="No referrers in this period." />
						</Panel>
						<Panel title="Countries" stagger={6}>
							<CountryMap rows={summary.countries} />
						</Panel>
						<Panel title="Devices" stagger={7}>
							<RankedList rows={summary.devices} empty="No device data in this period." />
						</Panel>
						<Panel title="Browsers" stagger={7}>
							<RankedList rows={summary.browsers} empty="No browser data in this period." />
						</Panel>
						<Panel title="Profile link clicks" stagger={8}>
							<RankedList
								rows={summary.outboundLinks.map((row) => ({
									...row,
									label: links.get(row.value) ?? row.value,
								}))}
								empty="No profile link clicks in this period."
							/>
						</Panel>
						<Panel title="Other outbound clicks" stagger={8}>
							<RankedList rows={summary.outboundHosts} empty="No outbound clicks in this period." />
						</Panel>
					</div>
				</div>
			) : (
				<AnalyticsUnavailable />
			)}
		</div>
	);
}
