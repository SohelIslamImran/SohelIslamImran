/**
 * Hosting summary card for Overview (`/cms`) and compact "Open in Cloudflare"
 * link group for Infrastructure (`/cms/infrastructure`).
 */
import {
	cloudflareLinks,
	shortVersionId,
	type CloudflareLink,
	type CloudflareLinkId,
} from "../../lib/cloudflare-dashboard";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import type { WorkerInsights } from "../../server/cloudflare-insights.server";
import { getCloudflareInsights } from "../../server/cloudflare.functions";
import { RelativeTime } from "./analytics/RelativeTime";
import { Panel, TickingNumber, countLabel, staggerStyle } from "./analytics/Widgets";
import { useCmsSession, usePublicOrigin } from "./draft/context";
import { parseCmsTimestamp } from "./shell/time";
import { ActivityIcon, ExternalArrowIcon, HistoryIcon, OverviewIcon } from "./shell/cms-icons";

function LinkGlyph({ id }: { id: CloudflareLinkId }) {
	const className = "size-3.5";
	switch (id) {
		case "worker":
			return <OverviewIcon className={className} />;
		case "deployments":
			return <HistoryIcon className={className} />;
		case "logs":
			return <ActivityIcon className={className} />;
		case "database":
			return (
				<svg
					viewBox="0 0 20 20"
					aria-hidden="true"
					className={cn(
						className,
						"shrink-0 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]",
					)}
				>
					<ellipse cx="10" cy="5.5" rx="5.5" ry="2.25" />
					<path d="M4.5 5.5v9c0 1.24 2.46 2.25 5.5 2.25s5.5-1 5.5-2.25v-9" />
					<path d="M4.5 10c0 1.24 2.46 2.25 5.5 2.25s5.5-1 5.5-2.25" />
				</svg>
			);
		case "access":
			return (
				<svg
					viewBox="0 0 20 20"
					aria-hidden="true"
					className={cn(
						className,
						"shrink-0 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]",
					)}
				>
					<rect x="4.5" y="9" width="11" height="8" rx="2" />
					<path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
				</svg>
			);
		case "domain":
			return (
				<svg
					viewBox="0 0 20 20"
					aria-hidden="true"
					className={cn(
						className,
						"shrink-0 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]",
					)}
				>
					<circle cx="10" cy="10" r="6.75" />
					<path d="M3.5 10h13M10 3.25c1.9 2 2.75 4.25 2.75 6.75s-.85 4.75-2.75 6.75c-1.9-2-2.75-4.25-2.75-6.75S8.1 5.25 10 3.25Z" />
				</svg>
			);
	}
}

function DashboardLinkChip({ link }: { link: CloudflareLink }) {
	return (
		<li className="min-w-0">
			<a
				href={link.href}
				target="_blank"
				rel="noreferrer"
				title={link.detail}
				className="cms-jump-card cms-page-focus group flex min-h-10 min-w-0 items-center gap-2 rounded-[10px] border border-line bg-surface-solid px-3 py-2 text-[13px] font-medium text-foreground no-underline pointer-coarse:min-h-11"
			>
				<span
					aria-hidden="true"
					className="text-ink-soft transition-colors duration-150 group-hover:text-primary-text"
				>
					<LinkGlyph id={link.id} />
				</span>
				<span className="min-w-0 flex-1 truncate">{link.label}</span>
				<ExternalArrowIcon className="size-3.5 shrink-0 text-muted-foreground transition-[translate,color] duration-150 group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-primary-text motion-reduce:group-hover:translate-none" />
				<span className="sr-only"> (opens the Cloudflare dashboard in a new tab)</span>
			</a>
		</li>
	);
}

/** Compact "Open in Cloudflare" link group for the Infrastructure page. */
export function CloudflareDashboardLinks({ stagger }: { stagger?: number }) {
	const publicOrigin = usePublicOrigin();
	return (
		<Panel title="Open in Cloudflare" stagger={stagger}>
			<ul
				aria-label="Cloudflare dashboard"
				className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3"
			>
				{cloudflareLinks(publicOrigin).map((link) => (
					<DashboardLinkChip key={link.id} link={link} />
				))}
			</ul>
		</Panel>
	);
}

