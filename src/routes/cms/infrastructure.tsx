/**
 * Infrastructure (`/cms/infrastructure`): how the Worker, D1 database, R2
 * bucket, and daily job behind the site are doing, from Cloudflare's
 * analytics. Each section links to the matching dashboard page for detail.
 */
import { Link, createFileRoute, useRouter, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { CloudflareDashboardLinks } from "../../components/cms/CloudflarePanel";
import { RelativeTime } from "../../components/cms/analytics/RelativeTime";
import { TrafficChart } from "../../components/cms/analytics/TrafficChart";
import {
	EmptyState,
	PageHeader,
	Panel,
	RankedList,
	TickingNumber,
	controlClass,
	countLabel,
	pageClass,
	staggerStyle,
} from "../../components/cms/analytics/Widgets";
import { useCmsSession } from "../../components/cms/draft/context";
import { REDUCED, SPRING_MOVE } from "../../components/cms/motion";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	ExternalArrowIcon,
	InfrastructureIcon,
} from "../../components/cms/shell/cms-icons";
import { useLiveReducedMotion } from "../../components/cms/shell/use-live-reduced-motion";
import {
	CLOUDFLARE_DASHBOARD_URL,
	CLOUDFLARE_PAGES,
	formatDeploymentMessage,
	shortVersionId,
} from "../../lib/cloudflare-dashboard";
import { cn } from "../../lib/utils";
import type {
	CloudflareInsights,
	DeploymentItem,
	InsightsRange,
} from "../../server/cloudflare-insights.server";
import { getCloudflareInsights, insightsSearch } from "../../server/cloudflare.functions";

const ranges: readonly (readonly [InsightsRange, string])[] = [
	["24h", "24 hours"],
	["7d", "7 days"],
	["30d", "30 days"],
];

export const Route = createFileRoute("/cms/infrastructure")({
	validateSearch: insightsSearch,
	loaderDeps: ({ search: { range } }) => ({ range }),
	loader: ({ deps }) =>
		getCloudflareInsights({ data: deps }).catch(() => ({
			ok: false as const,
			reason: "unavailable" as const,
			message: "Cloudflare metrics could not be loaded right now.",
		})),
	pendingComponent: InfrastructureSkeleton,
	head: () => ({ meta: [{ title: "Infrastructure · Control plane" }] }),
	component: Infrastructure,
});

// ── Formatting ───────────────────────────────────────────────────────────────

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
/** Full digits below 10,000, then 12.3K style. */
export const requestCount = (value: number) =>
	Math.abs(value) < 10_000 ? countLabel(value) : compact.format(value);

export function formatMs(value: number): string {
	if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)} s`;
	if (value >= 100) return `${Math.round(value)} ms`;
	if (value >= 10) return `${value.toFixed(0)} ms`;
	return `${value.toFixed(1)} ms`;
}

export function formatBytes(value: number): string {
	if (value < 1024) return `${value} B`;
	const units = ["KB", "MB", "GB", "TB"];
	let size = value / 1024;
	let unit = 0;
	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024;
		unit += 1;
	}
	return `${size >= 100 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
}

export function formatRate(errors: number, requests: number): string {
	if (requests === 0) return "0%";
	const rate = (errors / requests) * 100;
	if (rate === 0) return "0%";
	return rate < 0.01 ? "<0.01%" : `${rate < 1 ? rate.toFixed(2) : rate.toFixed(1)}%`;
}

/** Invocation outcomes from `workersInvocationsAdaptive`, in plain words. */
const outcomeLabels: Record<string, string> = {
	success: "Completed",
	clientDisconnected: "Visitor left early",
	scriptThrewException: "Exception",
	exceededResources: "Exceeded limits",
	exceededCpu: "Exceeded CPU limit",
	exceededMemory: "Exceeded memory limit",
	internalError: "Cloudflare internal error",
	responseStreamDisconnected: "Response stream closed",
};

// ── Small pieces ─────────────────────────────────────────────────────────────

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="cms-press cms-page-focus inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-primary-text no-underline hover:bg-primary-soft pointer-coarse:min-h-11"
		>
			<span>{children}</span>
			<ExternalArrowIcon className="size-3.5" />
			<span className="sr-only"> (opens the Cloudflare dashboard in a new tab)</span>
		</a>
	);
}

interface Stat {
	label: string;
	value: number | null;
	format: (value: number) => string;
	note?: ReactNode;
	tone?: "ok" | "warn";
	title?: string;
}

