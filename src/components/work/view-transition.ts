import type { MouseEvent } from "react";

/*
 * Card → case-study shared-element transition.
 *
 * The poster of the clicked card and the hero poster of the page it opens share
 * one `view-transition-name` (`work-poster`), but only for the length of that
 * navigation: `html[data-work-vt]` switches the names on, and only the clicked
 * poster (`[data-vt-active]`) and the incoming hero (`[data-vt-hero]` without
 * `data-vt-skip`) get it. Theme switches and every other navigation are left
 * alone. The CSS lives in tailwind.css ("depth pass: work").
 *
 * Without View Transitions support, or with reduced motion, this does nothing
 * and navigation is the router's normal one.
 */

let clearTimer: ReturnType<typeof setTimeout> | undefined;

function clear() {
	const root = document.documentElement;
	root.removeAttribute("data-work-vt");
	for (const element of document.querySelectorAll("[data-vt-active],[data-vt-skip]")) {
		element.removeAttribute("data-vt-active");
		element.removeAttribute("data-vt-skip");
	}
}

export function supportsWorkTransition(): boolean {
	return (
		typeof document !== "undefined" &&
		"startViewTransition" in document &&
		!window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

/** Call from a project link's onClick, before the router navigates. */
export function primeWorkTransition(event: MouseEvent<HTMLElement>) {
	if (
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey ||
		!supportsWorkTransition()
	) {
		return;
	}
	clear();
	const host = event.currentTarget.closest("[data-poster-host]");
	const poster = host?.querySelector("[data-vt-poster]");
	if (!poster) return;
	// The page being left may have its own hero; it must not share the name.
	for (const hero of document.querySelectorAll("[data-vt-hero]")) {
		hero.setAttribute("data-vt-skip", "");
	}
	poster.setAttribute("data-vt-active", "");
	document.documentElement.setAttribute("data-work-vt", "");
	clearTimeout(clearTimer);
	clearTimer = setTimeout(clear, 1400);
}
