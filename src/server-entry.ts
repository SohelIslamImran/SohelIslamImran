import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

// Keep the stream handler explicit so independent route data can flush while
// the SSR document is still being assembled. Critical identity/SEO content is
// rendered in the first document shell by TanStack Start.
const startFetch = createStartHandler(defaultStreamHandler);

const PUBLIC_HOST = "sohelislamimran.com";
const WWW_HOST = "www.sohelislamimran.com";
const CMS_HOST = "cms.sohelislamimran.com";

const securityHeaders: Record<string, string> = {
	"Content-Security-Policy":
		"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Cross-Origin-Opener-Policy": "same-origin",
	"Cross-Origin-Resource-Policy": "same-origin",
};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const incoming = new URL(request.url);
		const host = incoming.hostname.toLowerCase();
		const appOrigin = env.APP_ORIGIN || `https://${PUBLIC_HOST}`;
		const cmsOrigin = env.CMS_ORIGIN || `https://${CMS_HOST}`;

		if (host === WWW_HOST) {
			return withSecurityHeaders(
				Response.redirect(`${appOrigin}${incoming.pathname}${incoming.search}`, 308),
			);
		}

		if (host === PUBLIC_HOST && /^\/resume\/edit(?:\/|$)/u.test(incoming.pathname)) {
			return withSecurityHeaders(Response.redirect(`${cmsOrigin}/`, 308));
		}

		if (host === PUBLIC_HOST && incoming.pathname === "/cms") {
			return withSecurityHeaders(Response.redirect(`${cmsOrigin}/`, 308));
		}

		let routedRequest = request;
		if (host === CMS_HOST) {
			if (incoming.pathname === "/" || incoming.pathname === "/index.html") {
				const cmsUrl = new URL(incoming);
				cmsUrl.pathname = "/cms";
				routedRequest = new Request(cmsUrl, request);
			} else if (!incoming.pathname.startsWith("/cms") && !incoming.pathname.startsWith("/__tsr")) {
				return withSecurityHeaders(
					Response.redirect(`${appOrigin}${incoming.pathname}${incoming.search}`, 308),
				);
			}
		}

		// TanStack's Start handler reads Cloudflare bindings through the
		// `cloudflare:workers` runtime module. The Worker still receives env/ctx
		// here so the edge adapter can invoke this standard fetch signature.
		void ctx;
		const response = await startFetch(routedRequest);
		return withSecurityHeaders(response, { request: routedRequest, cms: host === CMS_HOST });
	},
};

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
		url?.pathname === "/cms" ||
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
