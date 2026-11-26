import type { MediaAsset, PortfolioContent } from "../types/content";
import { mediaHref } from "./media";

export const ORIGIN = "https://sohelislamimran.com";
export const SOCIAL_IMAGE = "/images/social-home.png";
export const FALLBACK_PORTRAIT = "/images/sohel-linkedin-800.webp";

/** Stable JSON-LD node IDs, so every page describes the same person and site. */
export const PERSON_ID = `${ORIGIN}/#person`;
export const WEBSITE_ID = `${ORIGIN}/#website`;

/** A share image. The static social cards are 1200 × 630 PNGs. */
export interface SocialImage {
	href: string;
	width?: number;
	height?: number;
	type?: string;
	alt?: string;
}

export interface BreadcrumbStep {
	name: string;
	path: string;
}

export interface PageHeadOptions {
	title: string;
	description: string;
	path: string;
	/** Short breadcrumb label for this page. Defaults to the title. */
	crumb?: string;
	/** A path under `public/`, or a sized image such as a CMS cover. */
	image?: string | SocialImage;
	/** Open Graph object type. `profile` and `article` add their own tags. */
	type?: "website" | "profile" | "article";
	/** ISO dates for `article` pages and the WebPage node. */
	publishedTime?: string;
	modifiedTime?: string;
	/** Crumbs between home and this page, such as Work on a project page. */
	parents?: BreadcrumbStep[];
	/** Extra properties for the WebPage node, including a more specific `@type`. */
	page?: Record<string, unknown>;
	structuredData?: Record<string, unknown>[];
}

type MetaTag =
	| { title: string }
	| { name: string; content: string }
	| { property: string; content: string };

const jsonLdEscapes: Record<string, string> = {
	"<": "\\u003c",
	">": "\\u003e",
	"&": "\\u0026",
	"\u2028": "\\u2028",
	"\u2029": "\\u2029",
};

function escapeJsonLd(value: string) {
	return value.replace(/[<>&\u2028\u2029]/g, (character) => jsonLdEscapes[character] ?? character);
}

function jsonLdScript(value: unknown) {
	return {
		type: "application/ld+json",
		children: escapeJsonLd(JSON.stringify(value)),
	};
}

export function absolute(path: string) {
	return new URL(path, ORIGIN).href;
}

/** `en` → `en_US`, `en-GB` → `en_GB`: Open Graph wants language_TERRITORY. */
export function ogLocale(locale: string) {
	const [language = "en", territory] = locale.trim().split(/[-_]/u);
	if (territory) return `${language.toLowerCase()}_${territory.toUpperCase()}`;
	return language.toLowerCase() === "en" ? "en_US" : language.toLowerCase();
}

/** The X handle from the social links, falling back to the identity handle. */
export function twitterHandle(content: PortfolioContent) {
	const x = content.social.find((link) => /^(x|twitter)$/iu.test(link.platform.trim()));
	const fromHref = x?.href.match(/(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})/iu)?.[1];
	const handle = (x?.handle?.trim() || fromHref || content.identity.handle.trim()).replace(
		/^@/u,
		"",
	);
	return handle ? `@${handle}` : undefined;
}

/** A CMS media asset as a share image, with the dimensions it was uploaded at. */
export function mediaSocialImage(asset: MediaAsset | null | undefined): SocialImage | undefined {
	const href = mediaHref(asset);
	if (!asset || !href) return undefined;
	return {
		href,
		width: asset.width,
		height: asset.height,
		type: asset.mimeType,
		alt: asset.alt.trim() || undefined,
	};
}

function resolveImage(image: PageHeadOptions["image"]): SocialImage {
	if (typeof image === "object") return image;
	return { href: image ?? SOCIAL_IMAGE, width: 1200, height: 630, type: "image/png" };
}

function displayName(content: PortfolioContent) {
	return content.identity.name.trim() || "Sohel Islam Imran";
}

