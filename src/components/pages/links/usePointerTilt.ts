import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { prefersReducedMotion } from "@/components/motion";

/**
 * Pointer position over an element as CSS variables, for tilt and light:
 *
 *   --pt-x / --pt-y   -0.5 … 0.5 from the element's center
 *   --pt-lx / --pt-ly where the light sits, in %
 *   data-tilting      present while a mouse is over it
 *
 * Mouse and trackpad only; touch and keyboard see a still element and the CSS
 * gives them their own press/focus state. Writes variables, never React state,
 * so moving the pointer never re-renders. Reduced motion: nothing happens.
 */
export function usePointerTilt<T extends HTMLElement = HTMLElement>() {
	const frame = useRef(0);
	return {
		onPointerMove(event: ReactPointerEvent<T>) {
			if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
			const element = event.currentTarget;
			const { clientX, clientY } = event;
			cancelAnimationFrame(frame.current);
			frame.current = requestAnimationFrame(() => {
				const rect = element.getBoundingClientRect();
				if (!rect.width || !rect.height) return;
				const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
				const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
				element.style.setProperty("--pt-x", (x - 0.5).toFixed(3));
				element.style.setProperty("--pt-y", (y - 0.5).toFixed(3));
				element.style.setProperty("--pt-lx", `${(x * 100).toFixed(1)}%`);
				element.style.setProperty("--pt-ly", `${(y * 100).toFixed(1)}%`);
				if (!element.hasAttribute("data-tilting")) element.setAttribute("data-tilting", "");
			});
		},
		onPointerLeave(event: ReactPointerEvent<T>) {
			cancelAnimationFrame(frame.current);
			const element = event.currentTarget;
			element.removeAttribute("data-tilting");
			for (const name of ["--pt-x", "--pt-y", "--pt-lx", "--pt-ly"]) {
				element.style.removeProperty(name);
			}
		},
	};
}
