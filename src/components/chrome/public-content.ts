import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { getPublishedContent } from "../../server/content";
import type { PortfolioContent } from "../../types/content";

/**
 * Public routes whose loader returns published `PortfolioContent`. The chrome
 * reads loader data only from these ids, so owner-only data (the CMS loader
 * returns drafts) can never leak into the nav, footer, or command palette.
 */
const PUBLIC_CONTENT_ROUTE_IDS: ReadonlySet<string> = new Set([
	"/",
	"/work",
	"/work_/$slug",
	"/story",
	"/resume",
	"/links",
	"/field-notes",
]);

function isPortfolioContent(value: unknown): value is PortfolioContent {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<PortfolioContent>;
	return (
		typeof candidate.identity === "object" &&
		Array.isArray(candidate.projects) &&
		Array.isArray(candidate.profileLinks)
	);
}

/**
 * Published content already loaded by the current public route, or null.
 * SSR-safe: server and client read the same dehydrated router state.
 */
export function useRoutePublicContent(): PortfolioContent | null {
	return useRouterState({
		select: (state) => {
			for (const match of state.matches) {
				if (PUBLIC_CONTENT_ROUTE_IDS.has(match.routeId) && isPortfolioContent(match.loaderData)) {
					return match.loaderData;
				}
			}
			return null;
		},
	});
}

let cachedContent: PortfolioContent | null = null;
let pendingContent: Promise<PortfolioContent> | null = null;

/** Fetches published content once per page session (public server function). */
export function loadPublicContent(): Promise<PortfolioContent> {
	if (cachedContent) return Promise.resolve(cachedContent);
	pendingContent ??= getPublishedContent().then(
		(content) => {
			cachedContent = content;
			return content;
		},
		(error: unknown) => {
			pendingContent = null;
			throw error;
		},
	);
	return pendingContent;
}

/**
 * Route content when available; otherwise fetches lazily once `enabled` turns
 * true (e.g. the palette opens on a page without public content).
 */
export function usePublicContent(enabled: boolean): {
	content: PortfolioContent | null;
	status: "ready" | "loading" | "error" | "idle";
} {
	const routeContent = useRoutePublicContent();
	const [fetched, setFetched] = useState<PortfolioContent | null>(cachedContent);
	const [status, setStatus] = useState<"loading" | "error" | "idle">("idle");

	useEffect(() => {
		if (routeContent) cachedContent ??= routeContent;
	}, [routeContent]);

	useEffect(() => {
		if (!enabled || routeContent || fetched) return;
		let cancelled = false;
		setStatus("loading");
		loadPublicContent().then(
			(content) => {
				if (cancelled) return;
				setFetched(content);
				setStatus("idle");
			},
			() => {
				if (!cancelled) setStatus("error");
			},
		);
		return () => {
			cancelled = true;
		};
	}, [enabled, routeContent, fetched]);

	const content = routeContent ?? fetched;
	return { content, status: content ? "ready" : status };
}
