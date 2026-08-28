import { createFileRoute } from "@tanstack/react-router";
import { fieldNotes, site, chapters } from "@/data/folio";

function esc(value: string) {
  return value.replaceAll("&", "&" + "amp;").replaceAll("<", "&" + "lt;").replaceAll(">", "&" + "gt;");
}

const DECL = "<" + "?xml version=\"1.0\" encoding=\"UTF-8\"?>";
const items = [
  `  <item><title>${esc(chapters[0].title)}</title><link>${site.url}/story</link><description>${esc(chapters[0].paragraphs[0])}</description></item>`,
  `  <item><title>Field notes</title><link>${site.url}/field-notes</link><description>${esc(fieldNotes[0].summary)}</description></item>`,
].join("\n");

const body = `${DECL}
<rss version="2.0">
  <channel>
    <title>${esc(site.title)}</title>
    <link>${site.url}</link>
    <description>${esc(site.description)}</description>
${items}
  </channel>
</rss>
`;

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(body, {
          headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        }),
    },
  },
});
