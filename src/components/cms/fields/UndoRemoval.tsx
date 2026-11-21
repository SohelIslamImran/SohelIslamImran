export const editorButton =
	"pressable inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[10px] border border-line-strong px-3 text-[13px] font-medium text-foreground hover:bg-muted disabled:opacity-45 pointer-coarse:min-h-11";

export function UndoRemoval({
	label,
	canUndo,
	onUndo,
	onDismiss,
}: {
	label: string;
	canUndo: boolean;
	onUndo: () => void;
	onDismiss: () => void;
}) {
	return (
		<div className="cms-panel fixed inset-x-3 bottom-24 z-(--z-toast) mx-auto flex w-fit max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 p-2 shadow-float lg:bottom-6">
			<p role="status" className="m-0 min-w-0 max-w-[55ch] wrap-anywhere px-2 text-[13px]">
				Removed {label}.{canUndo ? "" : " Make room in the list to undo."}
			</p>
			<button type="button" className={editorButton} onClick={onUndo} disabled={!canUndo}>
				Undo
			</button>
			<button type="button" className={editorButton} onClick={onDismiss}>
				Dismiss
			</button>
		</div>
	);
}
