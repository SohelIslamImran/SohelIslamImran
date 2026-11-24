/**
 * Pure geometry for the collapsible Undo removal deck:
 * - Index 0 is the newest (front) card.
 * - Up to two older cards peek behind it when collapsed; deeper cards stay
 *   mounted at opacity 0 so expanding reveals every pending removal.
 * - Optional fine-pointer hover `spread` opens the peek gap by an extra 4 px.
 */
export interface UndoStackSlot {
	y: number;
	scale: number;
	opacity: number;
	interactive: boolean;
}

export function stackSlot(
	index: number,
	count: number,
	expanded: boolean,
	spread = false,
): UndoStackSlot {
	if (expanded || count <= 1 || index <= 0) {
		return { y: 0, scale: 1, opacity: 1, interactive: true };
	}
	const step = spread ? 12 : 8;
	if (index === 1) {
		return { y: -step, scale: 0.97, opacity: 0.9, interactive: false };
	}
	if (index === 2) {
		return { y: -step * 2, scale: 0.94, opacity: 0.75, interactive: false };
	}
	return { y: -step * 2, scale: 0.94, opacity: 0, interactive: false };
}
