import { useEffect, useState, type RefObject } from "react";

const MARGIN = 120;

/** Request timers need a React signal as well as the stack's CSS pause. */
export function useRunVisibility(ref: RefObject<HTMLElement | null>, enabled: boolean): boolean {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const element = ref.current;
		if (!element || !enabled) return;
		const rect = element.getBoundingClientRect();
		let inRange =
			rect.bottom >= -MARGIN &&
			rect.top <= window.innerHeight + MARGIN &&
			rect.right >= -MARGIN &&
			rect.left <= window.innerWidth + MARGIN;
		const update = () => setVisible(inRange && document.visibilityState !== "hidden");
		const observer =
			typeof IntersectionObserver === "undefined"
				? null
				: new IntersectionObserver(
						([entry]) => {
							if (!entry) return;
							inRange = entry.isIntersecting;
							update();
						},
						{ rootMargin: `${MARGIN}px` },
					);
		if (!observer) inRange = true;
		observer?.observe(element);
		update();
		document.addEventListener("visibilitychange", update);
		return () => {
			observer?.disconnect();
			document.removeEventListener("visibilitychange", update);
		};
	}, [ref, enabled]);

	return visible;
}
