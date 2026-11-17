import { useEffect, useSyncExternalStore, type RefObject } from "react";

const noopSubscribe = () => () => {};

/** False during SSR and the hydration render, true afterwards. */
export function useHydrated(): boolean {
	return useSyncExternalStore(
		noopSubscribe,
		() => true,
		() => false,
	);
}

/**
 * Subscribes to a media query. Returns `serverValue` during SSR and hydration,
 * then the live value — so markup never mismatches.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
	return useSyncExternalStore(
		(onChange) => {
			const list = window.matchMedia(query);
			list.addEventListener("change", onChange);
			return () => list.removeEventListener("change", onChange);
		},
		() => window.matchMedia(query).matches,
		() => serverValue,
	);
}

/** True when the user asked for reduced motion (false on the server). */
export function usePrefersReducedMotion(): boolean {
	return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** True for a precise hovering pointer (mouse / trackpad). */
export function usePointerFine(): boolean {
	return useMediaQuery("(hover: hover) and (pointer: fine)");
}

export function prefersReducedMotion(): boolean {
	return (
		typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

/** Whether an element is at least partly inside the viewport right now. */
export function isInViewport(element: Element, bottomInset = 0): boolean {
	const rect = element.getBoundingClientRect();
	const height = window.innerHeight || document.documentElement.clientHeight;
	return rect.top < height - bottomInset && rect.bottom > 0;
}

/**
 * Sets `data-paused` on the element while it is off-screen or the tab is
 * hidden, so CSS loops (`animation-play-state`) stop costing frames.
 */
export function useOffscreenPause(ref: RefObject<HTMLElement | null>, enabled = true) {
	useEffect(() => {
		const element = ref.current;
		if (!element || !enabled || typeof IntersectionObserver === "undefined") return;
		let visible = true;
		const apply = () => {
			if (visible && document.visibilityState === "visible") element.removeAttribute("data-paused");
			else element.setAttribute("data-paused", "");
		};
		const observer = new IntersectionObserver(
			([entry]) => {
				visible = entry?.isIntersecting ?? true;
				apply();
			},
			{ rootMargin: "120px" },
		);
		observer.observe(element);
		document.addEventListener("visibilitychange", apply);
		return () => {
			observer.disconnect();
			document.removeEventListener("visibilitychange", apply);
			element.removeAttribute("data-paused");
		};
	}, [ref, enabled]);
}

/**
 * Runs `onEnter` once when the element first scrolls into view. Returns
 * nothing; if the element is already visible on mount, `onEnter` receives
 * `true` for `wasVisibleOnMount` so callers can skip entrance effects.
 */
export function useEnterViewportOnce(
	ref: RefObject<Element | null>,
	onEnter: (wasVisibleOnMount: boolean) => void | (() => void),
	options: { rootMargin?: string; threshold?: number } = {},
) {
	const { rootMargin = "0px 0px -8% 0px", threshold = 0.01 } = options;
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		if (typeof IntersectionObserver === "undefined") {
			const cleanup = onEnter(true);
			return typeof cleanup === "function" ? cleanup : undefined;
		}
		let cleanup: void | (() => void);
		const visibleOnMount = isInViewport(element);
		if (visibleOnMount) {
			cleanup = onEnter(true);
			return typeof cleanup === "function" ? cleanup : undefined;
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				observer.disconnect();
				cleanup = onEnter(false);
			},
			{ rootMargin, threshold },
		);
		observer.observe(element);
		return () => {
			observer.disconnect();
			if (typeof cleanup === "function") cleanup();
		};
		// `onEnter` is read once per mount on purpose; callers pass inline closures.
	}, [ref, rootMargin, threshold]);
}

/**
 * Sets `data-stuck` on a `position: sticky` element while it is pinned at its
 * `top` offset, so CSS can paint a backdrop above it only while stuck.
 */
export function useStuckAttribute(ref: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		let frame = 0;
		const update = () => {
			frame = 0;
			const style = getComputedStyle(element);
			const top = Number.parseFloat(style.top);
			const stuck =
				style.position === "sticky" &&
				Number.isFinite(top) &&
				Math.abs(element.getBoundingClientRect().top - top) < 1 &&
				window.scrollY > 0;
			element.toggleAttribute("data-stuck", stuck);
		};
		const schedule = () => {
			if (!frame) frame = window.requestAnimationFrame(update);
		};
		update();
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule);
		return () => {
			window.cancelAnimationFrame(frame);
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
		};
	}, [ref]);
}
