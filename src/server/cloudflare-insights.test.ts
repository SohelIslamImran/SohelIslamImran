import { afterEach, describe, expect, it, vi } from "vitest";
import {
	bucketFor,
	clearInsightsCache,
	fillSeries,
	insightsQuery,
	normalizeDeployments,
	normalizeInsights,
	readCloudflareInsights,
} from "./cloudflare-insights.server";

const now = new Date("2026-11-23T09:30:00Z");
const from = new Date(now.getTime() - 24 * 3_600_000);

describe("fillSeries", () => {
	it("zero-fills every hour in the window", () => {
		const points = fillSeries(
			[{ sum: { requests: 4, errors: 1 }, dimensions: { datetimeHour: "2026-11-23T08:00:00Z" } }],
			"hour",
			from,
			now,
		);
		expect(points).toHaveLength(25);
		expect(points[0]?.at).toBe("2026-11-22T09:00:00.000Z");
		expect(points.at(-1)?.at).toBe("2026-11-23T09:00:00.000Z");
		expect(points.find((point) => point.at === "2026-11-23T08:00:00.000Z")).toEqual({
			at: "2026-11-23T08:00:00.000Z",
			requests: 4,
			errors: 1,
		});
		expect(points.filter((point) => point.requests > 0)).toHaveLength(1);
	});

	it("reads bare dates for daily buckets", () => {
		const points = fillSeries(
			[{ sum: { requests: 9, errors: 0 }, dimensions: { date: "2026-11-21" } }],
			"day",
			new Date("2026-11-20T10:00:00Z"),
			now,
		);
		expect(points.map((point) => point.at.slice(0, 10))).toEqual([
			"2026-11-20",
			"2026-11-21",
			"2026-11-22",
			"2026-11-23",
		]);
		expect(points[1]?.requests).toBe(9);
	});
});

describe("normalizeInsights", () => {
	it("converts microseconds to milliseconds and sorts breakdowns", () => {
		const insights = normalizeInsights(
			{
				totals: [
					{
						sum: { requests: 100, errors: 2, subrequests: 5 },
						quantiles: {
							cpuTimeP50: 4525,
							cpuTimeP99: 203905,
							wallTimeP50: 5512,
							wallTimeP99: 505680,
						},
					},
				],
				statuses: [
					{ sum: { requests: 10 }, dimensions: { status: "clientDisconnected" } },
					{ sum: { requests: 90 }, dimensions: { status: "success" } },
					{ sum: { requests: 0 }, dimensions: { status: "internalError" } },
				],
				d1: [
					{
						sum: { readQueries: 874, writeQueries: 10, rowsRead: 1107, rowsWritten: 22 },
						quantiles: { queryBatchTimeMsP50: 0.23, queryBatchTimeMsP90: 0.61 },
					},
				],
				d1Size: [{ max: { databaseSizeBytes: 126976 } }],
				r2Size: [{ max: { objectCount: 3, payloadSize: 1000, metadataSize: 24 } }],
				r2Ops: [
					{ sum: { requests: 1 }, dimensions: { actionType: "PutObject" } },
					{ sum: { requests: 7 }, dimensions: { actionType: "GetObject" } },
				],
				cron: [{ datetime: "2026-11-23T00:20:00Z", cron: "20 0 * * *", status: "success" }],
			},
			{ range: "24h", from, to: now, withDatabase: true, deployments: null, now },
		);
		expect(insights.bucket).toBe("hour");
		expect(insights.worker).toMatchObject({
			requests: 100,
			errors: 2,
			cpuP50Ms: 4.5,
			cpuP99Ms: 203.9,
			wallP50Ms: 5.5,
			wallP99Ms: 505.7,
		});
		expect(insights.worker.statuses.map((row) => row.status)).toEqual([
			"success",
			"clientDisconnected",
		]);
		expect(insights.database).toMatchObject({
			readQueries: 874,
			latencyP50Ms: 0.23,
			sizeBytes: 126976,
		});
		expect(insights.storage).toEqual({
			objects: 3,
			bytes: 1024,
			operations: [
				{ action: "GetObject", requests: 7 },
				{ action: "PutObject", requests: 1 },
			],
		});
		expect(insights.cron).toEqual([
			{ at: "2026-11-23T00:20:00Z", cron: "20 0 * * *", status: "success" },
		]);
	});

	it("reports no latency when there were no requests", () => {
		const insights = normalizeInsights(
			{ totals: [{ sum: { requests: 0 }, quantiles: { cpuTimeP50: 0 } }] },
			{ range: "7d", from, to: now, withDatabase: false, deployments: [], now },
		);
		expect(insights.worker.cpuP50Ms).toBeNull();
		expect(insights.database).toBeNull();
		expect(insights.storage).toEqual({ objects: 0, bytes: 0, operations: [] });
	});
});

