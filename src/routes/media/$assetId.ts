import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getPublishedMedia } from "../../server/media.server";

export const Route = createFileRoute("/media/$assetId")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				if (!/^[A-Za-z0-9_-]{8,160}$/u.test(params.assetId)) return mediaNotFound();
				try {
					const result = await getPublishedMedia(env, params.assetId);
					if (!result) return mediaNotFound();
					const headers = new Headers({
						"Cache-Control": "public, max-age=31536000, immutable",
						"Content-Type": result.mimeType,
						"X-Content-Type-Options": "nosniff",
					});
					if (result.object.httpEtag) headers.set("ETag", result.object.httpEtag);
					if (result.object.size) headers.set("Content-Length", String(result.object.size));
					return new Response(result.object.body, { headers });
				} catch {
					return mediaNotFound();
				}
			},
		},
	},
});

function mediaNotFound() {
	return new Response("Not found", {
		status: 404,
		headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
	});
}