/** Four headline numbers: two-up on phones, four-up from `sm`. */
function StatStrip({ stats, stagger }: { stats: readonly Stat[]; stagger?: number }) {
	return (
		<section
			aria-label="Worker health"
			style={stagger !== undefined ? staggerStyle(stagger) : undefined}
			className="cms-panel cms-enter grid min-w-0 grid-cols-2 sm:grid-cols-4 [&>*]:border-line max-sm:[&>*:nth-child(-n+2)]:border-b sm:[&>*:not(:first-child)]:border-l max-sm:[&>*:nth-child(even)]:border-l"
		>
			{stats.map((stat) => (
				<div
					key={stat.label}
					title={stat.title}
					className="grid min-w-0 content-start gap-1.5 p-3 sm:p-4"
				>
					<h2 className="m-0 flex min-w-0 items-center gap-1.5 text-[12px] leading-snug font-medium text-muted-foreground sm:text-[12.5px]">
						{stat.tone === "ok" ? (
							<CheckCircleIcon className="size-3.5 shrink-0 text-success" />
						) : stat.tone === "warn" ? (
							<AlertTriangleIcon className="size-3.5 shrink-0 text-destructive" />
						) : null}
						<span>{stat.label}</span>
					</h2>
					<div className="text-[21px] leading-none font-semibold tracking-[-0.03em] text-foreground sm:text-[26px]">
						{stat.value === null ? (
							<span className="text-[14px] font-medium tracking-normal text-muted-foreground">
								No data
							</span>
						) : (
							<TickingNumber value={stat.value} format={stat.format} />
						)}
					</div>
					{stat.note ? (
						<p className="m-0 text-[12px] leading-snug text-muted-foreground tabular-nums">
							{stat.note}
						</p>
					) : null}
				</div>
			))}
		</section>
	);
}

/** Label / value pairs inside a compact card; labels and values wrap instead of truncating. */
function MetricGrid({
	items,
}: {
	items: readonly { label: string; value: string; title?: string }[];
}) {
	return (
		<dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
			{items.map((item) => (
				<div key={item.label} title={item.title} className="grid min-w-0 content-start gap-0.5">
					<dt className="text-[12px] leading-snug font-medium text-muted-foreground">
						{item.label}
					</dt>
					<dd className="m-0 font-mono text-[14.5px] leading-snug font-semibold text-foreground tabular-nums [overflow-wrap:anywhere]">
						{item.value}
					</dd>
				</div>
			))}
		</dl>
	);
}

function DeploymentRow({ item, live }: { item: DeploymentItem; live: boolean }) {
	// Builds tag each version with its commit; older versions show their id.
	const label = item.tag ? item.tag.slice(0, 7) : shortVersionId(item.versionId);
	const rawMessage = item.message?.trim() || null;
	const displayMessage = rawMessage
		? formatDeploymentMessage(rawMessage)
		: item.rollback
			? "Rollback"
			: item.source === "wrangler"
				? "Wrangler deploy"
				: `Deployed from ${item.source}`;

	return (
		<li className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 overflow-hidden px-2 py-1.5">
			<span className="flex shrink-0 items-center gap-1.5">
				<code
					title={item.versionId}
					className={cn(
						"rounded-[6px] border px-1.5 py-px font-mono text-[12px] tabular-nums",
						live
							? "border-success/35 bg-success/10 text-success"
							: "border-line bg-surface-raised text-foreground",
					)}
				>
					{label}
				</code>
				{live ? (
					<span className="inline-flex items-center gap-1 rounded-full border border-success/35 bg-success/10 px-1.5 py-px text-[11px] leading-tight font-medium text-success">
						<span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
						Live
					</span>
				) : null}
			</span>
			<span
				title={rawMessage ?? undefined}
				className={cn(
					"min-w-0 truncate text-[13px]",
					rawMessage ? "text-foreground" : "text-muted-foreground",
				)}
			>
				{displayMessage}
			</span>
			<RelativeTime
				iso={item.createdOn}
				className="shrink-0 text-right text-[12px] text-muted-foreground"
			/>
		</li>
	);
}