describe("normalizeDeployments", () => {
	it("joins version annotations and orders newest first", () => {
		const items = normalizeDeployments(
			[
				{
					id: "d1",
					source: "wrangler",
					created_on: "2026-11-20T21:39:32Z",
					versions: [{ version_id: "v1", percentage: 100 }],
				},
				{
					id: "d2",
					source: "wrangler",
					created_on: "2026-11-23T09:07:09Z",
					annotations: { "workers/triggered_by": "rollback" },
					versions: [{ version_id: "v2", percentage: 100 }],
				},
			],
			[
				{ id: "v2", annotations: { "workers/message": " Merge #14 ", "workers/tag": "abc1234" } },
				{ id: "v1", annotations: {} },
			],
		);
		expect(items.map((item) => item.id)).toEqual(["d2", "d1"]);
		expect(items[0]).toMatchObject({
			versionId: "v2",
			message: "Merge #14",
			tag: "abc1234",
			rollback: true,
		});
		expect(items[1]).toMatchObject({ message: null, tag: null, rollback: false });
	});
});

describe("readCloudflareInsights", () => {
	afterEach(() => clearInsightsCache());

	const config = { token: "test-token", accountId: "acct", databaseId: "db" };
	const graphql = {
		data: {
			viewer: {
				accounts: [
					{ totals: [{ sum: { requests: 3, errors: 0, subrequests: 0 }, quantiles: {} }] },
				],
			},
		},
	};

	function mockFetch(graph: unknown = graphql) {
		return vi.fn(async (url: string) => {
			if (url.endsWith("/graphql")) return Response.json(graph);
			if (url.includes("/deployments"))
				return Response.json({ success: true, result: { deployments: [] } });
			return Response.json({ success: true, result: { items: [] } });
		});
	}

	it("sends the token only as a bearer header and caches for a minute", async () => {
		const fetcher = mockFetch();
		const first = await readCloudflareInsights(config, "24h", fetcher, now);
		expect(first.worker.requests).toBe(3);
		expect(first.deployments).toEqual([]);
		const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).not.toContain("test-token");
		expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
		expect(String(init.body)).not.toContain("test-token");

		await readCloudflareInsights(config, "24h", fetcher, new Date(now.getTime() + 30_000));
		expect(fetcher).toHaveBeenCalledTimes(3);
		await readCloudflareInsights(config, "24h", fetcher, new Date(now.getTime() + 61_000));
		expect(fetcher).toHaveBeenCalledTimes(6);
	});

	it("throws on GraphQL errors and keeps going without deployments", async () => {
		await expect(
			readCloudflareInsights(
				config,
				"7d",
				mockFetch({ data: null, errors: [{ message: "bad" }] }),
				now,
			),
		).rejects.toThrow("bad");

		const failingRest = vi.fn(async (url: string) =>
			url.endsWith("/graphql") ? Response.json(graphql) : new Response("nope", { status: 403 }),
		);
		const insights = await readCloudflareInsights(config, "30d", failingRest, now);
		expect(insights.deployments).toBeNull();
		expect(insights.bucket).toBe("day");
	});
});

describe("insightsQuery", () => {
	it("uses the bucket's dimension and only asks for D1 when configured", () => {
		expect(bucketFor("7d")).toBe("sixHours");
		expect(insightsQuery("sixHours", false)).toContain("datetimeSixHours_ASC");
		expect(insightsQuery("sixHours", false)).not.toContain("d1AnalyticsAdaptiveGroups");
		expect(insightsQuery("day", true)).toContain("$database: String!");
	});
});
