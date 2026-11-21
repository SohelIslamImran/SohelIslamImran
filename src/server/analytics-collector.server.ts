import { z } from "zod";
import {
	activeWindowMs,
	analyticsHostnamePattern,
	analyticsProjectPath,
	canonicalAnalyticsPath,
	profileLinkIdPattern,
} from "../components/analytics/paths";
import { linkableProjects, projectSlug } from "../components/work/project-utils";
import { isCmsHostname } from "../lib/cms-host";
import { isLoopbackRequest } from "./auth.server";
import { getPublishedContent } from "./cms-storage.server";

const BODY_LIMIT = 2048;
const RATE_LIMIT = 60;
const uuid = z.uuidv4();
const host = z.string().max(253).toLowerCase().regex(analyticsHostnamePattern);
const eventFields = { event_id: uuid };
const common = { path: z.string().min(1).max(2048), tab_id: uuid };
const eventSchema = z.union([
	z.strictObject({
		...common,
		...eventFields,
		kind: z.literal("pageview"),
		referrer_host: host.optional(),
		visible: z.boolean(),
	}),
	z.strictObject({
		...common,
		...eventFields,
		kind: z.literal("engagement"),
		visible_ms: z.number().int().min(0).max(86_400_000),
	}),
	z.strictObject({
		...common,
		...eventFields,
		kind: z.literal("outbound"),
		link_id: z.string().max(80).regex(profileLinkIdPattern),
	}),
	z.strictObject({
		...common,
		...eventFields,
		kind: z.literal("outbound"),
		destination_host: host,
	}),
	z.strictObject({ ...common, kind: z.literal("heartbeat") }),
]);

type Event = z.infer<typeof eventSchema>;
type CollectorEnvironment = {
	DB?: D1Database;
	APP_ORIGIN?: string;
	CMS_ORIGIN?: string;
	ENVIRONMENT?: string;
	ANALYTICS_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> };
};

const publishedDimensions = new WeakMap<
	D1Database,
	{ expires: number; paths: Set<string>; linkIds: Set<string> }
>();

async function getPublishedDimensions(db: D1Database, now: number) {
	const cached = publishedDimensions.get(db);
	if (cached && now < cached.expires) return cached;
	const content = await getPublishedContent({ DB: db });
	const dimensions = {
		expires: now + 60_000,
		paths: new Set(
			linkableProjects(content.projects).map((p) => analyticsProjectPath(projectSlug(p))),
		),
		linkIds: new Set(
			content.profileLinks.filter((link) => link.href.trim()).map((link) => link.id),
		),
	};
	// Cache the resolved public values. D1 promises belong to the initiating request.
	publishedDimensions.set(db, dimensions);
	return dimensions;
}

const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) =>
	Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
const newSecret = () => hex(crypto.getRandomValues(new Uint8Array(32)));

export async function dailyAnalyticsSecrets(db: D1Database, day: string) {
	const query = db
		.prepare("SELECT visitor_key_secret, tab_key_secret FROM analytics_salts WHERE day = ?")
		.bind(day);
	const existing = await query.first<{ visitor_key_secret: string; tab_key_secret: string }>();
	if (existing) return existing;
	await db
		.prepare("INSERT OR IGNORE INTO analytics_salts VALUES (?, ?, ?)")
		.bind(day, newSecret(), newSecret())
		.run();
	const created = await query.first<{ visitor_key_secret: string; tab_key_secret: string }>();
	if (!created) throw new Error("Analytics secrets unavailable");
	return created;
}

export async function analyticsKey(secret: string, domain: "visitor" | "tab", ...parts: string[]) {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const digest = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(JSON.stringify([domain, ...parts])),
	);
	return hex(new Uint8Array(digest, 0, 16));
}

let fallbackMinute = -1;
const fallbackCounts = new Map<string, number>();
function allowInIsolate(key: string, now: number) {
	const minute = Math.floor(now / 60_000);
	if (minute !== fallbackMinute) {
		fallbackCounts.clear();
		fallbackMinute = minute;
	}
	const count = fallbackCounts.get(key) ?? 0;
	if (count >= RATE_LIMIT || (count === 0 && fallbackCounts.size >= 1024)) return false;
	fallbackCounts.set(key, count + 1);
	return true;
}

