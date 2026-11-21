import { activeWindowMs } from "../components/analytics/paths";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const dateKey = (time: number) => new Date(time).toISOString().slice(0, 10);
const iso = (time: number) => new Date(time).toISOString();

const dimensions = {
	pages: "path",
	referrers: "COALESCE(referrer_host, 'Direct')",
	countries: "country",
	devices: "device",
	browsers: "browser",
} as const;

type Breakdown = keyof typeof dimensions | "projects" | "links" | "destinations";
export type AnalyticsRange = "24h" | "7d" | "30d" | "90d" | "12m";
export type AnalyticsTotals = {
	visitorDays: number;
	pageviews: number;
	medianEngagedSeconds: number | null;
};
export type TrafficPoint = { at: string; visitorDays: number; pageviews: number };
export type AnalyticsCount = { value: string; count: number; label?: string };
export type AnalyticsSummary = {
	totals: AnalyticsTotals;
	previous: AnalyticsTotals;
	deltas: { visitorDays: number; pageviews: number; medianEngagedSeconds: number | null };
	series: TrafficPoint[];
	topPages: AnalyticsCount[];
	topProjects: AnalyticsCount[];
	referrers: AnalyticsCount[];
	countries: AnalyticsCount[];
	devices: AnalyticsCount[];
	browsers: AnalyticsCount[];
	outboundLinks: AnalyticsCount[];
	outboundHosts: AnalyticsCount[];
};
export type LiveVisitors = { count: number; paths: AnalyticsCount[] };

interface Metric {
	day: string;
	dimension: string;
	value: string;
	metric: string;
	count: number;
}

const finalizedDay = `
	SELECT day FROM analytics_daily
	WHERE dimension = 'site' AND value = '*' AND metric = 'pageviews'
`;

// Preserve the distribution of per-tab, per-UTC-day engaged seconds so the
// dashboard can compute a range median after raw events expire.
function rawMetrics(details: boolean) {
	return [
		`SELECT day, 'site' AS dimension, '*' AS value, 'pageviews' AS metric, COUNT(*) AS count
		 FROM events WHERE kind = 'pageview' GROUP BY day`,
		`SELECT day, 'site', '*', 'visitors', COUNT(DISTINCT visitor_key)
		 FROM events WHERE kind = 'pageview' GROUP BY day`,
		`SELECT day, 'engagement', CAST(seconds AS TEXT), 'tabs', COUNT(*)
		 FROM (
			SELECT day, SUM(visible_ms) / 1000 AS seconds
			FROM events WHERE kind = 'engagement' GROUP BY day, tab_key
		 ) GROUP BY day, seconds`,
		...(details
			? [
					`
			SELECT day, column1 AS dimension,
				CASE column1
					${Object.entries(dimensions)
						.map(([name, column]) => `WHEN '${name}' THEN ${column}`)
						.join("\n")}
					WHEN 'links' THEN link_id
					WHEN 'destinations' THEN referrer_host
				END AS value,
				CASE WHEN kind = 'outbound' THEN 'clicks' ELSE 'pageviews' END AS metric,
				COUNT(*) AS count
			FROM events CROSS JOIN (VALUES
				${Object.keys(dimensions)
					.map((name) => `('${name}')`)
					.join(", ")}, ('links'), ('destinations')
			)
			WHERE (
				kind = 'pageview' AND column1 NOT IN ('links', 'destinations')
			) OR (
				kind = 'outbound' AND (
					(column1 = 'links' AND link_id IS NOT NULL) OR
					(column1 = 'destinations' AND referrer_host IS NOT NULL)
				)
			)
			GROUP BY day, dimension, value, metric
		`,
				]
			: []),
	].join("\nUNION ALL\n");
}

