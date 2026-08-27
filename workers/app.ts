import { createRequestHandler } from "react-router";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.hostname === "www.sohelislamimran.com") {
      url.hostname = "sohelislamimran.com";
      return Response.redirect(url, 308);
    }

    const response = await requestHandler(request);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    if (!headers.has("Referrer-Policy")) {
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    }
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    headers.set("Origin-Agent-Cluster", "?1");
    headers.set("X-Permitted-Cross-Domain-Policies", "none");
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    );
    if (url.protocol === "https:") {
      headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    if (response.status >= 400) {
      headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    const pathname = url.pathname;
    if (pathname.startsWith("/resume/edit")) {
      headers.set("Cache-Control", "private, no-store");
      headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    if (
      (request.method === "GET" || request.method === "HEAD") &&
      response.status === 200 &&
      headers.get("Content-Type")?.startsWith("text/html") &&
      !headers.has("Set-Cookie") &&
      !pathname.startsWith("/resume/edit")
    ) {
      headers.set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
    }
    // Individual /links/:id pages are intentionally redirect/utility pages;
    // the canonical, indexable destination is the public /links directory.
    if (pathname.startsWith("/links/") && pathname !== "/links/") {
      headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
} satisfies ExportedHandler<Env>;
