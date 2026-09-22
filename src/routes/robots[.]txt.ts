import { createFileRoute } from "@tanstack/react-router";
import { ORIGIN } from "../lib/seo";
export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: () =>
				new Response(
					`User-agent: *\nAllow: /\nDisallow: /cms\nDisallow: /resume/edit\nDisallow: /links/\nDisallow: /__tsr\nSitemap: ${ORIGIN}/sitemap.xml\n`,
					{
						headers: {
							"Content-Type": "text/plain; charset=utf-8",
							"Cache-Control": "public, max-age=3600",
						},
					},
				),
		},
	},
});