export async function maintainAnalytics(db: D1Database, now = Date.now()) {
	const today = dateKey(now);
	const pending = await db
		.prepare(`
		SELECT DISTINCT day FROM analytics_events
		WHERE day < ? AND day NOT IN (${finalizedDay}) ORDER BY day
	`)
		.bind(today)
		.all<{ day: string }>();

	// Keep each request bounded while backfilling enough days to stay within D1's
	// per-invocation query limit after a long outage.
	const daysPerBatch = 14;
	for (let index = 0; index < pending.results.length; index += daysPerBatch) {
		const days = pending.results.slice(index, index + daysPerBatch);
		await db.batch(
			days.flatMap(({ day }) => [
				db
					.prepare(`DELETE FROM analytics_daily WHERE day = ?1 AND ?1 NOT IN (${finalizedDay})`)
					.bind(day),
				db
					.prepare(`
				WITH events AS (SELECT * FROM analytics_events WHERE day = ?1),
				     metrics AS (${rawMetrics(true)})
				INSERT INTO analytics_daily (day, dimension, value, metric, count)
				SELECT day, dimension, value, metric, count FROM metrics
				WHERE ?1 NOT IN (${finalizedDay})
				UNION ALL
				SELECT ?1, 'site', '*', 'pageviews', 0
				WHERE ?1 NOT IN (${finalizedDay}) AND NOT EXISTS (SELECT 1 FROM events WHERE kind = 'pageview')
			`)
					.bind(day),
			]),
		);
	}

	await db.batch([
		db
			.prepare(`DELETE FROM analytics_events WHERE day < ? AND day IN (${finalizedDay})`)
			.bind(dateKey(now - 90 * DAY)),
		db.prepare("DELETE FROM analytics_presence WHERE last_seen < ?").bind(iso(now - DAY)),
		db.prepare("DELETE FROM analytics_salts WHERE day < ?").bind(dateKey(now - 2 * DAY)),
	]);
}

interface Window {
	start: number;
	end: number;
	hourly?: boolean;
}

function rangeWindows(range: AnalyticsRange, now: number): [Window, Window] {
	if (range === "24h")
		return [
			{ start: now - DAY, end: now, hourly: true },
			{ start: now - 2 * DAY, end: now - DAY, hourly: true },
		];
	const end = Date.parse(dateKey(now));
	if (range === "12m") {
		const boundary = new Date(end);
		const year = boundary.getUTCFullYear();
		const month = boundary.getUTCMonth();
		const day = boundary.getUTCDate();
		const lastDay = (targetYear: number) =>
			new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
		const start = Date.UTC(year - 1, month, Math.min(day, lastDay(year - 1)));
		const previous = Date.UTC(year - 2, month, Math.min(day, lastDay(year - 2)));
		return [
			{ start, end },
			{ start: previous, end: start },
		];
	}
	const duration = Number.parseInt(range) * DAY;
	return [
		{ start: end - duration, end },
		{ start: end - 2 * duration, end: end - duration },
	];
}

interface QueryOptions {
	breakdowns: boolean;
	seriesStart: number;
}

