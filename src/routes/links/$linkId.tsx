import { createFileRoute, redirect } from "@tanstack/react-router";
import { getPublicProfileLink } from "../../server/content";
export const Route = createFileRoute("/links/$linkId")({
	loader: async ({ params }) => {
		const link = await getPublicProfileLink(params.linkId);
		if (!link) throw new Response("Not found", { status: 404 });
		throw redirect({ href: link.href, statusCode: 302 });
	},
	head: () => ({
		meta: [{ name: "robots", content: "noindex, nofollow" }],
	}),
});
