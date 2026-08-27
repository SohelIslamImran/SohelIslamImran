import { env } from 'cloudflare:workers';

import { getPublicContent } from '../lib/cms.server';
import { absoluteUrl, cacheableSeoHeaders, siteOrigin, validDate, xmlEscape } from '../lib/seo';

function feedUrl(href: string, origin: string): string | undefined {
	try {
		const url = new URL(href, origin);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
		return url.href;
	} catch {
		return undefined;
	}
}

export async function loader() {
	const content = await getPublicContent(env as unknown as { DB?: D1Database });
	const origin = siteOrigin(content.site.url);
	const entries = content.writing
		.map((entry) => {
			const link = feedUrl(entry.href, origin);
			if (!link || !entry.title.trim()) return undefined;
			const published = validDate(entry.publishedAt);
			return [
				'    <item>',
				`      <title>${xmlEscape(entry.title)}</title>`,
				`      <description>${xmlEscape(entry.excerpt)}</description>`,
				`      <link>${xmlEscape(link)}</link>`,
				`      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
				...(published ? [`      <pubDate>${xmlEscape(published.toUTCString())}</pubDate>`] : []),
				...(entry.tags.length > 0 ? [`      <category>${xmlEscape(entry.tags[0])}</category>`] : []),
				'    </item>',
			].join('\n');
		})
		.filter((entry): entry is string => entry !== undefined)
		.join('\n');

	const title = content.site.title.trim() || 'Sohel Islam Imran';
	const description = content.site.description.trim() || 'Writing by Sohel Islam Imran.';
	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
		'  <channel>',
		`    <title>${xmlEscape(title)}</title>`,
		`    <description>${xmlEscape(description)}</description>`,
		`    <link>${xmlEscape(`${origin}/`)}</link>`,
		`    <language>${xmlEscape(content.site.locale || 'en')}</language>`,
		`    <atom:link href="${xmlEscape(absoluteUrl('/rss.xml', origin))}" rel="self" type="application/rss+xml" />`,
		entries,
		'  </channel>',
		'</rss>',
		'',
	].join('\n');

	return new Response(body, {
		headers: cacheableSeoHeaders('application/rss+xml; charset=utf-8'),
	});
}
