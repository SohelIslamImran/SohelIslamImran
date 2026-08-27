import { env } from "cloudflare:workers";

import type { Route } from "./+types/link-redirect";
import { getPublicContent } from "../lib/cms.server";

const LINK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function notFound(): Response {
  return new Response("That link is not available.", {
    status: 404,
    headers: {
      "Cache-Control": "public, max-age=60",
      "Content-Type": "text/plain; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function loader({ params }: Route.LoaderArgs) {
  const linkId = params.linkId;
  if (!linkId || !LINK_ID_PATTERN.test(linkId)) return notFound();

  const content = await getPublicContent(env as unknown as { DB?: D1Database });
  const link = content.profileLinks.find((candidate) => candidate.id === linkId);
  if (!link) return notFound();

  // profileLinks is validated before it can reach a public loader. Keep this
  // second guard close to the redirect so a malformed legacy document can
  // never turn this route into an open redirect.
  const href = link.href;
  const isRootRelative = href.startsWith("/") && !href.startsWith("//");
  const isFragment = href.startsWith("#");
  const isContact = /^(mailto|tel):/i.test(href);
  let isHttps = false;
  try {
    isHttps = new URL(href).protocol === "https:";
  } catch {
    // The validation layer owns the detailed error; this route fails closed.
  }

  if (!isRootRelative && !isFragment && !isContact && !isHttps) return notFound();

  return new Response(null, {
    status: 302,
    headers: {
      Location: href,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export function headers() {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
}