function DeploymentsPanel({ deployments }: { deployments: DeploymentItem[] | null }) {
	const [expanded, setExpanded] = useState(false);
	const visible = deployments && !expanded ? deployments.slice(0, 3) : deployments;
	const hiddenCount = deployments ? Math.max(0, deployments.length - 3) : 0;

	return (
		<Panel
			title="Deployments"
			stagger={3}
			action={<ExternalLink href={CLOUDFLARE_PAGES.deployments}>All</ExternalLink>}
		>
			{visible === null ? (
				<p className="m-0 text-[13px] text-muted-foreground">Deployments could not be loaded.</p>
			) : visible.length === 0 ? (
				<p className="m-0 text-[13px] text-muted-foreground">No deployments yet.</p>
			) : (
				<div className="grid gap-1.5">
					<ul className="m-0 grid list-none gap-0.5 p-0">
						{visible.map((item, index) => (
							<DeploymentRow key={item.id} item={item} live={index === 0} />
						))}
					</ul>
					{hiddenCount > 0 ? (
						<button
							type="button"
							aria-expanded={expanded}
							onClick={() => setExpanded((open) => !open)}
							className="cms-press cms-page-focus inline-flex min-h-8 w-fit items-center rounded-full px-2.5 text-[12.5px] font-medium text-muted-foreground hover:bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] hover:text-foreground pointer-coarse:min-h-11"
						>
							{expanded ? "Show fewer" : `Show ${hiddenCount} more`}
						</button>
					) : null}
				</div>
			)}
		</Panel>
	);
}

function InfrastructureSkeleton() {
	return (
		<div className={pageClass}>
			<div className="grid gap-2">
				<h1 className="sr-only">Infrastructure</h1>
				<div aria-hidden="true" className="cms-skeleton h-8 w-48" />
				<div className="cms-skeleton h-4 w-80 max-w-full" />
			</div>
			<div className="cms-panel grid grid-cols-2 sm:grid-cols-4">
				{[0, 1, 2, 3].map((slot) => (
					<div key={slot} className="grid gap-2 p-3 sm:p-4">
						<div className="cms-skeleton h-3 w-16" />
						<div className="cms-skeleton h-6 w-14" />
						<div className="cms-skeleton h-3 w-20" />
					</div>
				))}
			</div>
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
				<div className="cms-panel grid gap-4 p-5">
					<div className="cms-skeleton h-5 w-28" />
					<div className="cms-skeleton h-56 w-full" />
				</div>
				<div className="grid gap-5">
					<div className="cms-panel grid gap-3 p-5">
						<div className="cms-skeleton h-5 w-32" />
						<div className="cms-skeleton h-12 w-full" />
					</div>
					<div className="cms-panel grid gap-3 p-5">
						<div className="cms-skeleton h-5 w-28" />
						<div className="cms-skeleton h-16 w-full" />
					</div>
				</div>
			</div>
		</div>
	);
}

function NotConfigured() {
	return (
		<section className="cms-panel cms-enter">
			<EmptyState
				icon={<InfrastructureIcon className="size-5" />}
				title="Connect Cloudflare metrics"
				description={
					<>
						Create a read-only API token with Account Analytics Read and Workers Scripts Read, then
						add it to the Worker as the{" "}
						<code className="font-mono text-[12.5px]">CF_API_TOKEN</code> secret.
					</>
				}
				action={
					<a
						href="https://dash.cloudflare.com/?to=/:account/api-tokens"
						target="_blank"
						rel="noreferrer"
						className={controlClass}
					>
						Create a token
						<ExternalArrowIcon className="size-3.5" />
						<span className="sr-only"> (opens in a new tab)</span>
					</a>
				}
			/>
		</section>
	);
}

function Unavailable() {
	const router = useRouter();
	return (
		<section className="cms-panel cms-enter">
			<EmptyState
				icon={<AlertTriangleIcon className="size-5" />}
				title="Metrics unavailable"
				description="Cloudflare's analytics could not be reached right now. Your site is unaffected."
				action={
					<>
						<button type="button" className={controlClass} onClick={() => void router.invalidate()}>
							Try again
						</button>
						<a
							href={CLOUDFLARE_DASHBOARD_URL}
							target="_blank"
							rel="noreferrer"
							className={controlClass}
						>
							Open dashboard
							<ExternalArrowIcon className="size-3.5" />
							<span className="sr-only"> (opens in a new tab)</span>
						</a>
					</>
				}
			/>
		</section>
	);
}

// ── Page ─────────────────────────────────────────────────────────────────────

