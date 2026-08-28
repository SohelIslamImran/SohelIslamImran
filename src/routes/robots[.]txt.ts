import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/data/folio";

const body = `User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        }),
    },
  },
});
