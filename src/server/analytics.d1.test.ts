import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalAnalyticsPath } from "../components/analytics/paths";
import { createTestD1, type TestD1 } from "../test-support/d1";
import {
	analyticsKey,
	collectAnalytics,
	dailyAnalyticsSecrets,
} from "./analytics-collector.server";
import {
	maintainAnalytics,
	readAnalyticsOverview,
	readAnalyticsSummary,
	readLiveVisitors,
} from "./analytics.server";

const publicOrigin = "https://public.example";
const cmsOrigin = "https://cms.example";
const tab = "25c8b9e6-2a13-4112-b287-76388110043f";
const baseTime = Date.parse("2026-11-21T10:30:00.333Z");
const day = 86_400_000;
const ua = "Mozilla/5.0 (iPhone) CriOS/100 Mobile Safari/604.1";
const pageview = () => ({
	kind: "pageview",
	event_id: crypto.randomUUID(),
	tab_id: tab,
	path: "/",
	visible: true,
});
const request = (body: unknown, url = publicOrigin, headers: Record<string, string> = {}) =>
	new Request(`${url}/api/collect`, {
		method: "POST",
		body: typeof body === "string" ? body : JSON.stringify(body),
		headers: {
			Origin: publicOrigin,
			"Content-Type": "text/plain; charset=UTF-8",
			"User-Agent": ua,
			"CF-Connecting-IP": "192.0.2.12",
			...headers,
		},
	});

describe("public analytics paths", () => {
	it("drops query, fragment and trailing slash and canonicalizes the project segment", () => {
		expect(canonicalAnalyticsPath("/")).toBe("/");
		expect(canonicalAnalyticsPath("/work/?filter=anything")).toBe("/work");
		expect(canonicalAnalyticsPath("/work/%73ample-project/?key=private#section")).toBe(
			"/work/sample-project",
		);
		expect(canonicalAnalyticsPath("/work/caf%C3%A9")).toBe("/work/caf%C3%A9");
	});

	it.each([
		"",
		"?search=1",
		"//evil.example",
		"https://public.example/work",
		"/cms",
		"/resume/edit",
		"/media/private",
		"/links/private",
		"/work/one/two",
		"/work/%2fsecret",
		"/work/..",
		"/work/%zz",
		"/work//",
		"/travel",
	])("rejects %s", (value) => {
		expect(canonicalAnalyticsPath(value)).toBeNull();
	});
});

describe("analytics collector validation", () => {
	const env = { APP_ORIGIN: publicOrigin, CMS_ORIGIN: cmsOrigin };

	it("rejects foreign origins and the CMS host before invoking the limiter", async () => {
		const limit = vi.fn(async () => ({ success: true }));
		const guarded = { ...env, ANALYTICS_LIMITER: { limit } };
		expect(
			(
				await collectAnalytics(
					request(pageview(), publicOrigin, { Origin: "https://other.example" }),
					guarded,
				)
			).status,
		).toBe(403);
		expect((await collectAnalytics(request(pageview(), cmsOrigin), guarded)).status).toBe(404);
		expect(
			(
				await collectAnalytics(
					request(pageview(), "http://localhost:5173", { Origin: "http://localhost:5173" }),
					guarded,
				)
			).status,
		).toBe(403);
		expect(limit).not.toHaveBeenCalled();

		const development = { ...guarded, ENVIRONMENT: "development" };
		expect(
			(
				await collectAnalytics(
					request({ kind: "invalid" }, "http://localhost:5173", {
						Origin: "http://localhost:5173",
					}),
					development,
				)
			).status,
		).toBe(400);
		expect(
			(
				await collectAnalytics(
					request(pageview(), "http://cms.localhost:5173", { Origin: "http://cms.localhost:5173" }),
					development,
				)
			).status,
		).toBe(404);
		expect(limit).toHaveBeenCalledTimes(1);
	});

	it("limits before reading a body or accessing D1 and keys by the Cloudflare client", async () => {
		const limit = vi.fn(async (_input: { key: string }) => ({ success: false }));
		const incoming = request("malformed JSON");
		const getReader = vi.spyOn(incoming.body!, "getReader");
		const guarded = { ...env, ANALYTICS_LIMITER: { limit } };
		expect((await collectAnalytics(incoming, guarded)).status).toBe(429);
		expect(getReader).not.toHaveBeenCalled();
		await collectAnalytics(
			request(pageview(), publicOrigin, { "User-Agent": "Other browser" }),
			guarded,
		);
		await collectAnalytics(
			request(pageview(), publicOrigin, { "CF-Connecting-IP": "192.0.2.13" }),
			guarded,
		);
		expect(limit.mock.calls[0]).toEqual(limit.mock.calls[1]);
		expect(limit.mock.calls[0]).not.toEqual(limit.mock.calls[2]);
		expect(limit.mock.calls[0]?.[0].key).toMatch(/^[a-f\d]{32}$/u);
	});

	it("uses a bounded isolate rate limit when the binding is absent", async () => {
		const run = (time: number) =>
			collectAnalytics(
				request("invalid", publicOrigin, { "CF-Connecting-IP": "192.0.2.221" }),
				env,
				undefined,
				time,
			);
		const start = baseTime - (baseTime % 60_000);
		for (let i = 0; i < 60; i++) expect((await run(start)).status).toBe(400);
		expect((await run(start)).status).toBe(429);
		expect((await run(start + 60_000)).status).toBe(400);
	});

	it("caps streamed bytes and checks media type, shape, path, bot and DNT", async () => {
		const guarded = { ...env, ANALYTICS_LIMITER: { limit: async () => ({ success: true }) } };
		const oversized = request("é".repeat(1025));
		expect(oversized.headers.get("content-length")).toBeNull();
		expect((await collectAnalytics(oversized, guarded)).status).toBe(413);
		expect(
			(
				await collectAnalytics(
					request(pageview(), publicOrigin, { "Content-Type": "application/json" }),
					guarded,
				)
			).status,
		).toBe(415);
		for (const body of [
			{ ...pageview(), ip: "192.0.2.12" },
			{ ...pageview(), event_id: "invalid" },
			{ ...pageview(), path: "/cms" },
			{ ...pageview(), referrer_host: "192.0.2.12" },
			{
				kind: "outbound",
				path: "/",
				event_id: crypto.randomUUID(),
				tab_id: tab,
				link_id: "valid-id",
				destination_host: "example.com",
			},
		])
			expect((await collectAnalytics(request(body), guarded)).status).toBe(400);
		expect(
			(
				await collectAnalytics(
					request(pageview(), publicOrigin, { "User-Agent": "PreviewBot" }),
					guarded,
				)
			).status,
		).toBe(204);
		expect(
			(await collectAnalytics(request(pageview(), publicOrigin, { DNT: "1" }), guarded)).status,
		).toBe(204);
	});
});

