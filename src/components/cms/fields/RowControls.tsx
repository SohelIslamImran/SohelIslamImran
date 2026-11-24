import { useActionPointer } from "./FieldFrame";
import { Menu } from "@base-ui/react/menu";
import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";
import {
	ChevronDownIcon,
	ChevronUpIcon,
	DuplicateIcon,
	MoreIcon,
	PlusIcon,
	TrashIcon,
} from "./field-icons";
import { editorButton } from "./UndoRemoval";

/** The one way to add a row, item, or entry: a plus and "Add <thing>". */
export function AddButton({
	children,
	className,
	primary,
	stack,
	...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
	primary?: boolean;
	stack?: boolean;
}) {
	return (
		<button
			type="button"
			{...props}
			className={cn(
				stack ? "cms-stack-add" : cn(editorButton, "cms-add-button"),
				primary && "cms-editor-primary",
				className,
			)}
		>
			<PlusIcon className="size-3.5" />
			{children}
		</button>
	);
}

/**
 * A row's secondary actions behind one "More" button: duplicate, move up,
 * move down, and, set apart at the end, remove. Move items appear only
 * when the row can move.
 */
export function RowMenu({
	label,
	canMoveUp,
	canMoveDown,
	onMoveUp,
	onMoveDown,
	onDuplicate,
	duplicateDisabled,
	onRemove,
	className,
}: {
	label: string;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onDuplicate?: () => void;
	duplicateDisabled?: boolean;
	onRemove?: (touch: boolean) => void;
	className?: string;
}) {
	const movable = canMoveUp || canMoveDown;
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger
				data-row-menu=""
				aria-label={`More actions for ${label}`}
				className={cn("cms-row-tool cms-press", className)}
			>
				<MoreIcon />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner
					side="bottom"
					align="end"
					sideOffset={6}
					className="isolate z-(--z-overlay) outline-none"
				>
					<Menu.Popup className="cms-field-popup cms-menu-popup">
						{onDuplicate ? (
							<MenuItem icon={<DuplicateIcon />} disabled={duplicateDisabled} onClick={onDuplicate}>
								Duplicate
							</MenuItem>
						) : null}
						{movable ? (
							<>
								<MenuItem icon={<ChevronUpIcon />} disabled={!canMoveUp} onClick={onMoveUp}>
									Move up
								</MenuItem>
								<MenuItem icon={<ChevronDownIcon />} disabled={!canMoveDown} onClick={onMoveDown}>
									Move down
								</MenuItem>
							</>
						) : null}
						{onRemove ? (
							<>
								{onDuplicate || movable ? <Menu.Separator className="cms-menu-separator" /> : null}
								<MenuItem icon={<TrashIcon />} destructive onClick={onRemove}>
									Remove
								</MenuItem>
							</>
						) : null}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

function MenuItem({
	icon,
	destructive,
	disabled,
	onClick,
	children,
}: {
	icon: ReactNode;
	destructive?: boolean;
	disabled?: boolean;
	onClick: (touch: boolean) => void;
	children: ReactNode;
}) {
	const pointer = useActionPointer();
	return (
		<Menu.Item
			disabled={disabled}
			onPointerDown={pointer.onPointerDown}
			onClick={(event) => onClick(pointer.isTouchClick(event))}
			data-destructive={destructive || undefined}
			className="cms-menu-item"
		>
			{icon}
			{children}
		</Menu.Item>
	);
}
