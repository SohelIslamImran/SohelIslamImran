import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
	const media = window.matchMedia(QUERY);
	media.addEventListener("change", onChange);
	return () => media.removeEventListener("change", onChange);
}

/**
 * `prefers-reduced-motion`, kept current while the CMS is open. Motion's
 * `useReducedMotion` reads the setting once per mount, so a shell that stays
 * mounted would keep animating after the owner turns reduced motion on.
 */
export function useLiveReducedMotion(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(QUERY).matches,
		() => false,
	);
}
