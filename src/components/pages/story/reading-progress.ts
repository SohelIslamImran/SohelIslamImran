export type ReadingProgress = { index: number; fraction: number };

export function readingProgress(
	chapters: { top: number; bottom: number }[],
	line: number,
): ReadingProgress {
	if (chapters.length === 0) return { index: 0, fraction: 0 };

	let index = 0;
	let nearest = Infinity;
	for (const [position, { top, bottom }] of chapters.entries()) {
		const distance = Math.max(top - line, line - bottom, 0);
		if (distance >= nearest) continue;
		index = position;
		nearest = distance;
		if (distance === 0) break;
	}

	const { top, bottom } = chapters[index];
	const fraction =
		bottom > top ? Math.min(1, Math.max(0, (line - top) / (bottom - top))) : Number(line > bottom);
	return { index, fraction };
}