export function pageHead(content: PortfolioContent, options: PageHeadOptions) {
	const { title, description, path, type = "website" } = options;
	const name = displayName(content);
	const canonical = absolute(path);
	const image = resolveImage(options.image);
	const imageUrl = absolute(image.href);
	const imageAlt = image.alt ?? (title.includes(name) ? title : `${name} — ${title}`);
	const twitter = twitterHandle(content);
	const [firstName, ...rest] = name.split(/\s+/u);

	const meta: MetaTag[] = [
		{ title },
		{ name: "description", content: description },
		{ name: "author", content: name },
		{
			name: "robots",
			content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
		},
		{ property: "og:site_name", content: name },
		{ property: "og:locale", content: ogLocale(content.site.locale) },
		{ property: "og:type", content: type },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: canonical },
		{ property: "og:image", content: imageUrl },
		{ property: "og:image:secure_url", content: imageUrl },
		...(image.type ? [{ property: "og:image:type", content: image.type }] : []),
		...(image.width && image.height
			? [
					{ property: "og:image:width", content: String(image.width) },
					{ property: "og:image:height", content: String(image.height) },
				]
			: []),
		{ property: "og:image:alt", content: imageAlt },
		{ name: "twitter:card", content: "summary_large_image" },
		...(twitter
			? [
					{ name: "twitter:site", content: twitter },
					{ name: "twitter:creator", content: twitter },
				]
			: []),
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: imageUrl },
		{ name: "twitter:image:alt", content: imageAlt },
	];

	if (type === "profile") {
		meta.push(
			{ property: "profile:first_name", content: firstName ?? name },
			...(rest.length ? [{ property: "profile:last_name", content: rest.join(" ") }] : []),
			{ property: "profile:username", content: content.identity.handle.trim() || name },
		);
	}
	if (type === "article") {
		meta.push(
			{ property: "article:author", content: absolute("/") },
			...(options.publishedTime
				? [{ property: "article:published_time", content: options.publishedTime }]
				: []),
			...(options.modifiedTime
				? [{ property: "article:modified_time", content: options.modifiedTime }]
				: []),
		);
	}

	const breadcrumbs = breadcrumbJsonLd(content, options.crumb ?? title, path, options.parents);
	const webPage = {
		"@context": "https://schema.org",
		"@type": "WebPage",
		"@id": `${canonical}#webpage`,
		url: canonical,
		name: title,
		description,
		inLanguage: content.site.locale,
		isPartOf: { "@id": WEBSITE_ID },
		about: { "@id": PERSON_ID },
		author: { "@id": PERSON_ID },
		primaryImageOfPage: { "@type": "ImageObject", url: imageUrl },
		breadcrumb: { "@id": breadcrumbs["@id"] },
		...(options.publishedTime ? { datePublished: options.publishedTime } : {}),
		...(options.modifiedTime ? { dateModified: options.modifiedTime } : {}),
		...options.page,
	};

	return {
		meta,
		links: [
			{ rel: "canonical", href: canonical },
			// Profiles that link back here, for rel="me" identity verification.
			...content.social
				.map((link) => link.href.trim())
				.filter((href) => /^https:\/\//iu.test(href) && !href.startsWith(ORIGIN))
				.map((href) => ({ rel: "me", href })),
		],
		scripts: [
			jsonLdScript(personJsonLd(content)),
			jsonLdScript(websiteJsonLd(content)),
			jsonLdScript(webPage),
			jsonLdScript(breadcrumbs),
			...(options.structuredData ?? []).map((item) => jsonLdScript(item)),
		],
	};
}

export function personJsonLd(content: PortfolioContent) {
	const role = content.identity.role.trim();
	const employer = content.experience.find((item) => item.current)?.company.trim();
	const knowsAbout = [
		...new Set(content.capabilities.flatMap((item) => item.tools.map((tool) => tool.trim()))),
	].filter(Boolean);
	return {
		"@context": "https://schema.org",
		"@type": "Person",
		"@id": PERSON_ID,
		name: displayName(content),
		url: absolute("/"),
		image: absolute(mediaHref(content.identity.avatar) ?? FALLBACK_PORTRAIT),
		...(role ? { jobTitle: role } : {}),
		...(employer ? { worksFor: { "@type": "Organization", name: employer } } : {}),
		...(knowsAbout.length ? { knowsAbout } : {}),
		email: `mailto:${content.identity.email}`,
		sameAs: content.social
			.map((link) => link.href.trim())
			.filter((href) => /^https?:\/\//iu.test(href) && !href.startsWith(ORIGIN)),
	};
}

export function websiteJsonLd(content: PortfolioContent) {
	const description = content.site.description.trim();
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": WEBSITE_ID,
		url: absolute("/"),
		name: displayName(content),
		...(description ? { description } : {}),
		inLanguage: content.site.locale,
		publisher: { "@id": PERSON_ID },
	};
}

/** A schema.org node for a page's main subject, authored by the site owner. */
export function jsonLd(type: string, name: string, path: string) {
	return {
		"@context": "https://schema.org",
		"@type": type,
		name,
		url: absolute(path),
		isPartOf: { "@id": WEBSITE_ID },
		author: { "@id": PERSON_ID },
	};
}

export function breadcrumbJsonLd(
	content: PortfolioContent,
	title: string,
	path: string,
	parents: BreadcrumbStep[] = [],
) {
	const items =
		path === "/"
			? [{ name: displayName(content), item: absolute("/") }]
			: [
					{ name: displayName(content), item: absolute("/") },
					...parents.map((step) => ({ name: step.name, item: absolute(step.path) })),
					{ name: title, item: absolute(path) },
				];
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"@id": `${absolute(path)}#breadcrumb`,
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: item.item,
		})),
	};
}

export function articleJsonLd(
	title: string,
	description: string,
	path: string,
	image: string,
	datePublished?: string,
	dateModified?: string,
) {
	return {
		...jsonLd("Article", title, path),
		headline: title,
		description,
		image: absolute(image),
		...(datePublished ? { datePublished } : {}),
		...(dateModified || datePublished ? { dateModified: dateModified ?? datePublished } : {}),
		publisher: { "@id": PERSON_ID },
		mainEntityOfPage: { "@id": `${absolute(path)}#webpage` },
	};
}
