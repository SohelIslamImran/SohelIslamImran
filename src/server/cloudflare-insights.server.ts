/**
 * Cloudflare insights for the CMS Infrastructure page.
 *
 * Reads the GraphQL Analytics API (Worker, D1, R2, and cron metrics) and the
 * Workers REST API (deployments and versions) with a read-only API token
 * (Account Analytics Read, Workers Scripts Read). The token stays on the
 * server; only normalized numbers reach the browser. Results are cached per
 * isolate for a minute because the analytics data lags by a minute or two.
 */
import {
	CLOUDFLARE_MEDIA_BUCKET,
	CLOUDFLARE_WORKER_NAME,
	type InsightsRange,
} from "../lib/cloudflare-dashboard";

export type { InsightsRange };

export interface InsightsConfig {
	token: string;
	accountId: string;
	databaseId?: string;
	workerName?: string;
	bucketName?: string;
}

export interface RequestPoint {
	/** ISO start of the bucket (UTC). */
	at: string;
	requests: number;
	errors: number;
}

export interface WorkerInsights {
	requests: number;
	errors: number;
	subrequests: number;
	/** Median and 99th percentile CPU time per request, in milliseconds. */
	cpuP50Ms: number | null;
	cpuP99Ms: number | null;
	/** Median and 99th percentile wall time per request, in milliseconds. */
	wallP50Ms: number | null;
	wallP99Ms: number | null;
	/** Requests per invocation outcome (`success`, `clientDisconnected`, ...), largest first. */
	statuses: { status: string; requests: number }[];
	series: RequestPoint[];
}

export interface DatabaseInsights {
	readQueries: number;
	writeQueries: number;
	rowsRead: number;
	rowsWritten: number;
	latencyP50Ms: number | null;
	latencyP90Ms: number | null;
	sizeBytes: number | null;
}

export interface StorageInsights {
	objects: number;
	bytes: number;
	/** Operations by R2 action (`GetObject`, `PutObject`, ...), largest first. */
	operations: { action: string; requests: number }[];
}

export interface CronRun {
	at: string;
	cron: string;
	status: string;
}

export interface DeploymentItem {
	id: string;
	versionId: string;
	createdOn: string;
	source: string;
	/** Commit subject when the deploy passed `--message`. */
	message: string | null;
	/** Short commit SHA when the deploy passed `--tag`. */
	tag: string | null;
	rollback: boolean;
}

export interface CloudflareInsights {
	range: InsightsRange;
	/** Bucket size of `worker.series`. */
	bucket: "hour" | "sixHours" | "day";
	from: string;
	to: string;
	generatedAt: string;
	worker: WorkerInsights;
	database: DatabaseInsights | null;
	storage: StorageInsights | null;
	cron: CronRun[];
	/** Null when the deployments request failed; the rest of the page still renders. */
	deployments: DeploymentItem[] | null;
}

export type CloudflareInsightsResult =
	| { ok: true; insights: CloudflareInsights }
	| { ok: false; reason: "not-configured" | "unavailable"; message: string };

const API = "https://api.cloudflare.com/client/v4";
const HOUR_MS = 3_600_000;
const RANGE_MS: Record<InsightsRange, number> = {
	"24h": 24 * HOUR_MS,
	"7d": 7 * 24 * HOUR_MS,
	"30d": 30 * 24 * HOUR_MS,
};
/** `workersInvocationsScheduled` accepts at most a 7-day window. */
const CRON_WINDOW_MS = 7 * 24 * HOUR_MS;
const CACHE_TTL_MS = 60_000;
const TIMEOUT_MS = 8_000;

const BUCKETS = {
	hour: { field: "datetimeHour", stepMs: HOUR_MS },
	sixHours: { field: "datetimeSixHours", stepMs: 6 * HOUR_MS },
	day: { field: "date", stepMs: 24 * HOUR_MS },
} as const;

export function bucketFor(range: InsightsRange): CloudflareInsights["bucket"] {
	return range === "24h" ? "hour" : range === "7d" ? "sixHours" : "day";
}

