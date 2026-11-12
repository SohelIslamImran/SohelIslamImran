import { useEffect, type RefObject } from "react";

/**
 * Writes `--hero-p` (0 → 1 as the hero scrolls out) on the section. CSS uses
 * it for a light parallax hand-off into the next section (motion-safe only).
 * Listens only while the hero is near the viewport; writes at most once per
 * frame.
 */
export function useHeroScroll(ref: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		let frame = 0;
		let listening = false;
		let lastValue = -1;

		const update = () => {
			frame = 0;
			const rect = element.getBoundingClientRect();
			const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height * 0.85)));
			const rounded = Math.round(progress * 1000) / 1000;
			if (rounded === lastValue) return;
			lastValue = rounded;
			element.style.setProperty("--hero-p", String(rounded));
		};
		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		const listen = (on: boolean) => {
			if (on === listening) return;
			listening = on;
			if (on) window.addEventListener("scroll", onScroll, { passive: true });
			else window.removeEventListener("scroll", onScroll);
		};

		const observer =
			typeof IntersectionObserver === "undefined"
				? null
				: new IntersectionObserver(
						([entry]) => {
							listen(entry?.isIntersecting ?? false);
							onScroll();
						},
						{ rootMargin: "120px" },
					);
		if (observer) observer.observe(element);
		else listen(true);
		update();

		return () => {
			observer?.disconnect();
			listen(false);
			if (frame) cancelAnimationFrame(frame);
		};
	}, [ref]);
}
