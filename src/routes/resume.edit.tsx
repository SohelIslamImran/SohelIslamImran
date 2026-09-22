import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/resume/edit")({
	loader: () => {
		throw redirect({ href: "https://cms.sohelislamimran.com/", statusCode: 308 });
	},
	head: () => ({
		meta: [{ name: "robots", content: "noindex, nofollow, noarchive" }],
	}),
});
