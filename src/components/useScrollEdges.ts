import { useCallback, useEffect, useState, type RefObject } from "react";

export interface ScrollEdges {
	/** The strip scrolls and there is content hidden to the left. */
	canScrollLeft: boolean;
	/** The strip scrolls and there is content hidden to the right. */
	canScrollRight: boolean;
	/** The strip is wider than its container at all. */
	overflows: boolean;
}

const initialEdges: ScrollEdges = { canScrollLeft: false, canScrollRight: false, overflows: false };

export function measureScrollEdges(scrollLeft: number, scrollWidth: number, clientWidth: number) {
	// Sub-pixel layout means a "fully scrolled" strip often reports 0.5px left.
	const epsilon = 1;
	const maxScroll = scrollWidth - clientWidth;
	return {
		overflows: maxScroll > epsilon,
		canScrollLeft: scrollLeft > epsilon,
		canScrollRight: scrollLeft < maxScroll - epsilon,
	};
}

function measure(element: HTMLElement): ScrollEdges {
	return measureScrollEdges(element.scrollLeft, element.scrollWidth, element.clientWidth);
}

/**
 * Tracks whether a horizontally scrollable filter strip is actually clipped on
 * each side. Edge fades and "scroll to see all" hints must be driven by real
 * overflow: showing them unconditionally paints a gradient over the selected
 * chip and advertises scrolling on strips that fit.
 */
export function useScrollEdges(ref: RefObject<HTMLElement | null>): ScrollEdges {
	const [edges, setEdges] = useState<ScrollEdges>(initialEdges);

	const sync = useCallback(() => {
		const element = ref.current;
		if (!element) return;
		const next = measure(element);
		setEdges((current) =>
			current.canScrollLeft === next.canScrollLeft &&
			current.canScrollRight === next.canScrollRight &&
			current.overflows === next.overflows
				? current
				: next,
		);
	}, [ref]);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		sync();
		element.addEventListener("scroll", sync, { passive: true });
		const observer = new ResizeObserver(sync);
		observer.observe(element);
		for (const child of element.children) observer.observe(child);
		window.addEventListener("resize", sync);
		return () => {
			element.removeEventListener("scroll", sync);
			observer.disconnect();
			window.removeEventListener("resize", sync);
		};
	}, [ref, sync]);

	return edges;
}
