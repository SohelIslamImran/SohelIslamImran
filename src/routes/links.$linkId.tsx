import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getPublicDocument, getStudioDocument } from "@/lib/cms";

const LINK_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const Route = createFileRoute("/links/$linkId")({
  loader: async ({ params }) => {
    if (!LINK_ID.test(params.linkId)) throw notFound();
    const publicDoc = await getPublicDocument();
    let link = publicDoc.payload.links.find((item) => item.id === params.linkId);
    if (!link) {
      const doc = await getStudioDocument();
      link = doc.payload.links.find((item) => item.id === params.linkId);
    }
    if (!link) throw notFound();
    const href = link.href;
    const isRootRelative = href.startsWith("/") && !href.startsWith("//");
    const isFragment = href.startsWith("#");
    const isContact = /^(mailto|tel):/i.test(href);
    let isHttps = false;
    try {
      isHttps = new URL(href).protocol === "https:";
    } catch {
      /* fail closed */
    }
    if (!isRootRelative && !isFragment && !isContact && !isHttps) throw notFound();
    throw redirect({ href, statusCode: 302 });
  },
  component: () => null,
});
