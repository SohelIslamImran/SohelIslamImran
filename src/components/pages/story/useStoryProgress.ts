import { useEffect, useState } from "react";

function closestChapterId(elements: HTMLElement[]) {
	if (elements.length === 0) return "";
	const readingLine = window.innerHeight * 0.28;
	let closest = elements[0];
	let closestDistance = Number.POSITIVE_INFINITY;
	for (const element of elements) {
		const { top, bottom } = element.getBoundingClientRect();
		const distance =
			top <= readingLine && bottom >= readingLine
				? 0
				: top > readingLine
					? top - readingLine
					: readingLine - bottom;
		if (distance < closestDistance) {
			closest = element;
			closestDistance = distance;
		}
	}
	return closest.id;
}

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

	useEffect(() => {
		setActiveId((current) => (chapterIds.includes(current) ? current : firstId));
	}, [chapterIds, firstId]);

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
			const nextId = closestChapterId(elements);
			setActiveId((current) => (current === nextId ? current : nextId));
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
			if (id && chapterIds.includes(id)) setActiveId(id);
			else schedule();
		};

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
	}, [chapterIds]);

	return [chapterIds.includes(activeId) ? activeId : firstId, setActiveId] as const;
}