function metricsQuery(db: D1Database, window: Window, today: string, options: QueryOptions) {
	const sources = window.hourly
		? `
		events AS (SELECT * FROM analytics_events WHERE ts >= ?1 AND ts < ?2),
		raw AS (${rawMetrics(options.breakdowns)}),
		metrics AS (
			SELECT * FROM raw
			UNION ALL
			SELECT CAST(((unixepoch(ts) * 1000 + CAST(substr(ts, 21, 3) AS INTEGER)) - ?3) / 3600000 AS INTEGER) AS hour,
			       'hour', '*', 'pageviews', COUNT(*)
			FROM events WHERE kind = 'pageview' GROUP BY hour
			UNION ALL
			SELECT hour, 'hour', '*', 'visitors', SUM(visitors)
			FROM (
				SELECT CAST(((unixepoch(ts) * 1000 + CAST(substr(ts, 21, 3) AS INTEGER)) - ?3) / 3600000 AS INTEGER) AS hour,
				       COUNT(DISTINCT visitor_key) AS visitors
				FROM events WHERE kind = 'pageview' GROUP BY hour, day
			) GROUP BY hour
		)
	`
		: `
		rolled_days AS (SELECT day FROM (${finalizedDay}) WHERE day >= ?1 AND day < ?2 AND day < ?3),
		events AS (
			SELECT * FROM analytics_events
			WHERE day >= ?1 AND day < ?2 AND day NOT IN (SELECT day FROM rolled_days)
		),
		metrics AS (
			${rawMetrics(options.breakdowns)}
			UNION ALL
			SELECT day, dimension, value, metric, count FROM analytics_daily
			WHERE day IN (SELECT day FROM rolled_days)
			${options.breakdowns ? "" : "AND dimension IN ('site', 'engagement')"}
		)
	`;
	// Countries, devices and browsers have bounded vocabularies. Keep the full
	// country distribution for the map, and cap the other breakdowns in SQL.
	const keepAll = "'site', 'engagement', 'countries', 'devices', 'browsers'";
	const query = db.prepare(`
		WITH ${sources},
		buckets AS (
			SELECT dimension, value, metric, SUM(count) AS count
			FROM metrics WHERE dimension != 'hour'
			GROUP BY dimension, value, metric
		),
		ranked AS (
			SELECT *, ROW_NUMBER() OVER (PARTITION BY dimension ORDER BY count DESC, value) AS rank
			FROM (
				SELECT * FROM buckets WHERE dimension NOT IN (${keepAll})
				UNION ALL
				SELECT 'projects', value, metric, count FROM buckets
				WHERE dimension = 'pages' AND value GLOB '/work/*'
			)
		)
		SELECT '' AS day, dimension, value, metric, count
		FROM buckets WHERE dimension IN (${keepAll})
		UNION ALL
		SELECT '' AS day, dimension, value, metric, count
		FROM ranked WHERE rank <= 10
		UNION ALL
		SELECT CAST(day AS TEXT) AS day, dimension, value, metric, count
		FROM metrics WHERE dimension = 'hour' OR (dimension = 'site' AND day >= ${window.hourly ? "NULL" : "?4"})
		ORDER BY count DESC, value
	`);
	return window.hourly
		? query.bind(iso(window.start), iso(window.end), window.start)
		: query.bind(dateKey(window.start), dateKey(window.end), today, dateKey(options.seriesStart));
}

function totals(rows: Metric[]): AnalyticsTotals {
	const site = rows.filter((row) => !row.day && row.dimension === "site");
	const histogram = rows
		.filter((row) => row.dimension === "engagement")
		.sort((a, b) => Number(a.value) - Number(b.value));
	const samples = histogram.reduce((sum, bucket) => sum + bucket.count, 0);
	function sampleAt(index: number) {
		for (const bucket of histogram) {
			index -= bucket.count;
			if (index < 0) return Number(bucket.value);
		}
		return 0;
	}
	return {
		visitorDays: site.find((row) => row.metric === "visitors")?.count ?? 0,
		pageviews: site.find((row) => row.metric === "pageviews")?.count ?? 0,
		medianEngagedSeconds: samples
			? (sampleAt(Math.floor((samples - 1) / 2)) + sampleAt(Math.floor(samples / 2))) / 2
			: null,
	};
}

function series(rows: Metric[], window: Window, start = window.start): TrafficPoint[] {
	const byBucket = new Map<string, { visitorDays: number; pageviews: number }>();
	for (const row of rows) {
		if (!row.day || (row.dimension !== "site" && row.dimension !== "hour")) continue;
		const point = byBucket.get(row.day) ?? { visitorDays: 0, pageviews: 0 };
		if (row.metric === "visitors") point.visitorDays = row.count;
		if (row.metric === "pageviews") point.pageviews = row.count;
		byBucket.set(row.day, point);
	}
	const step = window.hourly ? HOUR : DAY;
	return Array.from({ length: Math.ceil((window.end - start) / step) }, (_, index) => {
		const at = start + index * step;
		const key = window.hourly ? String(index) : dateKey(at);
		return {
			at: window.hourly ? iso(at) : key,
			...(byBucket.get(key) ?? { visitorDays: 0, pageviews: 0 }),
		};
	});
}

