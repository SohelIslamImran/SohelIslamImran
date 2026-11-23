/**
 * The CMS is served at the root of its own hostname (`cms.<domain>`, and
 * `cms.localhost` in development), while its routes live under `/cms` in the
 * route tree. The router rewrites between the two on both the server and the
 * client, so SSR and hydration always agree on the internal path.
 */

export const CMS_ROUTE_PREFIX = "/cms";

/**
 * Paths the browser requests from the CMS host that are not CMS pages:
 * built assets, server functions, public media, and the favicon. They are
 * never rewritten.
 */
const PASSTHROUGH_PREFIXES = [
	"/_serverFn",
	"/__tsr",
	"/assets/",
	"/images/",
	"/media/",
	"/draft-media/",
	"/favicon",
	"/robots.txt",
] as const;

export function isCmsHostname(hostname: string): boolean {
	return hostname.toLowerCase().startsWith("cms.");
}

export function isCmsPassthroughPath(pathname: string): boolean {
	return PASSTHROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isInternalCmsPath(pathname: string): boolean {
	return pathname === CMS_ROUTE_PREFIX || pathname.startsWith(`${CMS_ROUTE_PREFIX}/`);
}

/** Public CMS-host path (`/analytics`) → internal route path (`/cms/analytics`). */
export function toInternalCmsPath(pathname: string): string {
	if (isInternalCmsPath(pathname) || isCmsPassthroughPath(pathname)) return pathname;
	return pathname === "/" ? CMS_ROUTE_PREFIX : `${CMS_ROUTE_PREFIX}${pathname}`;
}

/** Internal route path (`/cms/analytics`) → public CMS-host path (`/analytics`). */
export function toPublicCmsPath(pathname: string): string {
	if (!isInternalCmsPath(pathname)) return pathname;
	const stripped = pathname.slice(CMS_ROUTE_PREFIX.length);
	return stripped === "" ? "/" : stripped;
}

export const cmsHostRewrite = {
	input: ({ url }: { url: URL }) => {
		if (!isCmsHostname(url.hostname)) return undefined;
		const next = toInternalCmsPath(url.pathname);
		if (next === url.pathname) return undefined;
		const rewritten = new URL(url.href);
		rewritten.pathname = next;
		return rewritten;
	},
	output: ({ url }: { url: URL }) => {
		if (!isCmsHostname(url.hostname)) return undefined;
		const next = toPublicCmsPath(url.pathname);
		if (next === url.pathname) return undefined;
		const rewritten = new URL(url.href);
		rewritten.pathname = next;
		return rewritten;
	},
};
