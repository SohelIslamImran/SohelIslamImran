import { createFileRoute } from "@tanstack/react-router";
import { ORIGIN } from "../lib/seo";
import { readPublished } from "../server/cms.server";
export const Route = createFileRoute("/rss.xml")({
	server: {
		handlers: {
			GET: async () => {
				const content = await readPublished();
				const items = content.writing
					.map((item) => {
						const link = item.href.startsWith("/") ? `${ORIGIN}${item.href}` : item.href;
						const published = validDate(item.publishedAt);
						return `<item><title>${escapeXml(item.title)}</title><link>${escapeXml(link)}</link><guid isPermaLink="true">${escapeXml(link)}</guid><description>${escapeXml(item.excerpt)}</description>${published ? `<pubDate>${published.toUTCString()}</pubDate>` : ""}${item.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("")}</item>`;
					})
					.join("");
				return new Response(
					`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(content.site.title)}</title><link>${escapeXml(ORIGIN)}</link><description>${escapeXml(content.site.description)}</description><language>${escapeXml(content.site.locale)}</language>${items}</channel></rss>`,
					{
						headers: {
							"Content-Type": "application/rss+xml; charset=utf-8",
							"Cache-Control": "public, max-age=3600",
						},
					},
				);
			},
		},
	},
});

function validDate(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function escapeXml(value: string) {
	return value.replace(
		/[<>&'"]/g,
		(character) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ??
			character,
	);
}