describe("analytics in Miniflare D1", () => {
	let test: TestD1;
	beforeAll(async () => {
		test = await createTestD1();
	}, 30_000);
	afterAll(async () => {
		await test?.dispose();
	});
	beforeEach(async () => {
		await test.db.batch([
			test.db.prepare("DELETE FROM analytics_events"),
			test.db.prepare("DELETE FROM analytics_presence"),
			test.db.prepare("DELETE FROM analytics_salts"),
			test.db.prepare("DELETE FROM analytics_daily"),
		]);
	});

	function submit(body: unknown, now: number, headers?: Record<string, string>) {
		return collectAnalytics(
			request(body, publicOrigin, headers),
			{
				DB: test.db,
				APP_ORIGIN: publicOrigin,
				CMS_ORIGIN: cmsOrigin,
				ANALYTICS_LIMITER: { limit: async () => ({ success: true }) },
			},
			undefined,
			now,
		);
	}

	it("rotates separate HMAC keys across UTC days and resolves concurrent salt creation", async () => {
		const [first, same] = await Promise.all([
			dailyAnalyticsSecrets(test.db, "2026-11-20"),
			dailyAnalyticsSecrets(test.db, "2026-11-20"),
		]);
		expect(first).toEqual(same);
		expect(first.visitor_key_secret).not.toBe(first.tab_key_secret);
		const next = await dailyAnalyticsSecrets(test.db, "2026-11-21");
		expect(first.tab_key_secret).not.toBe(next.tab_key_secret);
		const a = await analyticsKey(first.tab_key_secret, "tab", tab);
		expect(a).toMatch(/^[a-f\d]{32}$/u);
		expect(a).toBe(await analyticsKey(same.tab_key_secret, "tab", tab));
		expect(a).not.toBe(await analyticsKey(next.tab_key_secret, "tab", tab));
		expect(a).not.toBe(await analyticsKey(first.tab_key_secret, "visitor", tab));
		expect(await analyticsKey(first.visitor_key_secret, "visitor", "ab", "c")).not.toBe(
			await analyticsKey(first.visitor_key_secret, "visitor", "a", "bc"),
		);
	});

	it("deduplicates events, uses only coarse fields and replaces presence across midnight", async () => {
		const midnight = Date.parse("2026-11-21");
		const initial = {
			...pageview(),
			path: "/work/kuno?token=redacted",
			referrer_host: "Example.ORG",
		};
		expect((await submit(initial, midnight - 1000)).status).toBe(204);
		expect((await submit(initial, midnight - 1000)).status).toBe(204);
		expect(
			(await submit({ kind: "heartbeat", path: "/story", tab_id: tab }, midnight)).status,
		).toBe(204);
		expect(await readLiveVisitors(test.db, midnight)).toEqual({
			count: 1,
			paths: [{ value: "/story", count: 1 }],
		});
		expect(await readLiveVisitors(test.db, midnight + 120_001)).toEqual({ count: 0, paths: [] });
		const { results } = await test.db.prepare("SELECT * FROM analytics_events").all();
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			path: "/work/kuno",
			referrer_host: "example.org",
			device: "Mobile",
			browser: "Chrome",
			country: "unknown",
		});
		expect(JSON.stringify(results)).not.toMatch(/192\.0\.2|Mozilla|redacted/u);
	});

	it("accepts only published project paths and profile link IDs, using a short-lived cache", async () => {
		const doc = await test.db
			.prepare("SELECT draft_json, published_json FROM portfolio_documents")
			.first<{ draft_json: string; published_json: string }>();
		const replace = (column: "draft_json" | "published_json", value: string) =>
			test.db.prepare(`UPDATE portfolio_documents SET ${column} = ?`).bind(value).run();
		const draft = JSON.parse(doc!.draft_json);
		// The initializer's published content includes these IDs. The draft does not grant access.
		draft.projects = [{ slug: "draft-only" }];
		draft.profileLinks = [{ id: "draft-only" }];
		const outbound = (link_id: string) => ({
			kind: "outbound",
			event_id: crypto.randomUUID(),
			tab_id: tab,
			path: "/",
			link_id,
		});
		try {
			await replace("draft_json", JSON.stringify(draft));
			expect((await submit({ ...pageview(), path: "/work/draft-only" }, baseTime)).status).toBe(
				400,
			);
			expect((await submit(outbound("draft-only"), baseTime)).status).toBe(400);
			expect(
				(await submit({ kind: "heartbeat", tab_id: tab, path: "/work/unpublished" }, baseTime))
					.status,
			).toBe(400);
			expect(
				(await submit({ ...pageview(), path: "/work/%6Buno/?private=1#section" }, baseTime)).status,
			).toBe(204);
			expect((await submit(outbound("email"), baseTime)).status).toBe(204);
			expect(
				(await test.db.prepare("SELECT path, link_id FROM analytics_events ORDER BY path").all())
					.results,
			).toEqual([
				{ path: "/", link_id: "email" },
				{ path: "/work/kuno", link_id: null },
			]);
			expect((await test.db.prepare("SELECT path FROM analytics_presence").all()).results).toEqual([
				{ path: "/work/kuno" },
			]);

			await replace("published_json", "{}");
			expect((await submit(outbound("email"), baseTime + 59_999)).status).toBe(204);
			expect((await submit(outbound("email"), baseTime + 60_000)).status).toBe(503);
		} finally {
			await replace("draft_json", doc!.draft_json);
			await replace("published_json", doc!.published_json);
		}
	});

	it("keeps one engagement row at the maximum duration, including after rollup", async () => {
		const event = { kind: "engagement", event_id: crypto.randomUUID(), path: "/", tab_id: tab };
		const yesterday = baseTime - day;
		for (const visible_ms of [2000, 8000, 3000, 8000]) {
			expect((await submit({ ...event, visible_ms }, yesterday)).status).toBe(204);
		}
		const duration = async () =>
			(await test.db.prepare("SELECT day, visible_ms FROM analytics_events").all()).results;
		expect(await duration()).toEqual([{ day: "2026-11-20", visible_ms: 8000 }]);
		await maintainAnalytics(test.db, baseTime);
		expect((await submit({ ...event, visible_ms: 12_000 }, baseTime)).status).toBe(204);
		expect((await submit({ ...event, visible_ms: 5000 }, baseTime)).status).toBe(204);
		expect(await duration()).toEqual([{ day: "2026-11-20", visible_ms: 12_000 }]);
		expect((await readAnalyticsSummary(test.db, "7d", baseTime)).totals.medianEngagedSeconds).toBe(
			12,
		);
	});

	it("compares Today at matching UTC times and longer ranges over completed days", async () => {
		const midnight = Date.parse("2026-11-21");
		for (const [i, ts] of [
			midnight - day - 1,
			midnight - day,
			baseTime - day - 1,
			baseTime - day,
			midnight,
			baseTime - 1,
			baseTime,
		].entries()) {
			await submit(pageview(), ts, { "CF-Connecting-IP": `192.0.2.${i + 1}` });
		}
		await maintainAnalytics(test.db, baseTime);
		const overview = await readAnalyticsOverview(test.db, baseTime);
		expect(overview.today).toMatchObject({ value: 2, delta: 0 });
		expect(overview.week).toMatchObject({ value: 4, delta: 4 });
		expect(overview.recent.series.at(-1)?.at).toBe("2026-11-20");
		expect(overview.recent.totals.pageviews).toBe(4);
		const rolling = await readAnalyticsSummary(test.db, "24h", baseTime);
		expect(rolling.totals.pageviews).toBe(3);
		expect(rolling.previous.pageviews).toBe(3);
	});

	it("limits SQL breakdowns and ranks projects even when they miss the page cutoff", async () => {
		await test.db.batch([
			test.db.prepare(
				"INSERT INTO analytics_daily VALUES ('2026-11-20', 'site', '*', 'pageviews', 100)",
			),
			test.db.prepare(
				"INSERT INTO analytics_daily VALUES ('2026-11-20', 'pages', '/work/kuno', 'pageviews', 1)",
			),
			...Array.from({ length: 12 }, (_, index) =>
				["pages", "referrers", "links", "destinations"].map((dimension) =>
					test.db
						.prepare("INSERT INTO analytics_daily VALUES ('2026-11-20', ?, ?, ?, ?)")
						.bind(
							dimension,
							`value-${index}`,
							dimension === "pages" || dimension === "referrers" ? "pageviews" : "clicks",
							index + 2,
						),
				),
			).flat(),
		]);
		const summary = await readAnalyticsSummary(test.db, "7d", baseTime);
		for (const rows of [
			summary.topPages,
			summary.referrers,
			summary.outboundLinks,
			summary.outboundHosts,
		]) {
			expect(rows.map((row) => row.count)).toEqual([13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);
		}
		expect(summary.topProjects).toEqual([{ value: "/work/kuno", count: 1 }]);
	});

	it("backfills missed days atomically, prunes finalized raw days and preserves query results", async () => {
		const old = baseTime - 120 * day;
		const yesterday = baseTime - day;
		const view = (path: string) => ({ ...pageview(), path });
		const engagement = (visible_ms: number, tab_id = tab) => ({
			kind: "engagement",
			event_id: crypto.randomUUID(),
			tab_id,
			path: "/",
			visible_ms,
		});
		for (const [event, time] of [
			[view("/work/kuno"), old],
			[view("/story"), old],
			[engagement(9000), old],
			[
				{
					kind: "outbound",
					path: "/",
					event_id: crypto.randomUUID(),
					tab_id: tab,
					link_id: "github",
				},
				old,
			],
			[view("/"), yesterday],
			[engagement(3000), yesterday],
			[engagement(7000), yesterday],
			[view("/"), baseTime - 3_600_000],
			[view("/story"), baseTime - 1],
			[engagement(20_000, crypto.randomUUID()), baseTime - 1],
		] as const)
			expect((await submit(event, time)).status).toBe(204);
		const raw = await readAnalyticsSummary(test.db, "12m", baseTime);
		const rolling = await readAnalyticsSummary(test.db, "24h", baseTime);
		expect(rolling.series).toHaveLength(24);
		expect(rolling.series[0]).toMatchObject({ pageviews: 1, visitorDays: 1 });
		expect(rolling.series.at(-2)).toMatchObject({ pageviews: 0, visitorDays: 0 });
		expect(rolling.series.at(-1)).toMatchObject({ pageviews: 2, visitorDays: 1 });
		expect(rolling.totals.visitorDays).toBe(2);
		expect(rolling.previous.pageviews).toBe(0);
		expect(raw.totals).toEqual({ visitorDays: 2, pageviews: 3, medianEngagedSeconds: 9.5 });
		expect(raw.topProjects).toEqual([{ value: "/work/kuno", count: 1 }]);
		expect(raw.outboundLinks).toEqual([{ value: "github", count: 1 }]);
		expect(raw.series.at(-1)).toEqual({ at: "2026-11-20", visitorDays: 1, pageviews: 1 });

		const oldDay = new Date(old).toISOString().slice(0, 10);
		await test.db
			.prepare("INSERT INTO analytics_daily VALUES (?, 'pages', '/stale', 'pageviews', 99)")
			.bind(oldDay)
			.run();
		await maintainAnalytics(test.db, baseTime);
		const countQuery = (table: string) =>
			test.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first<number>("count");
		expect(await countQuery("analytics_events")).toBe(6);
		expect(await countQuery("analytics_presence")).toBe(2);
		expect(await countQuery("analytics_salts")).toBe(2);
		expect(await readAnalyticsSummary(test.db, "12m", baseTime)).toEqual(raw);
		expect(await readAnalyticsSummary(test.db, "24h", baseTime)).toEqual(rolling);
		await maintainAnalytics(test.db, baseTime);
		expect(await readAnalyticsSummary(test.db, "12m", baseTime)).toEqual(raw);
		expect((await readAnalyticsOverview(test.db, baseTime)).allTime.totals).toEqual({
			visitorDays: 3,
			pageviews: 5,
			medianEngagedSeconds: 10,
		});
	});
});