/** One GraphQL document for every account-level dataset the page shows. */
export function insightsQuery(bucket: CloudflareInsights["bucket"], withDatabase: boolean): string {
	const field = BUCKETS[bucket].field;
	const database = withDatabase
		? `
			d1: d1AnalyticsAdaptiveGroups(limit: 1, filter: { databaseId: $database, datetimeHour_geq: $from, datetimeHour_leq: $to }) {
				sum { readQueries writeQueries rowsRead rowsWritten }
				quantiles { queryBatchTimeMsP50 queryBatchTimeMsP90 }
			}
			d1Size: d1StorageAdaptiveGroups(limit: 1, filter: { databaseId: $database, date_geq: $fromDate, date_leq: $toDate }, orderBy: [date_DESC]) {
				max { databaseSizeBytes }
				dimensions { date }
			}`
		: "";
	return `query CmsInsights($account: String!, $script: String!, $bucket: String!${withDatabase ? ", $database: String!" : ""}, $from: Time!, $to: Time!, $fromDate: Date!, $toDate: Date!, $cronFrom: Time!) {
	viewer {
		accounts(filter: { accountTag: $account }) {
			totals: workersInvocationsAdaptive(limit: 1, filter: { scriptName: $script, datetime_geq: $from, datetime_leq: $to }) {
				sum { requests errors subrequests }
				quantiles { cpuTimeP50 cpuTimeP99 wallTimeP50 wallTimeP99 }
			}
			statuses: workersInvocationsAdaptive(limit: 20, filter: { scriptName: $script, datetime_geq: $from, datetime_leq: $to }) {
				sum { requests }
				dimensions { status }
			}
			series: workersInvocationsAdaptive(limit: 1000, filter: { scriptName: $script, datetime_geq: $from, datetime_leq: $to }, orderBy: [${field}_ASC]) {
				sum { requests errors }
				dimensions { ${field} }
			}${database}
			r2Size: r2StorageAdaptiveGroups(limit: 1, filter: { bucketName: $bucket, datetime_geq: $cronFrom, datetime_leq: $to }, orderBy: [datetime_DESC]) {
				max { objectCount payloadSize metadataSize }
				dimensions { datetime }
			}
			r2Ops: r2OperationsAdaptiveGroups(limit: 50, filter: { bucketName: $bucket, datetime_geq: $from, datetime_leq: $to }) {
				sum { requests }
				dimensions { actionType }
			}
			cron: workersInvocationsScheduled(limit: 5, filter: { scriptName: $script, datetime_geq: $cronFrom, datetime_leq: $to }, orderBy: [datetime_DESC]) {
				datetime
				cron
				status
			}
		}
	}
}`;
}

type Num = number | null | undefined;
interface GraphqlAccount {
	totals?: {
		sum?: { requests?: Num; errors?: Num; subrequests?: Num };
		quantiles?: { cpuTimeP50?: Num; cpuTimeP99?: Num; wallTimeP50?: Num; wallTimeP99?: Num };
	}[];
	statuses?: { sum?: { requests?: Num }; dimensions?: { status?: string } }[];
	series?: {
		sum?: { requests?: Num; errors?: Num };
		dimensions?: Record<string, string | undefined>;
	}[];
	d1?: {
		sum?: { readQueries?: Num; writeQueries?: Num; rowsRead?: Num; rowsWritten?: Num };
		quantiles?: { queryBatchTimeMsP50?: Num; queryBatchTimeMsP90?: Num };
	}[];
	d1Size?: { max?: { databaseSizeBytes?: Num } }[];
	r2Size?: { max?: { objectCount?: Num; payloadSize?: Num; metadataSize?: Num } }[];
	r2Ops?: { sum?: { requests?: Num }; dimensions?: { actionType?: string } }[];
	cron?: { datetime?: string; cron?: string; status?: string }[];
}

const n = (value: Num) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
/** Microseconds to milliseconds with one decimal; null when there is no data. */
const ms = (value: Num, requests: number) =>
	requests > 0 && typeof value === "number" ? Math.round(value / 100) / 10 : null;

/** Bucket keys from the API are hour/six-hour timestamps or a bare date. */
function bucketStart(key: string): number {
	return Date.parse(key.length === 10 ? `${key}T00:00:00Z` : key);
}

