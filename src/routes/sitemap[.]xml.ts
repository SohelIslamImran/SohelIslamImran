import { createFileRoute } from "@tanstack/react-router";
import { ORIGIN } from "../lib/seo";
import { readPublished } from "../server/cms.server";
export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				const content = await readPublished();
				const writingPaths = content.writing
					.map((item) => item.href)
					.filter((href) => href.startsWith("/") && !href.startsWith("//"));
				const paths = [
					...new Set([
						"/",
						"/work",
						"/story",
						"/field-notes",
						"/resume",
						"/links",
						...writingPaths,
					]),
				];
				const lastModified = new Map<string, string | undefined>([
					["/resume", content.resume.updatedAt ?? undefined],
					...content.writing.map((item) => [item.href, item.publishedAt] as const),
				]);
				const urls = paths
					.map((path) => {
						const lastmod = lastModified.get(path);
						return `<url><loc>${escapeXml(`${ORIGIN}${path}`)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ""}</url>`;
					})
					.join("");
				return new Response(
					`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
					{
						headers: {
							"Content-Type": "application/xml; charset=utf-8",
							"Cache-Control": "public, max-age=3600",
						},
					},
				);
			},
		},
	},
});

function escapeXml(value: string) {
	return value.replace(
		/[<>&'"]/g,
		(character) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ??
			character,
	);
}
