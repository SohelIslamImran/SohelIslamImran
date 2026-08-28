import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/data/folio";

const paths = ["/", "/work", "/story", "/field-notes", "/resume", "/links"];
const DECL = "<" + "?xml version=\"1.0\" encoding=\"UTF-8\"?>";
const body =
  DECL +
  `\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  paths
    .map(
      (path) =>
        `  <url>\n    <loc>${site.url}${path === "/" ? "" : path}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(body, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        }),
    },
  },
});
