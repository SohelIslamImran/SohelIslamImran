import { useEffect, type RefObject } from "react";

/*
 * Drives a poster's 3D planes by writing CSS variables on the poster element
 * (never React state, so moving never re-renders):
 *
 *   --wp-rx / --wp-ry   stage rotation in deg
 *   --wp-lx / --wp-ly   where the light sits, in %
 *   data-tilt           present while a pointer or the device is steering it
 *
 * - Mouse / pen: tilt follows the pointer over the host card
 *   (`[data-poster-host]`, or the poster itself) and the light follows it.
 * - Touch: a gentle tilt from the poster's position while scrolling, and
 *   device orientation where the browser allows it without a permission prompt.
 * - Keyboard: CSS separates the planes on `:focus-within` (see poster-styles).
 * - Reduced motion: nothing runs.
 *
 * Listeners only attach while the poster is near the viewport.
 */

const MAX_X = 7;
const MAX_Y = 9;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function setTilt(element: HTMLElement, rx: number, ry: number, lx: number, ly: number) {
	element.style.setProperty("--wp-rx", `${rx.toFixed(2)}deg`);
	element.style.setProperty("--wp-ry", `${ry.toFixed(2)}deg`);
	element.style.setProperty("--wp-lx", `${lx.toFixed(1)}%`);
	element.style.setProperty("--wp-ly", `${ly.toFixed(1)}%`);
}

function clearTilt(element: HTMLElement) {
	for (const name of ["--wp-rx", "--wp-ry", "--wp-lx", "--wp-ly"]) {
		element.style.removeProperty(name);
	}
	element.removeAttribute("data-tilt");
}

export function useDepthTilt(ref: RefObject<HTMLElement | null>, enabled = true) {
	useEffect(() => {
		const poster = ref.current;
		if (!poster || !enabled || typeof window === "undefined") return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
		let stop: (() => void) | null = null;
		const sync = () => {
			stop?.();
			stop = reduce.matches ? null : start(poster);
		};
		sync();
		// Turning reduced motion on mid-visit detaches everything and flattens the poster at once.
		reduce.addEventListener("change", sync);
		return () => {
			reduce.removeEventListener("change", sync);
			stop?.();
		};
	}, [ref, enabled]);
}

function start(poster: HTMLElement): () => void {
	const host = poster.closest<HTMLElement>("[data-poster-host]") ?? poster;
	const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

	let frame = 0;
	let near = false;
	let orientationSeen = false;
	const schedule = (work: () => void) => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(work);
	};

	const onPointerMove = (event: PointerEvent) => {
		if (event.pointerType === "touch") return;
		const { clientX, clientY } = event;
		schedule(() => {
			const rect = poster.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) return;
			const x = clamp((clientX - rect.left) / rect.width, -0.2, 1.2);
			const y = clamp((clientY - rect.top) / rect.height, -0.2, 1.2);
			poster.setAttribute("data-tilt", "");
			setTilt(poster, (0.5 - y) * 2 * MAX_X, (x - 0.5) * 2 * MAX_Y, x * 100, y * 100);
		});
	};
	const onPointerLeave = () => {
		cancelAnimationFrame(frame);
		clearTilt(poster);
	};

	const onScroll = () => {
		if (!near || orientationSeen) return;
		schedule(() => {
			const rect = poster.getBoundingClientRect();
			const viewport = window.innerHeight || 1;
			// -1 when the poster is at the bottom of the screen, 1 at the top.
			const offset = clamp((viewport / 2 - (rect.top + rect.height / 2)) / (viewport / 2), -1, 1);
			poster.setAttribute("data-tilt", "");
			setTilt(poster, offset * -MAX_X * 0.6, 0, 50, 30 - offset * 30);
		});
	};

	let baseBeta: number | null = null;
	const onOrientation = (event: DeviceOrientationEvent) => {
		if (!near || event.beta === null || event.gamma === null) return;
		orientationSeen = true;
		if (baseBeta === null) baseBeta = event.beta;
		const beta = event.beta;
		const gamma = event.gamma;
		schedule(() => {
			const rx = clamp(((baseBeta ?? beta) - beta) * 0.35, -MAX_X, MAX_X);
			const ry = clamp(gamma * 0.35, -MAX_Y, MAX_Y);
			poster.setAttribute("data-tilt", "");
			setTilt(poster, rx, ry, 50 + (ry / MAX_Y) * 40, 40 - (rx / MAX_X) * 30);
		});
	};
	const OrientationEvent = (
		window as Window & {
			DeviceOrientationEvent?: { requestPermission?: unknown };
		}
	).DeviceOrientationEvent;
	// iOS asks for permission first; there we keep the scroll tilt instead of prompting.
	const orientationAllowed =
		!finePointer && !!OrientationEvent && typeof OrientationEvent.requestPermission !== "function";

	const attach = () => {
		if (finePointer) {
			host.addEventListener("pointermove", onPointerMove, { passive: true });
			host.addEventListener("pointerleave", onPointerLeave);
		} else {
			window.addEventListener("scroll", onScroll, { passive: true });
			if (orientationAllowed) window.addEventListener("deviceorientation", onOrientation);
			onScroll();
		}
	};
	const detach = () => {
		cancelAnimationFrame(frame);
		host.removeEventListener("pointermove", onPointerMove);
		host.removeEventListener("pointerleave", onPointerLeave);
		window.removeEventListener("scroll", onScroll);
		window.removeEventListener("deviceorientation", onOrientation);
		clearTilt(poster);
	};

	if (typeof IntersectionObserver === "undefined") {
		near = true;
		attach();
		return detach;
	}
	const observer = new IntersectionObserver(
		([entry]) => {
			const next = entry?.isIntersecting ?? false;
			if (next === near) return;
			near = next;
			if (near) attach();
			else detach();
		},
		{ rootMargin: "80px" },
	);
	observer.observe(poster);
	return () => {
		observer.disconnect();
		detach();
	};
}
