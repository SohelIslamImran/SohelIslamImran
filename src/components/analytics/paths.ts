const publicPaths = new Set(["/", "/work", "/story", "/resume", "/links", "/field-notes"]);

export const activeWindowMs = 120_000;

export function analyticsProjectPath(slug: string) {
	return `/work/${encodeURIComponent(slug)}`;
}

export function canonicalAnalyticsPath(input: string): string | null {
	const pathname = (input.split(/[?#]/u, 1)[0] ?? "").replace(/\/$/u, "") || "/";
	if (!input.startsWith("/") || input.startsWith("//")) return null;
	if (publicPaths.has(pathname)) return pathname;
	const match = /^\/work\/([^/]+)$/u.exec(pathname);
	if (!match) return null;
	try {
		const slug = decodeURIComponent(match[1] ?? "");
		if (!/^[\p{L}\p{N}][\p{L}\p{N}\p{M}._ -]{0,159}$/u.test(slug)) return null;
		return analyticsProjectPath(slug);
	} catch {
		return null;
	}
}

export const profileLinkIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

// A DNS hostname only. Literal addresses and local machine names are omitted.
export const analyticsHostnamePattern =
	/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;
