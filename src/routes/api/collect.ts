import { createFileRoute } from "@tanstack/react-router";
import { env, waitUntil } from "cloudflare:workers";
import { collectAnalytics } from "../../server/analytics-collector.server";

export const Route = createFileRoute("/api/collect")({
	server: {
		handlers: {
			POST: ({ request }) => collectAnalytics(request, env, waitUntil),
			ANY: () =>
				new Response(null, {
					status: 405,
					headers: { Allow: "POST", "Cache-Control": "no-store" },
				}),
		},
	},
});
