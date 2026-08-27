import { env } from 'cloudflare:workers';

import { getPublicContent } from '../lib/cms.server';
import { cacheableSeoHeaders, canonicalUrl, normalizePathname, siteOrigin, xmlEscape } from '../lib/seo';

const PUBLIC_PATHS = ['/', '/work', '/story', '/field-notes', '/resume', '/links'] as const;

function sameOriginPath(value: string, origin: string): string | undefined {
	try {
		const url = new URL(value, origin);
		if (url.origin !== origin || !url.pathname.startsWith('/')) return undefined;
		return normalizePathname(url.pathname);
	} catch {
		return undefined;
	}
}

export async function loader() {
	const content = await getPublicContent(env as unknown as { DB?: D1Database });
	const origin = siteOrigin(content.site.url);
	const paths = new Set<string>(PUBLIC_PATHS);

	// Writing links are owner-editable. Include only public, same-origin paths;
	// external references belong in the article, not this site's sitemap.
	for (const entry of content.writing) {
		const path = sameOriginPath(entry.href, origin);
		if (path) paths.add(path);
	}

	const urls = [...paths]
		.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)))
		.map((path) => `  <url><loc>${xmlEscape(canonicalUrl(path, origin))}</loc></url>`)
		.join('\n');

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		urls,
		'</urlset>',
		'',
	].join('\n');

	return new Response(body, {
		headers: cacheableSeoHeaders('application/xml; charset=utf-8'),
	});
}
