import type { PortfolioContent } from "../../app/types/content";

export const ORIGIN = "https://sohelislamimran.com";
export const SOCIAL_IMAGE = "/images/social-home.png";

export function absolute(path: string) {
	return new URL(path, ORIGIN).href;
}

export function pageHead(
	content: PortfolioContent,
	title: string,
	description: string,
	path: string,
	image = SOCIAL_IMAGE,
	structuredData: Record<string, unknown>[] = [],
) {
	const canonical = absolute(path);
	const breadcrumbs = breadcrumbJsonLd(content, title, path);
	return {
		meta: [
			{ title },
			{ name: "author", content: content.identity.name },
			{ name: "description", content: description },
			{ name: "robots", content: "index, follow" },
			{ property: "og:site_name", content: content.identity.name },
			{ property: "og:locale", content: content.site.locale.replace("-", "_") },
			{ property: "og:title", content: title },
			{ property: "og:description", content: description },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: canonical },
			{ property: "og:image", content: absolute(image) },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:creator", content: `@${content.identity.handle}` },
			{ name: "twitter:title", content: title },
			{ name: "twitter:description", content: description },
			{ name: "twitter:image", content: absolute(image) },
		],
		links: [{ rel: "canonical", href: canonical }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify(personJsonLd(content)),
			},
			{
				type: "application/ld+json",
				children: JSON.stringify({
					...jsonLd(content, "WebPage", title, path),
					name: title,
					description,
					inLanguage: content.site.locale,
				}),
			},
			{
				type: "application/ld+json",
				children: JSON.stringify(breadcrumbs),
			},
			...structuredData.map((item) => ({
				type: "application/ld+json",
				children: JSON.stringify(item),
			})),
		],
	};
}

export function personJsonLd(content: PortfolioContent) {
	return {
		"@context": "https://schema.org",
		"@type": "Person",
		name: content.identity.name,
		jobTitle: content.identity.role,
		url: ORIGIN,
		email: `mailto:${content.identity.email}`,
		address: { "@type": "PostalAddress", addressLocality: "Dhaka", addressCountry: "BD" },
		sameAs: content.social.map((link) => link.href),
	};
}

export function jsonLd(content: PortfolioContent, type: string, name: string, path: string) {
	return {
		"@context": "https://schema.org",
		"@type": type,
		name,
		url: absolute(path),
		isPartOf: { "@type": "WebSite", url: ORIGIN },
		author: personJsonLd(content),
	};
}

export function breadcrumbJsonLd(content: PortfolioContent, title: string, path: string) {
	const items = [
		{ name: content.identity.name, item: absolute("/") },
		...(path === "/" ? [] : [{ name: title, item: absolute(path) }]),
	];
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: item.item,
		})),
	};
}

export function articleJsonLd(
	content: PortfolioContent,
	title: string,
	description: string,
	path: string,
	datePublished?: string,
) {
	return {
		...jsonLd(content, "Article", title, path),
		headline: title,
		description,
		datePublished,
		mainEntityOfPage: absolute(path),
	};
}
