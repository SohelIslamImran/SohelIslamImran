import { useEffect, useRef, type CSSProperties, type HTMLAttributes, type Ref } from "react";
import { isInViewport, prefersReducedMotion } from "./hooks";

export type RevealTag =
	| "div"
	| "section"
	| "article"
	| "aside"
	| "header"
	| "footer"
	| "figure"
	| "li"
	| "ul"
	| "ol"
	| "p"
	| "span";

type RevealBaseProps = HTMLAttributes<HTMLElement> & {
	/** Element to render. Defaults to `div`. */
	as?: RevealTag;
	/** Delay before the reveal starts, in ms. */
	delay?: number;
	/** Rise distance in px. Defaults to 14. */
	y?: number;
	ref?: Ref<HTMLElement>;
};

function useRevealAttribute(
	attribute: "data-reveal" | "data-stagger",
	elementRef: React.RefObject<HTMLElement | null>,
	prepare?: (element: HTMLElement) => void,
) {
	useEffect(() => {
		const element = elementRef.current;
		if (!element || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
		// Anything the visitor can already see stays put: no flash, no shift.
		if (isInViewport(element, window.innerHeight * 0.06)) return;
		prepare?.(element);
		element.setAttribute(attribute, "pending");
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				element.setAttribute(attribute, "in");
				observer.disconnect();
			},
			{ rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
		);
		observer.observe(element);
		return () => {
			observer.disconnect();
			if (element.getAttribute(attribute) === "pending") element.removeAttribute(attribute);
		};
	}, [attribute, elementRef, prepare]);
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
	if (typeof ref === "function") ref(value);
	else if (ref) (ref as React.RefObject<T>).current = value;
}

/**
 * Fades, lifts, and un-blurs its content the first time it scrolls into view.
 * Server output is fully visible; only elements below the fold at hydration are
 * hidden and then revealed, and reduced motion skips the effect entirely.
 */
export function Reveal({ as = "div", delay = 0, y, style, ref, ...props }: RevealBaseProps) {
	const elementRef = useRef<HTMLElement | null>(null);
	useRevealAttribute("data-reveal", elementRef);
	const Tag = as as "div";
	return (
		<Tag
			ref={(node: HTMLElement | null) => {
				elementRef.current = node;
				assignRef(ref, node);
			}}
			style={
				{
					...(delay ? { "--reveal-delay": `${delay}ms` } : null),
					...(y !== undefined ? { "--reveal-y": `${y}px` } : null),
					...style,
				} as CSSProperties
			}
			{...props}
		/>
	);
}

type StaggerProps = RevealBaseProps & {
	/** Delay between children in ms (40–70 reads best). Defaults to 55. */
	step?: number;
	/** Children after this index share the last delay. Defaults to 10. */
	maxSteps?: number;
};

/**
 * Reveals its direct children one after another. Same SSR and reduced-motion
 * guarantees as `Reveal`. Use on grids and lists.
 */
export function Stagger({
	as = "div",
	delay = 0,
	y,
	step = 55,
	maxSteps = 10,
	style,
	ref,
	...props
}: StaggerProps) {
	const elementRef = useRef<HTMLElement | null>(null);
	const prepareRef = useRef((element: HTMLElement) => {
		Array.from(element.children).forEach((child, index) => {
			(child as HTMLElement).style.setProperty(
				"--stagger-index",
				String(Math.min(index, maxSteps)),
			);
		});
	});
	useRevealAttribute("data-stagger", elementRef, prepareRef.current);
	const Tag = as as "div";
	return (
		<Tag
			ref={(node: HTMLElement | null) => {
				elementRef.current = node;
				assignRef(ref, node);
			}}
			style={
				{
					"--stagger-step": `${step}ms`,
					...(delay ? { "--reveal-delay": `${delay}ms` } : null),
					...(y !== undefined ? { "--reveal-y": `${y}px` } : null),
					...style,
				} as CSSProperties
			}
			{...props}
		/>
	);
}
