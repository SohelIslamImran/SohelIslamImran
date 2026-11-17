import { useEffect, useState, type RefObject } from "react";

/**
 * True while the element is (nearly) on screen and the tab is visible. Starts
 * false so the server and the hydration render agree; loops key off it so they
 * never run off-screen.
 */
export function useOnScreen(ref: RefObject<Element | null>, rootMargin = "80px"): boolean {
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		if (typeof IntersectionObserver === "undefined") {
			setVisible(true);
			return;
		}
		let intersecting = false;
		const apply = () => setVisible(intersecting && document.visibilityState === "visible");
		const observer = new IntersectionObserver(
			([entry]) => {
				intersecting = entry?.isIntersecting ?? false;
				apply();
			},
			{ rootMargin },
		);
		observer.observe(element);
		document.addEventListener("visibilitychange", apply);
		return () => {
			observer.disconnect();
			document.removeEventListener("visibilitychange", apply);
		};
	}, [ref, rootMargin]);
	return visible;
}

/** Resolves after `ms`, or rejects with an AbortError when `signal` aborts. */
export function wait(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException("Aborted", "AbortError"));
			return;
		}
		const timer = window.setTimeout(resolve, ms);
		signal.addEventListener(
			"abort",
			() => {
				window.clearTimeout(timer);
				reject(new DOMException("Aborted", "AbortError"));
			},
			{ once: true },
		);
	});
}

export function isAbort(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}
