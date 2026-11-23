/**
 * Overview card for the hosting side of the site: which Worker version is
 * live, and one-click links into the Cloudflare dashboard. The dashboard
 * cannot be framed (`X-Frame-Options: SAMEORIGIN`), so each link opens it in
 * a new tab.
 */
import {
	cloudflareLinks,
	shortVersionId,
	type CloudflareLink,
	type CloudflareLinkId,
} from "../../lib/cloudflare-dashboard";
import { cn } from "../../lib/utils";
import { RelativeTime } from "./analytics/RelativeTime";
import { Panel } from "./analytics/Widgets";
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

function LinkTile({ link }: { link: CloudflareLink }) {
	return (
		<li className="min-w-0">
			<a
				href={link.href}
				target="_blank"
				rel="noreferrer"
				className="cms-jump-card cms-page-focus group grid h-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-0.5 rounded-[12px] border border-line bg-surface-solid px-3 py-2.5 no-underline pointer-coarse:min-h-11"
			>
				<span
					aria-hidden="true"
					className="row-span-2 mt-px grid size-7 place-items-center rounded-[8px] border border-line bg-surface-raised text-ink-soft transition-colors duration-150 group-hover:text-primary-text"
				>
					<LinkGlyph id={link.id} />
				</span>
				<span className="truncate text-[13.5px] font-medium text-foreground">{link.label}</span>
				<ExternalArrowIcon className="mt-0.5 size-3.5 text-muted-foreground transition-[translate,color] duration-150 group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-primary-text motion-reduce:group-hover:translate-none" />
				<span className="col-start-2 col-end-4 text-[12px] leading-snug text-muted-foreground">
					{link.detail}
				</span>
				<span className="sr-only"> (opens the Cloudflare dashboard in a new tab)</span>
			</a>
		</li>
	);
}

/** Running version line: id, tag, and how long ago it was created. */
function LiveVersion() {
	const { build } = useCmsSession();
	if (!build) {
		return <p className="m-0 text-[12.5px] text-muted-foreground">Version unavailable</p>;
	}
	const created = build.timestamp ? parseCmsTimestamp(build.timestamp) : null;
	return (
		<p className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
			<span className="inline-flex items-center gap-1.5 font-medium text-foreground">
				<span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
				Live version
			</span>
			<code
				title={build.id}
				className="rounded-[6px] border border-line bg-surface-raised px-1.5 py-px font-mono text-[12px] text-foreground tabular-nums"
			>
				{shortVersionId(build.id)}
			</code>
			{build.tag ? <span className="font-mono text-[12px]">{build.tag}</span> : null}
			{created ? (
				<span className="inline-flex items-center gap-1">
					<span aria-hidden="true">·</span>
					<span>deployed</span>
					<RelativeTime iso={build.timestamp} />
				</span>
			) : null}
		</p>
	);
}

export function CloudflarePanel({ stagger }: { stagger?: number }) {
	const publicOrigin = usePublicOrigin();
	return (
		<Panel title="Cloudflare" stagger={stagger} action={<LiveVersion />}>
			<ul
				aria-label="Cloudflare dashboard"
				className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3"
			>
				{cloudflareLinks(publicOrigin).map((link) => (
					<LinkTile key={link.id} link={link} />
				))}
			</ul>
		</Panel>
	);
}
