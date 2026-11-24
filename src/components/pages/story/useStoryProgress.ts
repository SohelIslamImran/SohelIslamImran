import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue } from "motion/react";
import { readingProgress, type ReadingProgress } from "./reading-progress";

function hashId() {
	const hash = window.location.hash.slice(1);
	try {
		return decodeURIComponent(hash);
	} catch {
		return hash;
	}
}

/**
 * Which chapter sits on the reading line (28% down the viewport). A chapter
 * hash in the URL wins on load and on `hashchange`; scrolling takes over after.
 */
export function useStoryProgress(chapterIds: string[]) {
	const firstId = chapterIds[0] ?? "";
	const [activeId, setActiveId] = useState(firstId);
	const activeIdRef = useRef(firstId);
	const select = useCallback((id: string) => {
		if (activeIdRef.current === id) return;
		activeIdRef.current = id;
		setActiveId(id);
	}, []);
	const progress = useMotionValue<ReadingProgress>({ index: 0, fraction: 0 });

	useEffect(() => {
		if (!chapterIds.includes(activeIdRef.current)) select(firstId);
	}, [chapterIds, firstId, select]);

	useEffect(() => {
		if (chapterIds.length === 0) return;
		const elements = Array.from(
			new Set(
				chapterIds
					.map((id) => document.getElementById(id))
					.filter((element): element is HTMLElement => element !== null),
			),
		);
		if (elements.length === 0) return;

		let frame: number | null = null;
		let observer: IntersectionObserver | undefined;
		const update = () => {
			const next = readingProgress(
				elements.map((element) => element.getBoundingClientRect()),
				window.innerHeight * 0.28,
			);
			const nextId = elements[next.index].id;
			const previous = progress.get();
			if (next.index !== previous.index || next.fraction !== previous.fraction) progress.set(next);
			select(nextId);
		};
		const schedule = () => {
			if (frame !== null) return;
			frame = requestAnimationFrame(() => {
				frame = null;
				update();
			});
		};
		const syncHash = () => {
			const id = hashId();
			if (id && chapterIds.includes(id)) select(id);
			schedule();
		};

		// The browser can still be smoothing its initial fragment jump when
		// hydration starts. Land on that chapter before the first progress sample.
		const initialHash = hashId();
		elements.find((element) => element.id === initialHash)?.scrollIntoView({ behavior: "instant" });
		syncHash();
		window.addEventListener("hashchange", syncHash);
		window.addEventListener("resize", schedule);
		// Scroll keeps the reading line exact (smooth scrolls and jumps can end
		// without an intersection change); the observer covers layout shifts.
		window.addEventListener("scroll", schedule, { passive: true });
		if (typeof IntersectionObserver === "undefined") {
			schedule();
		} else {
			observer = new IntersectionObserver(schedule, {
				rootMargin: "-18% 0px -62%",
				threshold: 0,
			});
			for (const element of elements) observer.observe(element);
			schedule();
		}

		return () => {
			window.removeEventListener("hashchange", syncHash);
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			observer?.disconnect();
			if (frame !== null) window.cancelAnimationFrame(frame);
		};
	}, [chapterIds, progress, select]);

	return [chapterIds.includes(activeId) ? activeId : firstId, select, progress] as const;
}
