import { env } from 'cloudflare:workers';

import { getPublicContent } from '../lib/cms.server';
import { cacheableSeoHeaders, siteOrigin } from '../lib/seo';

export async function loader() {
	const content = await getPublicContent(env as unknown as { DB?: D1Database });
	const origin = siteOrigin(content.site.url);
	const body = [
		'User-agent: *',
		'Allow: /',
		'Disallow: /resume/edit',
		'Disallow: /resume/edit/',
		`Sitemap: ${origin}/sitemap.xml`,
		'',
	].join('\n');

	return new Response(body, {
		headers: cacheableSeoHeaders('text/plain; charset=utf-8'),
	});
}
