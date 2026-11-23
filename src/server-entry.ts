import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { toPublicCmsPath } from "./lib/cms-host";
import { maintainAnalytics } from "./server/analytics.server";

// Keep the stream handler explicit so independent route data can flush while
// the SSR document is still being assembled. Critical identity/SEO content is
// rendered in the first document shell by TanStack Start.
const startFetch = createStartHandler(defaultStreamHandler);

const PUBLIC_HOST = "sohelislamimran.com";
const WWW_HOST = "www.sohelislamimran.com";
const CMS_HOST = "cms.sohelislamimran.com";

const securityHeaders: Record<string, string> = {
	"Content-Security-Policy":
		"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; font-src 'self' data:",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Cross-Origin-Opener-Policy": "same-origin",
	"Cross-Origin-Resource-Policy": "same-origin",
};

export async function scheduled(controller: ScheduledController, env: Env) {
	await maintainAnalytics(env.DB, controller.scheduledTime);
}

export default {
	scheduled,
	async fetch(request: Request, env: Env): Promise<Response> {
		const incoming = new URL(request.url);
		const host = incoming.hostname.toLowerCase();
		const appOrigin = env.APP_ORIGIN || `https://${PUBLIC_HOST}`;
		const cmsOrigin = env.CMS_ORIGIN || `https://${CMS_HOST}`;
		const publicHost = hostnameFromOrigin(appOrigin, PUBLIC_HOST);
		const cmsHost = hostnameFromOrigin(cmsOrigin, CMS_HOST);
		const wwwHost = publicHost === PUBLIC_HOST ? WWW_HOST : `www.${publicHost}`;
		const splitCmsHost = cmsHost !== publicHost;

		if (host === wwwHost) {
			return withSecurityHeaders(
				Response.redirect(`${appOrigin}${incoming.pathname}${incoming.search}`, 308),
			);
		}

		if (splitCmsHost && host === publicHost && isLegacyCmsPath(incoming.pathname)) {
			return withSecurityHeaders(
				Response.redirect(`${cmsOrigin}${publicCmsPath(incoming.pathname)}${incoming.search}`, 308),
			);
		}

		if (splitCmsHost && host === cmsHost) {
			// The router rewrites `/x` on this host to the internal `/cms/x` route
			// on both server and client (see `src/lib/cms-host.ts`), so the CMS is
			// served at the root. Old `/cms/*` bookmarks move to the clean URL.
			if (/^\/cms(?:\/|$)/u.test(incoming.pathname)) {
				return withSecurityHeaders(
					Response.redirect(
						`${cmsOrigin}${toPublicCmsPath(incoming.pathname)}${incoming.search}`,
						308,
					),
					{ cms: true },
				);
			}
			if (incoming.pathname === "/robots.txt") {
				return withSecurityHeaders(
					new Response("User-agent: *\nDisallow: /\n", {
						headers: { "Content-Type": "text/plain; charset=utf-8" },
					}),
					{ cms: true },
				);
			}
		}

		// TanStack Start reads bindings through `cloudflare:workers`. The edge
		// adapter still receives `env` here for host configuration and redirects.
		const response = await startFetch(request);
		const cmsRequest = splitCmsHost ? host === cmsHost : isLegacyCmsPath(incoming.pathname);
		return withSecurityHeaders(response, { request, cms: cmsRequest });
	},
} satisfies ExportedHandler<Env>;

function hostnameFromOrigin(origin: string, fallback: string) {
	try {
		return new URL(origin).hostname.toLowerCase();
	} catch {
		return fallback;
	}
}

/** `/cms`, `/cms/*`, and the old `/resume/edit` editor, on the public host. */
function isLegacyCmsPath(pathname: string): boolean {
	return /^\/cms(?:\/|$)/u.test(pathname) || /^\/resume\/edit(?:\/|$)/u.test(pathname);
}

function publicCmsPath(pathname: string): string {
	return pathname.startsWith("/resume/edit") ? "/" : toPublicCmsPath(pathname);
}

function withSecurityHeaders(
	response: Response,
	options?: { request?: Request; cms?: boolean },
): Response {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);

	const request = options?.request;
	const url = request ? new URL(request.url) : null;
	const privateRoute =
		options?.cms ||
		(url ? /^\/cms(?:\/|$)/u.test(url.pathname) : false) ||
		url?.pathname.startsWith("/links/") ||
		url?.pathname.startsWith("/resume/edit");
	if (privateRoute) {
		headers.set("Cache-Control", "private, no-store");
		headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
		headers.set("Referrer-Policy", "no-referrer");
	} else if (
		request &&
		(request.method === "GET" || request.method === "HEAD") &&
		response.ok &&
		(response.headers.get("content-type") ?? "").includes("text/html") &&
		!headers.has("Set-Cookie") &&
		!headers.has("X-Robots-Tag")
	) {
		headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
