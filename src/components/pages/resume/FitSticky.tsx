import { useEffect, useRef, type HTMLAttributes } from "react";

/**
 * Sticky that never hides part of itself: when the block fits under the dock
 * it pins there (`--fit-top`); when it is taller than the viewport it is not
 * pinned at all (`data-unpinned`) and scrolls with the page, so its top is
 * never trapped under the dock. The server render uses the plain top offset.
 */
export function FitSticky({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
	const ref = useRef<HTMLElement>(null);
	useEffect(() => {
		const element = ref.current;
		if (!element || typeof ResizeObserver === "undefined") return;
		const update = () => {
			const dock = parseFloat(getComputedStyle(element).getPropertyValue("--dock-space-top"));
			const top = (Number.isFinite(dock) ? dock : 76) + 16;
			const fits = element.offsetHeight + top + 16 <= window.innerHeight;
			element.style.setProperty("--fit-top", `${top}px`);
			element.toggleAttribute("data-unpinned", !fits);
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(element);
		window.addEventListener("resize", update);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", update);
		};
	}, []);
	return (
		<section ref={ref} className={className} {...props}>
			{children}
		</section>
	);
}