/** Every bucket in the window, zero-filled, so the chart never skips gaps. */
export function fillSeries(
	rows: GraphqlAccount["series"],
	bucket: CloudflareInsights["bucket"],
	from: Date,
	to: Date,
): RequestPoint[] {
	const { field, stepMs } = BUCKETS[bucket];
	const counts = new Map<number, { requests: number; errors: number }>();
	for (const row of rows ?? []) {
		const key = row.dimensions?.[field];
		if (!key) continue;
		const start = bucketStart(key);
		if (Number.isNaN(start)) continue;
		const current = counts.get(start) ?? { requests: 0, errors: 0 };
		current.requests += n(row.sum?.requests);
		current.errors += n(row.sum?.errors);
		counts.set(start, current);
	}
	const first = Math.floor(from.getTime() / stepMs) * stepMs;
	const points: RequestPoint[] = [];
	for (let at = first; at <= to.getTime(); at += stepMs) {
		const value = counts.get(at) ?? { requests: 0, errors: 0 };
		points.push({ at: new Date(at).toISOString(), ...value });
	}
	return points;
}

export function normalizeInsights(
	account: GraphqlAccount,
	options: {
		range: InsightsRange;
		from: Date;
		to: Date;
		withDatabase: boolean;
		deployments: DeploymentItem[] | null;
		now?: Date;
	},
): CloudflareInsights {
	const bucket = bucketFor(options.range);
	const totals = account.totals?.[0];
	const requests = n(totals?.sum?.requests);
	const d1 = account.d1?.[0];
	const r2 = account.r2Size?.[0]?.max;
	return {
		range: options.range,
		bucket,
		from: options.from.toISOString(),
		to: options.to.toISOString(),
		generatedAt: (options.now ?? new Date()).toISOString(),
		worker: {
			requests,
			errors: n(totals?.sum?.errors),
			subrequests: n(totals?.sum?.subrequests),
			cpuP50Ms: ms(totals?.quantiles?.cpuTimeP50, requests),
			cpuP99Ms: ms(totals?.quantiles?.cpuTimeP99, requests),
			wallP50Ms: ms(totals?.quantiles?.wallTimeP50, requests),
			wallP99Ms: ms(totals?.quantiles?.wallTimeP99, requests),
			statuses: (account.statuses ?? [])
				.map((row) => ({
					status: row.dimensions?.status ?? "unknown",
					requests: n(row.sum?.requests),
				}))
				.filter((row) => row.requests > 0)
				.sort((left, right) => right.requests - left.requests),
			series: fillSeries(account.series, bucket, options.from, options.to),
		},
		database: options.withDatabase
			? {
					readQueries: n(d1?.sum?.readQueries),
					writeQueries: n(d1?.sum?.writeQueries),
					rowsRead: n(d1?.sum?.rowsRead),
					rowsWritten: n(d1?.sum?.rowsWritten),
					latencyP50Ms:
						typeof d1?.quantiles?.queryBatchTimeMsP50 === "number"
							? d1.quantiles.queryBatchTimeMsP50
							: null,
					latencyP90Ms:
						typeof d1?.quantiles?.queryBatchTimeMsP90 === "number"
							? d1.quantiles.queryBatchTimeMsP90
							: null,
					sizeBytes:
						typeof account.d1Size?.[0]?.max?.databaseSizeBytes === "number"
							? account.d1Size[0].max.databaseSizeBytes
							: null,
				}
			: null,
		storage: {
			objects: n(r2?.objectCount),
			bytes: n(r2?.payloadSize) + n(r2?.metadataSize),
			operations: (account.r2Ops ?? [])
				.map((row) => ({
					action: row.dimensions?.actionType ?? "Unknown",
					requests: n(row.sum?.requests),
				}))
				.filter((row) => row.requests > 0)
				.sort((left, right) => right.requests - left.requests),
		},
		cron: (account.cron ?? [])
			.filter((row): row is { datetime: string; cron?: string; status?: string } =>
				Boolean(row.datetime),
			)
			.map((row) => ({ at: row.datetime, cron: row.cron ?? "", status: row.status ?? "unknown" })),
		deployments: options.deployments,
	};
}

interface RestEnvelope<T> {
	success: boolean;
	result: T;
}
interface RestDeployment {
	id: string;
	source?: string;
	created_on: string;
	annotations?: Record<string, string | undefined>;
	versions?: { version_id: string; percentage: number }[];
}
interface RestVersion {
	id: string;
	annotations?: Record<string, string | undefined>;
}