function Infrastructure() {
	const reduced = useLiveReducedMotion();
	const { range } = Route.useSearch();
	const result = Route.useLoaderData();
	// Scope pending dimming to this route's own range updates so leaving never dims the outgoing view.
	const isRangePending = useRouterState({
		select: (state) =>
			state.status === "pending" &&
			state.resolvedLocation !== undefined &&
			state.location.pathname === state.resolvedLocation.pathname,
	});
	const rangeLabel = ranges.find(([value]) => value === range)?.[1] ?? "this range";
	const showRangeControl = result.ok || result.reason === "unavailable";

	return (
		<div className={pageClass}>
			<PageHeader
				title="Infrastructure"
				description={
					<>
						<span>Worker, database, and storage from Cloudflare.</span>
						{result.ok ? (
							<>
								{" "}
								<span className="inline-flex items-center gap-1 whitespace-nowrap">
									Rolling {rangeLabel} · updated <RelativeTime iso={result.insights.generatedAt} />
								</span>
							</>
						) : null}
					</>
				}
				actions={
					<div className="flex max-w-full flex-wrap items-center justify-end gap-2">
						{showRangeControl ? (
							<nav aria-label="Metrics range" className="cms-seg-track">
								{ranges.map(([value, label]) => {
									const isActive = range === value;
									return (
										<Link
											key={value}
											to="/cms/infrastructure"
											search={{ range: value }}
											resetScroll={false}
											activeOptions={{ exact: true, includeSearch: true }}
											data-active={isActive ? "true" : "false"}
											className="cms-seg-item shrink-0"
										>
											{isActive ? (
												<motion.span
													layoutId="cms-infra-range-pill"
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
						) : null}
						<a
							href={CLOUDFLARE_DASHBOARD_URL}
							target="_blank"
							rel="noreferrer"
							className="cms-header-action cms-press cms-page-focus"
						>
							<span>Cloudflare</span>
							<ExternalArrowIcon className="size-3.5" />
							<span className="sr-only"> (opens the dashboard in a new tab)</span>
						</a>
					</div>
				}
			/>

			{result.ok ? (
				<div
					aria-busy={isRangePending}
					className={cn(
						"grid min-w-0 gap-5 transition-opacity duration-200",
						isRangePending && "opacity-60",
					)}
				>
					<InsightsBody insights={result.insights} rangeLabel={rangeLabel} />
				</div>
			) : result.reason === "not-configured" ? (
				<NotConfigured />
			) : (
				<Unavailable />
			)}

			<CloudflareDashboardLinks stagger={result.ok ? 7 : 1} />
		</div>
	);
}

function InsightsBody({
	insights,
	rangeLabel,
}: {
	insights: CloudflareInsights;
	rangeLabel: string;
}) {
	const { mediaEnabled } = useCmsSession();
	const { worker, database, storage, cron, deployments } = insights;
	const outcomes = worker.statuses.map((row) => ({
		value: row.status,
		label: outcomeLabels[row.status] ?? row.status,
		count: row.requests,
	}));
	const failures = worker.statuses
		.filter((row) => !["success", "clientDisconnected"].includes(row.status))
		.reduce((sum, row) => sum + row.requests, 0);
	const errors = Math.max(worker.errors, failures);

	const stats: Stat[] = [
		{
			label: "Requests",
			value: worker.requests,
			format: requestCount,
			note:
				worker.subrequests > 0
					? `${requestCount(worker.subrequests)} subrequests`
					: "Pages, assets, and API",
		},
		{
			label: "Errors",
			value: errors,
			format: countLabel,
			tone: errors > 0 ? "warn" : "ok",
			note: `${formatRate(errors, worker.requests)} of requests`,
		},
		{
			label: "CPU time",
			value: worker.cpuP50Ms,
			format: formatMs,
			note: worker.cpuP99Ms !== null ? `Median · p99 ${formatMs(worker.cpuP99Ms)}` : "Median",
			title: "Median CPU time per request; p99 is the slowest 1%.",
		},
		{
			label: "Response time",
			value: worker.wallP50Ms,
			format: formatMs,
			note: worker.wallP99Ms !== null ? `Median · p99 ${formatMs(worker.wallP99Ms)}` : "Median",
			title: "Median wall time per request, including waiting on D1 and R2; p99 is the slowest 1%.",
		},
	];

	const totalOperations = storage?.operations.reduce((sum, row) => sum + row.requests, 0) ?? 0;

	return (
		<>
			<StatStrip stats={stats} stagger={0} />

			{/* Primary band: Requests chart paired with Outcomes + Deployments on wide screens. */}
			<div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
				<TrafficChart
					title="Requests"
					points={worker.series.map((point) => ({
						at: point.at,
						pageviews: point.requests,
						visitorDays: point.errors,
					}))}
					hourly={insights.bucket !== "day"}
					rangeLabel={`the last ${rangeLabel}`}
					stagger={1}
					secondaryTone="destructive"
					zeroSecondarySummary="0 errors in this range"
					series={{
						primary: { name: "Requests", one: "request", many: "requests" },
						secondary: { name: "Errors", one: "error", many: "errors" },
					}}
				/>

				<div className="grid min-w-0 items-start gap-5 lg:grid-cols-2 xl:grid-cols-1">
					<Panel
						title="Request outcomes"
						description="Visitor left early means the browser closed the connection first."
						stagger={2}
						action={<ExternalLink href={CLOUDFLARE_PAGES.logs}>Logs</ExternalLink>}
					>
						<RankedList rows={outcomes} empty="No requests in this range." />
					</Panel>

					<DeploymentsPanel deployments={deployments} />
				</div>
			</div>

			{/* Compact platform services band: Database, Media storage, and Daily maintenance. */}
			<div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)]">
				<Panel
					title="Database"
					description="D1 drafts, history, and analytics."
					stagger={4}
					className="gap-3 p-4"
					action={<ExternalLink href={CLOUDFLARE_PAGES.database}>D1</ExternalLink>}
				>
					{database ? (
						<MetricGrid
							items={[
								{ label: "Read queries", value: requestCount(database.readQueries) },
								{ label: "Write queries", value: requestCount(database.writeQueries) },
								{
									label: "Query time",
									value: database.latencyP50Ms !== null ? formatMs(database.latencyP50Ms) : "—",
									title: "Median time per query batch",
								},
								{ label: "Rows read", value: requestCount(database.rowsRead) },
								{ label: "Rows written", value: requestCount(database.rowsWritten) },
								{
									label: "Size",
									value: database.sizeBytes !== null ? formatBytes(database.sizeBytes) : "—",
								},
							]}
						/>
					) : (
						<p className="m-0 text-[13px] text-muted-foreground">Metrics unavailable</p>
					)}
				</Panel>

				<Panel
					title="Media storage"
					description={
						mediaEnabled ? "R2 images and attachments." : "R2 is not connected to the Worker yet."
					}
					stagger={5}
					className="gap-3 p-4"
					action={<ExternalLink href={CLOUDFLARE_PAGES.bucket}>R2</ExternalLink>}
				>
					{storage ? (
						<MetricGrid
							items={[
								{ label: "Objects", value: countLabel(storage.objects) },
								{ label: "Stored", value: formatBytes(storage.bytes) },
								{ label: "Operations", value: requestCount(totalOperations) },
							]}
						/>
					) : (
						<p className="m-0 text-[13px] text-muted-foreground">Metrics unavailable</p>
					)}
				</Panel>

				<Panel
					title="Daily maintenance"
					description="00:20 UTC · analytics rollup & cleanup."
					stagger={6}
					className="gap-3 p-4 md:col-span-2 xl:col-span-1"
					action={<ExternalLink href={CLOUDFLARE_PAGES.triggers}>Triggers</ExternalLink>}
				>
					{cron.length === 0 ? (
						<p className="m-0 text-[13px] text-muted-foreground">No runs in the last 7 days yet.</p>
					) : (
						<ul className="m-0 grid list-none gap-0.5 p-0">
							{cron.map((run) => {
								const ok = run.status === "success";
								return (
									<li
										key={run.at}
										className="flex min-w-0 items-center justify-between gap-3 px-1.5 py-1"
									>
										<span className="inline-flex min-w-0 items-center gap-2 text-[13px] text-foreground">
											{ok ? (
												<CheckCircleIcon className="size-3.5 shrink-0 text-success" />
											) : (
												<AlertTriangleIcon className="size-3.5 shrink-0 text-destructive" />
											)}
											<span>{ok ? "Completed" : (outcomeLabels[run.status] ?? run.status)}</span>
										</span>
										<RelativeTime
											iso={run.at}
											className="shrink-0 text-[12px] text-muted-foreground"
										/>
									</li>
								);
							})}
						</ul>
					)}
				</Panel>
			</div>
		</>
	);
}