async function readEvent(request: Request) {
	if (Number(request.headers.get("Content-Length")) > BODY_LIMIT) return 413;
	if (!request.body) return 400;
	const reader = request.body.getReader();
	const buffer = new Uint8Array(BODY_LIMIT);
	let length = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (length + value.byteLength > BODY_LIMIT) {
				void reader.cancel().catch(() => {});
				return 413;
			}
			buffer.set(value, length);
			length += value.byteLength;
		}
		const parsed = eventSchema.safeParse(
			JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length))),
		);
		return parsed.success ? parsed.data : 400;
	} catch {
		return 400;
	} finally {
		reader.releaseLock();
	}
}

function userAgentFamilies(ua: string) {
	const device = /ipad|tablet|android(?!.*mobile)/iu.test(ua)
		? "Tablet"
		: /mobi|iphone|ipod/iu.test(ua)
			? "Mobile"
			: "Desktop";
	const browser = /edg(?:e|a|ios)?\//iu.test(ua)
		? "Edge"
		: /opr\/|opera/iu.test(ua)
			? "Opera"
			: /firefox\/|fxios\//iu.test(ua)
				? "Firefox"
				: /chrome\/|crios\//iu.test(ua)
					? "Chrome"
					: /safari\//iu.test(ua)
						? "Safari"
						: "Other";
	return { device, browser };
}

async function record(
	db: D1Database,
	event: Event,
	path: string,
	now: number,
	ip: string,
	ua: string,
	country: string,
) {
	const ts = new Date(now).toISOString();
	const day = ts.slice(0, 10);
	const secrets = await dailyAnalyticsSecrets(db, day);
	const tabKey = await analyticsKey(secrets.tab_key_secret, "tab", event.tab_id);

	const presence = db
		.prepare(`
		INSERT INTO analytics_presence (tab_key, path, last_seen) VALUES (?, ?, ?)
		ON CONFLICT(tab_key) DO UPDATE SET path = excluded.path, last_seen = excluded.last_seen
		WHERE excluded.last_seen >= analytics_presence.last_seen
	`)
		.bind(tabKey, path, ts);

	const statements: D1PreparedStatement[] = [];
	if (event.kind !== "heartbeat") {
		const visitorKey = await analyticsKey(secrets.visitor_key_secret, "visitor", ip, ua);
		const { device, browser } = userAgentFamilies(ua);
		statements.push(
			db
				.prepare(`
			INSERT INTO analytics_events (
				event_id, ts, day, kind, path, visitor_key, tab_key, referrer_host,
				country, device, browser, link_id, visible_ms
			)
			SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
			WHERE NOT EXISTS (
				SELECT 1 FROM analytics_daily
				WHERE day = ? AND dimension = 'site' AND value = '*' AND metric = 'pageviews'
			)
			ON CONFLICT(event_id) DO UPDATE SET visible_ms = excluded.visible_ms
			WHERE analytics_events.kind = 'engagement' AND excluded.kind = 'engagement'
				AND analytics_events.path = excluded.path
				AND excluded.visible_ms > analytics_events.visible_ms
		`)
				.bind(
					event.event_id,
					ts,
					day,
					event.kind,
					path,
					visitorKey,
					tabKey,
					event.kind === "pageview"
						? (event.referrer_host ?? null)
						: event.kind === "outbound" && "destination_host" in event
							? event.destination_host
							: null,
					country,
					device,
					browser,
					event.kind === "outbound" && "link_id" in event ? event.link_id : null,
					event.kind === "engagement" ? event.visible_ms : null,
					day,
				),
		);
	}
	if (event.kind === "engagement") {
		// A view can resume after midnight and after its original day has rolled up.
		// Replace that day's engagement histogram in the same transaction as the update.
		statements.push(
			db
				.prepare(`
					DELETE FROM analytics_daily
					WHERE changes() > 0 AND dimension = 'engagement'
						AND day = (SELECT day FROM analytics_events WHERE event_id = ?)
						AND day IN (
							SELECT day FROM analytics_daily
							WHERE dimension = 'site' AND value = '*' AND metric = 'pageviews'
						)
				`)
				.bind(event.event_id),
			db
				.prepare(`
					INSERT INTO analytics_daily (day, dimension, value, metric, count)
					SELECT day, 'engagement', CAST(seconds AS TEXT), 'tabs', COUNT(*)
					FROM (
						SELECT day, SUM(visible_ms) / 1000 AS seconds
						FROM analytics_events
						WHERE changes() > 0 AND kind = 'engagement'
							AND day = (SELECT day FROM analytics_events WHERE event_id = ?)
						GROUP BY day, tab_key
					) GROUP BY day, seconds
				`)
				.bind(event.event_id),
		);
	}
	if (event.kind === "heartbeat" || (event.kind === "pageview" && event.visible)) {
		// Replace the preceding day's presence key during the two-minute overlap.
		const midnight = Date.parse(day);
		if (now - midnight < activeWindowMs) {
			const yesterday = new Date(midnight - 86_400_000).toISOString().slice(0, 10);
			const priorSecret = await db
				.prepare("SELECT tab_key_secret FROM analytics_salts WHERE day = ?")
				.bind(yesterday)
				.first<string>("tab_key_secret");
			if (priorSecret) {
				const priorKey = await analyticsKey(priorSecret, "tab", event.tab_id);
				statements.push(
					db.prepare("DELETE FROM analytics_presence WHERE tab_key = ?").bind(priorKey),
				);
			}
		}
		statements.push(presence);
	}
	await db.batch(statements);
}

