import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { REDUCED, SPRING_SURFACE } from "../motion";

export const editorButton = "cms-editor-button cms-press";

/**
 * "Removed X. Undo" toast at the bottom of the screen. It is portalled to
 * the CMS root so a transformed ancestor (an animating row or pane) cannot
 * capture its fixed position, and it animates out when `removal` clears.
 */
export function UndoRemoval({
	removal,
	onUndo,
	onDismiss,
}: {
	removal: { label: string; canUndo: boolean } | null;
	onUndo: () => void;
	onDismiss: () => void;
}) {
	const reduced = useReducedMotion();
	const [host, setHost] = useState<HTMLElement | null>(null);
	useEffect(() => setHost(document.querySelector<HTMLElement>(".cms-root") ?? document.body), []);
	if (!host) return null;
	return createPortal(
		<AnimatePresence>
			{removal ? (
				<motion.div
					key="undo"
					initial={{ opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.98 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{
						opacity: 0,
						y: reduced ? 0 : 10,
						scale: reduced ? 1 : 0.98,
						pointerEvents: "none",
						transition: reduced ? REDUCED : { duration: 0.16, ease: [0.55, 0, 1, 0.45] },
					}}
					transition={reduced ? REDUCED : SPRING_SURFACE}
					className="cms-panel cms-undo fixed inset-x-3 bottom-24 z-(--z-toast) mx-auto flex w-fit max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 p-2 shadow-float lg:bottom-6"
				>
					<p role="status" className="m-0 min-w-0 max-w-[55ch] wrap-anywhere px-2 text-[13px]">
						Removed {removal.label}.{removal.canUndo ? "" : " Make room in the list to undo."}
					</p>
					<button
						type="button"
						className={`${editorButton} cms-editor-primary`}
						onClick={onUndo}
						disabled={!removal.canUndo}
					>
						Undo
					</button>
					<button type="button" className={editorButton} onClick={onDismiss}>
						Dismiss
					</button>
				</motion.div>
			) : null}
		</AnimatePresence>,
		host,
	);
}
