/**
 * Deep links from the CMS into the Cloudflare dashboard.
 *
 * The dashboard refuses to render inside a frame (`X-Frame-Options:
 * SAMEORIGIN`), so the CMS links out instead. Links use the dashboard's
 * `?to=/:account/...` form, which resolves the signed-in account, so no
 * account ID is stored in the app.
 */

/** The Worker `name` in `wrangler.jsonc`. */
export const CLOUDFLARE_WORKER_NAME = "portfolio";
/** The `MEDIA` bucket in `wrangler.jsonc`. */
export const CLOUDFLARE_MEDIA_BUCKET = "portfolio-media-production";

const DASHBOARD = "https://dash.cloudflare.com/?to=/:account";
const WORKER_PATH = `/workers/services/view/${CLOUDFLARE_WORKER_NAME}/production`;

export type CloudflareLinkId = "worker" | "deployments" | "logs" | "database" | "access" | "domain";

export interface CloudflareLink {
	id: CloudflareLinkId;
	label: string;
	detail: string;
	keywords: string;
	href: string;
}

/** A dashboard page for the signed-in account, from its account-relative path. */
export function dashboardUrl(path: string): string {
	return `${DASHBOARD}${path}`;
}

/** Deep links used by the Infrastructure page panels. */
export const CLOUDFLARE_PAGES = {
	deployments: dashboardUrl(`${WORKER_PATH}/deployments`),
	logs: dashboardUrl(`${WORKER_PATH}/observability`),
	metrics: dashboardUrl(`${WORKER_PATH}/metrics`),
	triggers: dashboardUrl(`${WORKER_PATH}/settings`),
	database: dashboardUrl("/workers/d1"),
	bucket: dashboardUrl(`/r2/default/buckets/${CLOUDFLARE_MEDIA_BUCKET}`),
} as const;

/** The Worker overview: the dashboard entry point the CMS opens by default. */
export const CLOUDFLARE_DASHBOARD_URL = dashboardUrl(WORKER_PATH);

/**
 * The zone that serves the public site, from its origin (`www.` dropped), or
 * null for a local origin such as `127.0.0.1` or `localhost`.
 */
export function cloudflareZone(publicOrigin: string): string | null {
	const host = new URL(publicOrigin).hostname.replace(/^www\./u, "");
	const local = !host.includes(".") || /^[\d.]+$/u.test(host) || host.endsWith(".localhost");
	return local ? null : host;
}

export function cloudflareLinks(publicOrigin: string): CloudflareLink[] {
	const zone = cloudflareZone(publicOrigin);
	return [
		{
			id: "worker",
			label: "Worker overview",
			detail: "Requests, errors, and CPU time",
			keywords: "worker metrics requests errors cpu overview",
			href: CLOUDFLARE_DASHBOARD_URL,
		},
		{
			id: "deployments",
			label: "Deployments",
			detail: "Builds from main, versions, and rollbacks",
			keywords: "deployments builds versions rollback ci",
			href: dashboardUrl(`${WORKER_PATH}/deployments`),
		},
		{
			id: "logs",
			label: "Logs",
			detail: "Worker logs and exceptions",
			keywords: "logs observability errors exceptions events tail",
			href: dashboardUrl(`${WORKER_PATH}/observability`),
		},
		{
			id: "database",
			label: "D1 database",
			detail: "Console, tables, and Time Travel restores",
			keywords: "d1 database sql console tables time travel backup restore",
			href: dashboardUrl("/workers/d1"),
		},
		{
			id: "access",
			label: "Access",
			detail: "Who can sign in to this CMS",
			keywords: "access zero trust sign in login policy owner",
			href: dashboardUrl("/one/access-controls/apps"),
		},
		{
			id: "domain",
			label: zone ?? "Domains",
			detail: zone ? "DNS, caching, and security for the domain" : "Every domain on the account",
			keywords: "domain zone dns cache security ssl waf",
			href: dashboardUrl(zone ? `/${zone}` : "/domains/overview"),
		},
	];
}

/** Ranges the Infrastructure page offers (GraphQL allows at most 32 days per query). */
export const INSIGHTS_RANGES = ["24h", "7d", "30d"] as const;
export type InsightsRange = (typeof INSIGHTS_RANGES)[number];

/** The live Worker version, from the version metadata binding. */
export interface CmsBuildInfo {
	id: string;
	tag: string;
	/** ISO timestamp of when the version was created; empty when unknown. */
	timestamp: string;
}

/** Versions are shown by the same 8-character prefix the dashboard uses. */
export function shortVersionId(id: string): string {
	return id.slice(0, 8);
}

const MERGE_PR_PATTERN = /^Merge pull request #(\d+) from [^/\s]+\/(.+)$/iu;

/** Compact GitHub merge-commit subjects ("PR #16 · branch"); keep the raw message in `title`. */
export function formatDeploymentMessage(message: string): string {
	const trimmed = message.trim();
	const match = MERGE_PR_PATTERN.exec(trimmed);
	if (match) return `PR #${match[1]} · ${match[2]}`;
	return trimmed;
}

const NON_ERROR_WORKER_STATUSES = new Set(["success", "clientDisconnected"]);

/**
 * Total Worker errors across Cloudflare's `sum.errors` metric and failure
 * invocation statuses, shared by Overview's Hosting card and Infrastructure.
 */
export function countWorkerErrors(worker: {
	errors: number;
	statuses: readonly { status: string; requests: number }[];
}): number {
	const failures = worker.statuses
		.filter((row) => !NON_ERROR_WORKER_STATUSES.has(row.status))
		.reduce((sum, row) => sum + row.requests, 0);
	return Math.max(worker.errors, failures);
}
