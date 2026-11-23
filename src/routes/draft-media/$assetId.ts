/**
 * Owner-only preview of a media library image, published or not, so the
 * library can show drafts. Served only on the CMS host (behind Access), never
 * cached by shared caches, and limited to image types.
 */
import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { isCmsHostname } from "../../lib/cms-host";
import { requireOwner } from "../../server/auth.server";
import { getOwnerMediaPreview } from "../../server/media.server";

export const Route = createFileRoute("/draft-media/$assetId")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const url = new URL(request.url);
				const local = env.ENVIRONMENT === "development";
				if (!isCmsHostname(url.hostname) && !local) return notFound();
				if (!/^[A-Za-z0-9_-]{8,160}$/u.test(params.assetId)) return notFound();
				try {
					await requireOwner(request, env);
				} catch {
					return notFound();
				}
				try {
					const result = await getOwnerMediaPreview(env, params.assetId);
					if (!result) return notFound();
					const headers = new Headers({
						"Cache-Control": "private, max-age=300",
						"Content-Type": result.mimeType,
						"Content-Security-Policy": "default-src 'none'; sandbox",
						"X-Content-Type-Options": "nosniff",
						"X-Robots-Tag": "noindex",
					});
					if (result.object.httpEtag) headers.set("ETag", result.object.httpEtag);
					if (result.object.size) headers.set("Content-Length", String(result.object.size));
					return new Response(result.object.body, { headers });
				} catch {
					return notFound();
				}
			},
		},
	},
});

function notFound() {
	return new Response("Not found", {
		status: 404,
		headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
	});
}
