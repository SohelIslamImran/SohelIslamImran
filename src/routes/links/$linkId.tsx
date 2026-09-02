import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getPublicProfileLink } from "../../server/content";
export const Route = createFileRoute("/links/$linkId")({
	loader: async ({ params }) => {
		const link = await getPublicProfileLink(params.linkId);
		if (!link) throw notFound();
		throw redirect({ href: link.href, statusCode: 302 });
	},
	head: () => ({
		meta: [{ name: "robots", content: "noindex, nofollow" }],
	}),
});
