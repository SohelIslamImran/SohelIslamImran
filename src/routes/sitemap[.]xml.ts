import { createFileRoute } from "@tanstack/react-router";
import { ORIGIN } from "../lib/seo";
export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: () => {
				const urls = ["/", "/work", "/story", "/field-notes", "/resume", "/links"]
					.map((path) => `<url><loc>${escapeXml(`${ORIGIN}${path}`)}</loc></url>`)
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
