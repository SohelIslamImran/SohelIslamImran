import { useEffect, type RefObject } from "react";

/** Fade only the edges with more content beyond the visible scroll area. */
export function useScrollFade(ref: RefObject<HTMLElement | null>, contentKey?: unknown) {
	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		const update = () => {
			element.toggleAttribute("data-scroll-start", element.scrollTop > 1);
			element.toggleAttribute(
				"data-scroll-end",
				element.scrollHeight - element.clientHeight - element.scrollTop > 1,
			);
		};
		const observer = new ResizeObserver(update);
		observer.observe(element);
		for (const child of element.children) observer.observe(child);
		element.addEventListener("scroll", update, { passive: true });
		update();
		return () => {
			observer.disconnect();
			element.removeEventListener("scroll", update);
		};
	}, [ref, contentKey]);
}
