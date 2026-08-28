import type { MetaDescriptor } from 'react-router';

import type {
	ExperienceContent,
	IdentityContent,
	PortfolioContent,
	ProfileLinkContent,
	SiteContent,
	SocialLinkContent,
} from '../types/content';

/**
 * The production origin is intentionally explicit. Canonicals and feeds must
 * not be derived from an arbitrary Host header, especially on preview URLs.
 */
export const DEFAULT_SITE_ORIGIN = 'https://sohelislamimran.com';
export const DEFAULT_SOCIAL_IMAGE_PATH = '/images/sohel-linkedin.png';
export const DEFAULT_SOCIAL_IMAGE_ALT = 'Portrait of Sohel Islam Imran';
export const DEFAULT_SITE_NAME = 'Sohel Islam Imran';
export const DEFAULT_SITE_DESCRIPTION = 'Systems, product architecture, mobile infrastructure, and developer tools—clearly built.';

export type JsonLdPrimitive = string | number | boolean | null;
export type JsonLdValue = JsonLdPrimitive | JsonLdObject | JsonLdValue[];
export type JsonLdObject = { [key: string]: JsonLdValue };

export interface SeoContent {
	site: Pick<SiteContent, 'title' | 'description' | 'url' | 'locale'>;
	identity: Pick<IdentityContent, 'name' | 'role' | 'location' | 'avatar'>;
	social?: ReadonlyArray<Pick<SocialLinkContent, 'href'>>;
	profileLinks?: ReadonlyArray<Pick<ProfileLinkContent, 'href'>>;
	experience?: ReadonlyArray<Pick<ExperienceContent, 'company' | 'role' | 'current' | 'href'>>;
}

export interface SeoPageOptions {
	title: string;
	description: string;
	pathname: string;
	content?: SeoContent;
	type?: 'website' | 'article';
	image?: string;
	imageAlt?: string;
	noIndex?: boolean;
	article?: {
		publishedAt?: string;
		modifiedAt?: string;
		section?: string;
		tags?: ReadonlyArray<string>;
	};
	jsonLd?: JsonLdObject | ReadonlyArray<JsonLdObject>;
}

export function siteOrigin(siteUrl?: string): string {
	if (!siteUrl) return DEFAULT_SITE_ORIGIN;

	try {
		const parsed = new URL(siteUrl, DEFAULT_SITE_ORIGIN);
		if (parsed.protocol !== 'https:') return DEFAULT_SITE_ORIGIN;
		return parsed.origin;
	} catch {
		return DEFAULT_SITE_ORIGIN;
	}
}

