import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { isCmsHostname } from "../../lib/cms-host";
import type { PortfolioContent } from "../../types/content";
import { analyticsHostnamePattern, canonicalAnalyticsPath, profileLinkIdPattern } from "./paths";

const optOutKey = "portfolio.analytics.off";
const tabStorageKey = "portfolio.analytics.tab";
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;

interface View {
	href: string;
	path: string;
	visibleSince: number | null;
	engaged: boolean;
}

function hostname(href: string) {
	try {
		const url = new URL(href);
		const host = url.hostname.replace(/\.$/u, "");
		return /^https?:$/u.test(url.protocol) &&
			url.origin !== window.location.origin &&
			host.length <= 253 &&
			analyticsHostnamePattern.test(host)
			? host
			: undefined;
	} catch {
		return undefined;
	}
}

export function Beacon() {
	const router = useRouter();
	const current = useRef<View | null>(null);
	const tab = useRef<string | null>(null);

	useEffect(() => {
		if (isCmsHostname(window.location.hostname) || typeof navigator.sendBeacon !== "function")
			return;
		let optedOut = false;

		function updateOptOut() {
			const opt = new URLSearchParams(window.location.search).get("analytics");
			if (opt === "off") optedOut = true;
			if (opt === "on") optedOut = false;
			try {
				if (opt === "off") localStorage.setItem(optOutKey, "1");
				else if (opt === "on") localStorage.removeItem(optOutKey);
				else optedOut = localStorage.getItem(optOutKey) === "1";
			} catch {
				// The preference still applies for this document.
			}
		}

		function getTab() {
			if (tab.current) return tab.current;
			try {
				const stored = sessionStorage.getItem(tabStorageKey);
				if (stored && uuidPattern.test(stored)) {
					tab.current = stored;
					return stored;
				}
			} catch {
				// Use an in-memory tab id when storage is unavailable.
			}
			const id = crypto.randomUUID();
			tab.current = id;
			try {
				sessionStorage.setItem(tabStorageKey, id);
			} catch {
				// The current document can still use this id.
			}
			return id;
		}

		function send(
			path: string,
			event: { kind: string; [key: string]: string | number | boolean | undefined },
		) {
			if (optedOut || navigator.doNotTrack === "1") return;
			const payload = {
				...event,
				path,
				tab_id: getTab(),
				event_id: event.kind === "heartbeat" ? undefined : crypto.randomUUID(),
			};
			navigator.sendBeacon(
				"/api/collect",
				new Blob([JSON.stringify(payload)], { type: "text/plain" }),
			);
		}

		function finishView() {
			const view = current.current;
			if (!view || view.engaged || view.visibleSince === null) return;
			view.engaged = true;
			const visibleMs = Math.min(
				86_400_000,
				Math.max(0, Math.round(performance.now() - view.visibleSince)),
			);
			send(view.path, { kind: "engagement", visible_ms: visibleMs });
		}

		function openView(href: string, pathname: string, initial = false) {
			updateOptOut();
			const path = canonicalAnalyticsPath(pathname);
			if (optedOut || navigator.doNotTrack === "1" || !path) {
				finishView();
				current.current = null;
				return;
			}
			if (current.current?.href === href) return;
			finishView();
			const visible = document.visibilityState === "visible";
			current.current = {
				href,
				path,
				visibleSince: visible ? performance.now() : null,
				engaged: false,
			};
			send(path, {
				kind: "pageview",
				visible,
				referrer_host: initial ? hostname(document.referrer) : undefined,
			});
		}

		function heartbeat() {
			const view = current.current;
			if (view && document.visibilityState === "visible") send(view.path, { kind: "heartbeat" });
		}

		function showView() {
			const view = current.current;
			if (!view || document.visibilityState !== "visible") return;
			view.visibleSince ??= performance.now();
			heartbeat();
		}

		function onVisibility() {
			if (document.visibilityState === "hidden") finishView();
			else showView();
		}

		function onPageShow(event: PageTransitionEvent) {
			if (event.persisted) showView();
		}

		function onStorage(event: StorageEvent) {
			if (event.key !== optOutKey && event.key !== null) return;
			try {
				optedOut = localStorage.getItem(optOutKey) === "1";
			} catch {
				optedOut = event.newValue === "1";
			}
			if (optedOut) current.current = null;
		}

		function onClick(event: MouseEvent) {
			const view = current.current;
			if (!view || (event.type === "auxclick" && event.button !== 1)) return;
			const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
			if (!(anchor instanceof HTMLAnchorElement)) return;
			let url: URL;
			try {
				url = new URL(anchor.href, window.location.href);
			} catch {
				return;
			}
			if (url.origin === window.location.origin) {
				const id = /^\/links\/([^/]+)\/?$/u.exec(url.pathname)?.[1];
				if (id && profileLinkIdPattern.test(id)) send(view.path, { kind: "outbound", link_id: id });
				return;
			}
			const destination = hostname(url.href);
			if (!destination) return;
			const home = router.state.matches.find((match) => match.routeId === "/")?.loaderData as
				| PortfolioContent
				| undefined;
			const href = anchor.getAttribute("href")?.trim();
			const matches = home?.profileLinks.filter((link) => link.href.trim() === href);
			const id = matches?.length === 1 ? matches[0]?.id : undefined;
			send(
				view.path,
				id
					? { kind: "outbound", link_id: id }
					: { kind: "outbound", destination_host: destination },
			);
		}

		const initial = router.state.resolvedLocation ?? router.state.location;
		openView(initial.href, initial.pathname, true);
		const unsubscribe = router.subscribe("onResolved", ({ toLocation }) =>
			openView(toLocation.href, toLocation.pathname),
		);
		const timer = window.setInterval(heartbeat, 30_000);
		document.addEventListener("visibilitychange", onVisibility);
		document.addEventListener("click", onClick, true);
		document.addEventListener("auxclick", onClick, true);
		window.addEventListener("pagehide", finishView);
		window.addEventListener("pageshow", onPageShow);
		window.addEventListener("storage", onStorage);
		return () => {
			unsubscribe();
			window.clearInterval(timer);
			document.removeEventListener("visibilitychange", onVisibility);
			document.removeEventListener("click", onClick, true);
			document.removeEventListener("auxclick", onClick, true);
			window.removeEventListener("pagehide", finishView);
			window.removeEventListener("pageshow", onPageShow);
			window.removeEventListener("storage", onStorage);
		};
	}, [router]);

	return null;
}
