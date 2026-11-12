import { useEffect, useRef, type HTMLAttributes } from "react";

/**
 * Sticky that never hides part of itself: when the block fits under the dock
 * it pins to the top; when it is taller than the viewport it scrolls with the
 * page until its bottom reaches the viewport, then pins there. Writes one CSS
 * variable (`--fit-top`); the server render uses the plain top offset.
 */
export function FitSticky({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
	const ref = useRef<HTMLElement>(null);
	useEffect(() => {
		const element = ref.current;
		if (!element || typeof ResizeObserver === "undefined") return;
		const update = () => {
			const dock = parseFloat(getComputedStyle(element).getPropertyValue("--dock-space-top"));
			const dockTop = (Number.isFinite(dock) ? dock : 76) + 16;
			const overflow = window.innerHeight - element.offsetHeight - 24;
			element.style.setProperty("--fit-top", `${Math.min(dockTop, overflow)}px`);
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