/** Running version line: id, commit tag, and how long ago it was deployed. */
function LiveVersion() {
	const { build } = useCmsSession();
	if (!build) {
		return <p className="m-0 text-[12px] text-muted-foreground">Live version unavailable</p>;
	}
	const created = build.timestamp ? parseCmsTimestamp(build.timestamp) : null;
	return (
		<p className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
			<span className="inline-flex items-center gap-1.5 font-medium text-foreground">
				<span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
				Live
			</span>
			<code
				title={build.id}
				className="rounded-[6px] border border-line bg-surface-raised px-1.5 py-px font-mono text-[11.5px] text-foreground tabular-nums"
			>
				{shortVersionId(build.id)}
			</code>
			{build.tag ? (
				<span title={build.tag} className="font-mono text-[11.5px]">
					{build.tag.slice(0, 7)}
				</span>
			) : null}
			{created ? (
				<span className="inline-flex items-center gap-1">
					<span aria-hidden="true">·</span>
					<RelativeTime iso={build.timestamp} />
				</span>
			) : null}
		</p>
	);
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const requestLabel = (value: number) =>
	Math.abs(value) < 10_000 ? countLabel(value) : compact.format(value);
const msLabel = (value: number) =>
	value >= 1000
		? `${(value / 1000).toFixed(1)} s`
		: `${value < 10 ? value.toFixed(1) : Math.round(value)} ms`;

type HealthState =
	| { kind: "loading" }
	| { kind: "ready"; worker: WorkerInsights }
	| { kind: "unavailable"; notConfigured: boolean };

/**
 * Compact Hosting summary card for Overview: live version/commit + last-24h
 * Worker health (requests, errors, median response), linking to Infrastructure.
 * Reserves its footprint while loading and shows a quiet unavailable line on
 * failure instead of vanishing.
 */
export function CloudflarePanel({ stagger }: { stagger?: number }) {
	const fetchInsights = useServerFn(getCloudflareInsights);
	const [health, setHealth] = useState<HealthState>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		void fetchInsights({ data: { range: "24h" } })
			.then((result) => {
				if (cancelled) return;
				if (result.ok) {
					setHealth({ kind: "ready", worker: result.insights.worker });
				} else {
					setHealth({
						kind: "unavailable",
						notConfigured: result.reason === "not-configured",
					});
				}
			})
			.catch(() => {
				if (!cancelled) setHealth({ kind: "unavailable", notConfigured: false });
			});
		return () => {
			cancelled = true;
		};
	}, [fetchInsights]);

	const stats =
		health.kind === "ready"
			? [
					{ label: "Requests", value: health.worker.requests, format: requestLabel },
					{ label: "Errors", value: health.worker.errors, format: countLabel },
					{ label: "Median response", value: health.worker.wallP50Ms, format: msLabel },
				]
			: null;

	const ariaLabel = stats
		? `Hosting, last 24 hours: ${stats
				.map((stat) => `${stat.label} ${stat.value === null ? "no data" : stat.format(stat.value)}`)
				.join(", ")}. Open infrastructure`
		: "Hosting, last 24 hours. Open infrastructure";

	return (
		<Link
			to="/cms/infrastructure"
			style={stagger !== undefined ? staggerStyle(stagger) : undefined}
			aria-label={ariaLabel}
			className="cms-panel cms-jump-card cms-enter cms-page-focus group flex h-full min-w-0 flex-col justify-between gap-3.5 p-4 no-underline sm:p-5"
		>
			<div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
				<div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
					<h2 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
						Hosting
					</h2>
					<span className="text-[12px] text-muted-foreground">Last 24 hours</span>
				</div>
				<span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-primary-text">
					<span>Infrastructure</span>
					<span
						aria-hidden="true"
						className="transition-[translate,color] duration-150 group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:group-hover:translate-x-0"
					>
						→
					</span>
				</span>
			</div>

			<div aria-busy={health.kind === "loading"} className="min-h-[48px]">
				{health.kind === "loading" ? (
					<div aria-hidden="true" className="grid grid-cols-3 gap-3">
						{[0, 1, 2].map((slot) => (
							<div key={slot} className="grid gap-1.5">
								<div className="cms-skeleton h-3.5 w-14" />
								<div className="cms-skeleton h-6 w-12" />
							</div>
						))}
					</div>
				) : health.kind === "unavailable" ? (
					<div className="flex min-h-[48px] items-center">
						<p className="m-0 text-[13px] text-muted-foreground">
							{health.notConfigured
								? "Metrics unavailable · connect Cloudflare"
								: "Metrics unavailable"}
						</p>
					</div>
				) : (
					<dl className="m-0 grid min-w-0 grid-cols-3 gap-x-3 gap-y-2">
						{stats?.map((stat) => (
							<div key={stat.label} className="flex min-w-0 flex-col justify-between gap-1">
								<dt className="text-[12px] leading-snug font-medium text-muted-foreground">
									{stat.label}
								</dt>
								<dd
									className={cn(
										"m-0 text-[20px] leading-none font-semibold tracking-[-0.025em] tabular-nums sm:text-[22px]",
										stat.label === "Errors" && (stat.value ?? 0) > 0
											? "text-destructive"
											: "text-foreground",
									)}
								>
									{stat.value === null ? (
										"—"
									) : (
										<TickingNumber value={stat.value} format={stat.format} />
									)}
								</dd>
							</div>
						))}
					</dl>
				)}
			</div>

			<div className="border-t border-line pt-2.5">
				<LiveVersion />
			</div>
		</Link>
	);
}
