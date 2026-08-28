import { createFileRoute } from "@tanstack/react-router";
import { ORIGIN } from "../lib/seo";
export const Route = createFileRoute("/rss.xml")({
	server: {
		handlers: {
			GET: () =>
				new Response(
					`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml("Sohel Islam Imran")}</title><link>${escapeXml(ORIGIN)}</link><description>${escapeXml("Engineering notes from Sohel Islam Imran.")}</description><item><title>${escapeXml("From first principles")}</title><link>${escapeXml(`${ORIGIN}/story`)}</link></item></channel></rss>`,
					{
						headers: {
							"Content-Type": "application/rss+xml; charset=utf-8",
							"Cache-Control": "public, max-age=3600",
						},
					},
				),
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