export async function collectAnalytics(
	request: Request,
	env: CollectorEnvironment,
	waitUntil?: (promise: Promise<void>) => void,
	now = Date.now(),
) {
	const respond = (status: number) =>
		new Response(null, { status, headers: { "Cache-Control": "no-store" } });
	if (request.method !== "POST") return respond(405);
	const url = new URL(request.url);
	if (
		isCmsHostname(url.hostname) ||
		(env.CMS_ORIGIN !== env.APP_ORIGIN && url.origin === env.CMS_ORIGIN)
	) {
		return respond(404);
	}
	const origin = request.headers.get("Origin");
	const loopback = env.ENVIRONMENT === "development" && isLoopbackRequest(request);
	if (origin !== url.origin || (!loopback && origin !== env.APP_ORIGIN)) return respond(403);

	const ua = request.headers.get("User-Agent") ?? "";
	if (
		request.headers.get("DNT") === "1" ||
		!ua ||
		/bot|crawler|spider|headless|lighthouse|preview|curl|wget/iu.test(ua)
	) {
		return respond(204);
	}

	const ip = request.headers.get("CF-Connecting-IP") ?? "";
	// Limit on an ephemeral client digest. Neither the binding key nor the
	// isolate cache holds the original address.
	const quota = hex(
		new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(ip)), 0, 16),
	);
	try {
		const allowed = env.ANALYTICS_LIMITER
			? (await env.ANALYTICS_LIMITER.limit({ key: quota })).success
			: allowInIsolate(quota, now);
		if (!allowed) return respond(429);
	} catch {
		return respond(503);
	}
	if (
		request.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() !== "text/plain"
	) {
		return respond(415);
	}
	const event = await readEvent(request);
	if (typeof event === "number") return respond(event);
	const path = canonicalAnalyticsPath(event.path);
	if (!path) return respond(400);
	if (!env.DB) return respond(503);

	const projectPath = path.startsWith("/work/");
	const linkId = event.kind === "outbound" && "link_id" in event ? event.link_id : undefined;
	if (projectPath || linkId) {
		try {
			const allowed = await getPublishedDimensions(env.DB, now);
			if ((projectPath && !allowed.paths.has(path)) || (linkId && !allowed.linkIds.has(linkId)))
				return respond(400);
		} catch {
			return respond(503);
		}
	}

	const code = request.cf?.country;
	const country =
		typeof code === "string" && /^[A-Z]{2}$/u.test(code) && code !== "XX" ? code : "unknown";
	const work = record(env.DB, event, path, now, ip, ua, country);
	if (waitUntil) {
		// Report only a fixed error message through Worker invocation logs.
		waitUntil(
			work.catch(() => {
				throw new Error("Analytics write failed");
			}),
		);
	} else {
		try {
			await work;
		} catch {
			return respond(503);
		}
	}
	return respond(204);
}