export function normalizeDeployments(
	deployments: RestDeployment[],
	versions: RestVersion[],
): DeploymentItem[] {
	const byId = new Map(versions.map((version) => [version.id, version.annotations ?? {}]));
	return deployments
		.slice()
		.sort((left, right) => Date.parse(right.created_on) - Date.parse(left.created_on))
		.map((deployment) => {
			const main = deployment.versions?.slice().sort((a, b) => b.percentage - a.percentage)[0];
			const versionId = main?.version_id ?? "";
			const annotations = byId.get(versionId) ?? {};
			const message =
				deployment.annotations?.["workers/message"] ?? annotations["workers/message"] ?? null;
			return {
				id: deployment.id,
				versionId,
				createdOn: deployment.created_on,
				source: deployment.source ?? "unknown",
				message: message?.trim() || null,
				tag: annotations["workers/tag"]?.trim() || null,
				rollback: deployment.annotations?.["workers/triggered_by"] === "rollback",
			};
		});
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

async function api<T>(
	fetcher: FetchLike,
	token: string,
	path: string,
	init?: RequestInit,
): Promise<T> {
	const response = await fetcher(`${API}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			...init?.headers,
		},
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!response.ok) throw new Error(`Cloudflare API responded ${response.status}`);
	return (await response.json()) as T;
}

async function readDeployments(
	fetcher: FetchLike,
	config: InsightsConfig,
	script: string,
): Promise<DeploymentItem[] | null> {
	try {
		const base = `/accounts/${config.accountId}/workers/scripts/${script}`;
		const [deployments, versions] = await Promise.all([
			api<RestEnvelope<{ deployments: RestDeployment[] }>>(
				fetcher,
				config.token,
				`${base}/deployments`,
			),
			api<RestEnvelope<{ items: RestVersion[] }>>(
				fetcher,
				config.token,
				`${base}/versions?per_page=20`,
			),
		]);
		if (!deployments.success || !versions.success) return null;
		return normalizeDeployments(deployments.result.deployments, versions.result.items).slice(0, 6);
	} catch {
		return null;
	}
}

const cache = new Map<string, { expires: number; value: CloudflareInsights }>();

/** Clears the per-isolate cache (tests). */
export function clearInsightsCache(): void {
	cache.clear();
}

export async function readCloudflareInsights(
	config: InsightsConfig,
	range: InsightsRange,
	fetcher: FetchLike = fetch,
	now: Date = new Date(),
): Promise<CloudflareInsights> {
	const key = `${config.accountId}:${range}`;
	const cached = cache.get(key);
	if (cached && cached.expires > now.getTime()) return cached.value;

	const script = config.workerName ?? CLOUDFLARE_WORKER_NAME;
	const to = now;
	const from = new Date(to.getTime() - RANGE_MS[range]);
	const cronFrom = new Date(to.getTime() - CRON_WINDOW_MS);
	const withDatabase = Boolean(config.databaseId);
	const variables: Record<string, string> = {
		account: config.accountId,
		script,
		bucket: config.bucketName ?? CLOUDFLARE_MEDIA_BUCKET,
		from: from.toISOString(),
		to: to.toISOString(),
		fromDate: from.toISOString().slice(0, 10),
		toDate: to.toISOString().slice(0, 10),
		cronFrom: cronFrom.toISOString(),
	};
	if (config.databaseId) variables.database = config.databaseId;

	const [graph, deployments] = await Promise.all([
		api<{
			data?: { viewer?: { accounts?: GraphqlAccount[] } } | null;
			errors?: { message?: string }[] | null;
		}>(fetcher, config.token, "/graphql", {
			method: "POST",
			body: JSON.stringify({ query: insightsQuery(bucketFor(range), withDatabase), variables }),
		}),
		readDeployments(fetcher, config, script),
	]);
	if (graph.errors?.length) {
		throw new Error(
			`Cloudflare analytics query failed: ${graph.errors[0]?.message ?? "unknown error"}`,
		);
	}
	const account = graph.data?.viewer?.accounts?.[0];
	if (!account) throw new Error("Cloudflare analytics returned no account data");

	const value = normalizeInsights(account, { range, from, to, withDatabase, deployments, now });
	cache.set(key, { expires: now.getTime() + CACHE_TTL_MS, value });
	return value;
}