export function normalizePathname(pathname: string): string {
	if (!pathname || !pathname.startsWith('/')) return '/';
	const path = pathname.split(/[?#]/, 1)[0] || '/';
	if (path === '/') return '/';
	return `/${path.replace(/^\/+|\/+$/g, '')}`;
}

export function absoluteUrl(pathname: string, origin = DEFAULT_SITE_ORIGIN): string {
	try {
		const url = new URL(pathname, origin);
		url.hash = '';
		return url.href;
	} catch {
		return `${origin}${normalizePathname(pathname)}`;
	}
}

export function canonicalUrl(pathname: string, origin = DEFAULT_SITE_ORIGIN): string {
	return absoluteUrl(normalizePathname(pathname), origin);
}

function contentOrigin(content?: SeoContent): string {
	return siteOrigin(content?.site.url);
}

function imageUrl(pathname: string | undefined, origin: string): string {
	return absoluteUrl(pathname ?? DEFAULT_SOCIAL_IMAGE_PATH, origin);
}

/**
 * Shared title/description/social metadata. Route modules add their own
 * structured data while this function keeps the social contract consistent.
 */
export function createSeoMeta(options: SeoPageOptions): MetaDescriptor[] {
	const origin = contentOrigin(options.content);
	const canonical = canonicalUrl(options.pathname, origin);
	const image = imageUrl(options.image, origin);
	const imageAlt = options.imageAlt ?? DEFAULT_SOCIAL_IMAGE_ALT;
	const isSocialCard = options.image?.startsWith('/images/social-') ?? false;
	const imageWidth = isSocialCard ? '1200' : '800';
	const imageHeight = isSocialCard ? '630' : '800';
	const type = options.type ?? 'website';
	const descriptors: MetaDescriptor[] = [
		{ title: options.title },
		{ name: 'description', content: options.description },
		{
			tagName: 'link',
			rel: 'canonical',
			href: canonical,
		},
		{ property: 'og:site_name', content: DEFAULT_SITE_NAME },
		{ property: 'og:title', content: options.title },
		{ property: 'og:description', content: options.description },
		{ property: 'og:type', content: type },
		{ property: 'og:url', content: canonical },
		{ property: 'og:image', content: image },
		{ property: 'og:image:alt', content: imageAlt },
		{ property: 'og:image:width', content: imageWidth },
		{ property: 'og:image:height', content: imageHeight },
		{
			property: 'og:locale',
			content: options.content?.site.locale === 'en' ? 'en_US' : (options.content?.site.locale || 'en_US').replace('-', '_'),
		},
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:title', content: options.title },
		{ name: 'twitter:description', content: options.description },
		{ name: 'twitter:image', content: image },
		{ name: 'twitter:image:alt', content: imageAlt },
		{
			name: 'robots',
			content: options.noIndex ? 'noindex, nofollow' : 'index, follow',
		},
	];

	if (type === 'article' && options.article) {
		if (options.article.publishedAt) {
			descriptors.push({ property: 'article:published_time', content: options.article.publishedAt });
		}
		if (options.article.modifiedAt) {
			descriptors.push({ property: 'article:modified_time', content: options.article.modifiedAt });
		}
		if (options.article.section) {
			descriptors.push({ property: 'article:section', content: options.article.section });
		}
		for (const tag of options.article.tags ?? []) {
			if (tag.trim()) descriptors.push({ property: 'article:tag', content: tag });
		}
	}

	if (options.jsonLd) {
		descriptors.push({ 'script:ld+json': options.jsonLd as JsonLdObject | JsonLdObject[] });
	}

	return descriptors;
}

function sameAsLinks(content?: SeoContent, origin = contentOrigin(content)): string[] {
	return [
		...new Set(
			[...(content?.social ?? []), ...(content?.profileLinks ?? [])]
				.map((link) => {
					try {
						const url = new URL(link.href, origin);
						// sameAs is for distinct public profiles, not this site's internal
						// routes or contact schemes.
						return url.protocol === 'https:' && url.origin !== origin ? url.href : null;
					} catch {
						return null;
					}
				})
				.filter((href): href is string => href !== null),
		),
	];
}

function currentEmployer(content?: SeoContent): JsonLdObject | undefined {
	const current = content?.experience?.find((item) => item.current && item.company.trim());
	if (!current) return undefined;
	const origin = contentOrigin(content);

	return {
		'@type': 'Organization',
		name: current.company,
		...(current.href ? { url: absoluteUrl(current.href, origin) } : {}),
	};
}

/** A stable Person node shared by the homepage and profile-like pages. */
export function personJsonLd(content?: SeoContent): JsonLdObject {
	const origin = contentOrigin(content);
	const name = content?.identity.name.trim() || DEFAULT_SITE_NAME;
	const role = content?.identity.role.trim();
	const location = content?.identity.location.trim();
	const image = content?.identity.avatar?.id
		? absoluteUrl(`/media/${encodeURIComponent(content.identity.avatar.id)}`, origin)
		: absoluteUrl(DEFAULT_SOCIAL_IMAGE_PATH, origin);

	return {
		'@context': 'https://schema.org',
		'@type': 'Person',
		'@id': `${origin}/#person`,
		name,
		url: `${origin}/`,
		image,
		...(role ? { jobTitle: role } : {}),
		...(location
			? {
					homeLocation: {
						'@type': 'Place',
						name: location,
					},
				}
			: {}),
		...(sameAsLinks(content, origin).length > 0 ? { sameAs: sameAsLinks(content, origin) } : {}),
		...(currentEmployer(content) ? { worksFor: currentEmployer(content) } : {}),
	};
}

export function profilePageJsonLd(content: SeoContent | undefined, pathname: string, name: string, description: string): JsonLdObject {
	const origin = contentOrigin(content);
	const url = canonicalUrl(pathname, origin);

	return {
		'@context': 'https://schema.org',
		'@type': 'ProfilePage',
		'@id': `${url}#profile`,
		url,
		name,
		description,
		mainEntity: { '@id': `${origin}/#person` },
	};
}

export function collectionPageJsonLd(content: SeoContent | undefined, pathname: string, name: string, description: string): JsonLdObject {
	const origin = contentOrigin(content);
	const url = canonicalUrl(pathname, origin);

	return {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		'@id': `${url}#page`,
		url,
		name,
		description,
		isPartOf: { '@id': `${origin}/#website` },
	};
}

export function articleJsonLd(options: {
	content?: SeoContent;
	pathname: string;
	headline: string;
	description: string;
	publishedAt?: string;
	modifiedAt?: string;
	section?: string;
	tags?: ReadonlyArray<string>;
	image?: string;
}): JsonLdObject {
	const origin = contentOrigin(options.content);
	const url = canonicalUrl(options.pathname, origin);
	const result: JsonLdObject = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		'@id': `${url}#article`,
		headline: options.headline,
		description: options.description,
		url,
		mainEntityOfPage: { '@id': url },
		author: { '@id': `${origin}/#person` },
		image: [imageUrl(options.image, origin)],
	};

	if (options.publishedAt) result.datePublished = options.publishedAt;
	if (options.modifiedAt) result.dateModified = options.modifiedAt;
	if (options.section) result.articleSection = options.section;
	if (options.tags && options.tags.length > 0) result.keywords = [...options.tags];
	return result;
}

export function breadcrumbJsonLd(content: SeoContent | undefined, items: ReadonlyArray<{ name: string; pathname: string }>): JsonLdObject {
	const origin = contentOrigin(content);

	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: canonicalUrl(item.pathname, origin),
		})),
	};
}

export function websiteJsonLd(content?: SeoContent): JsonLdObject {
	const origin = contentOrigin(content);
	const name = content?.site.title.trim() || DEFAULT_SITE_NAME;
	const description = content?.site.description.trim() || DEFAULT_SITE_DESCRIPTION;

	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		'@id': `${origin}/#website`,
		url: `${origin}/`,
		name,
		description,
		inLanguage: content?.site.locale || 'en',
	};
}

export function xmlEscape(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function validDate(value: string | undefined): Date | undefined {
	if (!value?.trim()) return undefined;
	const timestamp = Date.parse(value);
	if (!Number.isFinite(timestamp)) return undefined;
	return new Date(timestamp);
}

export function cacheableSeoHeaders(contentType: string): Headers {
	return new Headers({
		'Content-Type': contentType,
		'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400',
		'X-Content-Type-Options': 'nosniff',
	});
}

export function seoContent(content: PortfolioContent): SeoContent {
	return content;
}
