import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { isCmsHostname } from "../../lib/cms-host";
import type { PortfolioContent } from "../../types/content";
import { analyticsHostnamePattern, canonicalAnalyticsPath, profileLinkIdPattern } from "./paths";

const optOutKey = "portfolio.analytics.off";
const tabStorageKey = "portfolio.analytics.tab";
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;

interface View {
	path: string;
	visibleSince: number | null;
	visibleMs: number;
	engagementId: string;
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
				event_id: event.kind === "heartbeat" ? undefined : (event.event_id ?? crypto.randomUUID()),
			};
			navigator.sendBeacon(
				"/api/collect",
				new Blob([JSON.stringify(payload)], { type: "text/plain" }),
			);
		}

		function reportEngagement() {
			const view = current.current;
			if (!view || view.visibleSince === null) return;
			view.visibleMs += performance.now() - view.visibleSince;
			view.visibleSince = null;
			send(view.path, {
				kind: "engagement",
				event_id: view.engagementId,
				visible_ms: Math.min(86_400_000, Math.round(view.visibleMs)),
			});
		}

		function openView(pathname: string, initial = false) {
			updateOptOut();
			const path = canonicalAnalyticsPath(pathname);
			if (optedOut || navigator.doNotTrack === "1" || !path) {
				reportEngagement();
				current.current = null;
				return;
			}
			if (current.current?.path === path) return;
			reportEngagement();
			const visible = document.visibilityState === "visible";
			current.current = {
				path,
				visibleSince: visible ? performance.now() : null,
				visibleMs: 0,
				engagementId: crypto.randomUUID(),
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
			if (!view || view.visibleSince !== null || document.visibilityState !== "visible") return;
			view.visibleSince = performance.now();
			heartbeat();
		}

		function onVisibility() {
			if (document.visibilityState === "hidden") reportEngagement();
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
			const home = router.state.matches.find((match) => match.routeId === "/")?.loaderData as
				| PortfolioContent
				| undefined;
			const href = anchor.getAttribute("href")?.trim();
			const matches = home?.profileLinks.filter((link) => link.href.trim() === href);
			const profileId = matches?.length === 1 ? matches[0]?.id : undefined;
			if (profileId) {
				send(view.path, { kind: "outbound", link_id: profileId });
			} else if (url.origin === window.location.origin) {
				const id = /^\/links\/([^/]+)\/?$/u.exec(url.pathname)?.[1];
				if (id && profileLinkIdPattern.test(id)) send(view.path, { kind: "outbound", link_id: id });
			} else {
				const destination = hostname(url.href);
				if (destination) send(view.path, { kind: "outbound", destination_host: destination });
			}
		}

		const initial = router.state.resolvedLocation ?? router.state.location;
		openView(initial.pathname, true);
		const unsubscribe = router.subscribe("onResolved", ({ toLocation }) =>
			openView(toLocation.pathname),
		);
		const timer = window.setInterval(heartbeat, 60_000);
		document.addEventListener("visibilitychange", onVisibility);
		document.addEventListener("click", onClick, true);
		document.addEventListener("auxclick", onClick, true);
		window.addEventListener("pagehide", reportEngagement);
		window.addEventListener("pageshow", onPageShow);
		window.addEventListener("storage", onStorage);
		return () => {
			unsubscribe();
			window.clearInterval(timer);
			document.removeEventListener("visibilitychange", onVisibility);
			document.removeEventListener("click", onClick, true);
			document.removeEventListener("auxclick", onClick, true);
			window.removeEventListener("pagehide", reportEngagement);
			window.removeEventListener("pageshow", onPageShow);
			window.removeEventListener("storage", onStorage);
		};
	}, [router]);

	return null;
}