function breakdown(rows: Metric[], dimension: Breakdown): AnalyticsCount[] {
	return rows
		.filter((row) => row.dimension === dimension)
		.map(({ value, count }) => ({ value, count }));
}

export async function readAnalyticsSummary(
	db: D1Database,
	range: AnalyticsRange,
	now = Date.now(),
): Promise<AnalyticsSummary> {
	const [current, previous] = rangeWindows(range, now);
	const today = dateKey(now);
	const [currentResult, previousResult] = await db.batch<Metric>([
		metricsQuery(db, current, today, { breakdowns: true, seriesStart: current.start }),
		metricsQuery(db, previous, today, { breakdowns: false, seriesStart: previous.end }),
	]);
	const rows = currentResult.results;
	const currentTotals = totals(rows);
	const priorTotals = totals(previousResult.results);
	return {
		totals: currentTotals,
		previous: priorTotals,
		deltas: {
			visitorDays: currentTotals.visitorDays - priorTotals.visitorDays,
			pageviews: currentTotals.pageviews - priorTotals.pageviews,
			medianEngagedSeconds:
				currentTotals.medianEngagedSeconds === null || priorTotals.medianEngagedSeconds === null
					? null
					: currentTotals.medianEngagedSeconds - priorTotals.medianEngagedSeconds,
		},
		series: series(rows, current),
		topPages: breakdown(rows, "pages"),
		topProjects: breakdown(rows, "projects"),
		referrers: breakdown(rows, "referrers"),
		countries: breakdown(rows, "countries"),
		devices: breakdown(rows, "devices"),
		browsers: breakdown(rows, "browsers"),
		outboundLinks: breakdown(rows, "links"),
		outboundHosts: breakdown(rows, "destinations"),
	};
}

export async function readAnalyticsOverview(db: D1Database, now = Date.now()) {
	const today = dateKey(now);
	const midnight = Date.parse(today);
	const all = { start: Date.parse("0000-01-01"), end: midnight + DAY };
	// Keep the all-time KPI's sparkline to the same thirty days as the main chart.
	const seriesStart = all.end - 30 * DAY;
	const elapsedVisitors = (offset: number) =>
		db
			.prepare(`
				SELECT COUNT(DISTINCT visitor_key) AS count
				FROM analytics_events WHERE kind = 'pageview' AND ts >= ? AND ts < ?
			`)
			.bind(iso(midnight - offset), iso(now - offset));
	const [recent, [allTimeResult, elapsedToday, elapsedYesterday]] = await Promise.all([
		readAnalyticsSummary(db, "30d", now),
		db.batch<Metric>([
			metricsQuery(db, all, today, { breakdowns: false, seriesStart }),
			elapsedVisitors(0),
			elapsedVisitors(DAY),
		]),
	]);
	const points = recent.series;
	const week = points.slice(-7);
	const allTimePoints = series(allTimeResult.results, all, seriesStart).map(
		(point) => point.visitorDays,
	);
	const days = (bucket: TrafficPoint[]) =>
		bucket.reduce((sum, point) => sum + point.visitorDays, 0);
	const todayVisitors = elapsedToday.results[0]?.count ?? 0;
	return {
		recent,
		today: {
			value: todayVisitors,
			delta: todayVisitors - (elapsedYesterday.results[0]?.count ?? 0),
			points: allTimePoints.slice(-7),
		},
		week: {
			value: days(week),
			delta: days(week) - days(points.slice(-14, -7)),
			points: week.map((point) => point.visitorDays),
		},
		allTime: {
			totals: totals(allTimeResult.results),
			delta: todayVisitors,
			points: allTimePoints,
		},
	};
}

export async function readLiveVisitors(db: D1Database, now = Date.now()): Promise<LiveVisitors> {
	const { results: paths } = await db
		.prepare(`
		SELECT path AS value, COUNT(*) AS count FROM analytics_presence
		WHERE last_seen >= ? GROUP BY path ORDER BY count DESC, path
	`)
		.bind(iso(now - activeWindowMs))
		.all<AnalyticsCount>();
	return { count: paths.reduce((sum, path) => sum + path.count, 0), paths };
}
