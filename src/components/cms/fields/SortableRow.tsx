import { Reorder, useDragControls, useIsPresent, type HTMLMotionProps } from "motion/react";
import { useState, type ReactNode } from "react";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { cn } from "../../../lib/utils";
import { REDUCED, SPRING_MOMENTUM, SPRING_MOVE } from "../motion";
import { reorderOffset } from "./row-list";

export function SortableRow({
	value,
	reorderable,
	label,
	children,
	className,
	onMove,
	...props
}: Omit<HTMLMotionProps<"li">, "value" | "children" | "onKeyDown"> & {
	value: string | number;
	label: string;
	onMove?: (offset: -1 | 1) => void;
	reorderable: boolean;
	children: (handle: ReactNode) => ReactNode;
}) {
	const controls = useDragControls();
	const reduced = useLiveReducedMotion();
	const present = useIsPresent();
	const [dragging, setDragging] = useState(false);
	const handle = reorderable ? (
		<button
			type="button"
			data-row-handle=""
			className="cms-drag-handle"
			aria-label={`Reorder ${label}`}
			aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
			title="Drag to reorder, or use Alt and the arrow keys"
			onPointerDown={(event) => {
				if (event.button === 0) controls.start(event, { distanceThreshold: 2 });
			}}
		>
			<span aria-hidden="true" />
		</button>
	) : null;

	return (
		<Reorder.Item
			{...props}
			layout="position"
			value={value}
			drag={reorderable ? "y" : false}
			dragListener={false}
			dragControls={controls}
			dragMomentum={false}
			dragSnapToOrigin
			dragElastic={0.08}
			dragTransition={{
				bounceStiffness: 480,
				bounceDamping: 36,
				// Motion applies the zero-duration transition after release only.
				...(reduced && { duration: 0 }),
			}}
			onKeyDown={(event) => {
				const offset = reorderOffset(event);
				if (!offset || !onMove) return;
				event.preventDefault();
				onMove(offset);
			}}
			initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: reduced ? 1 : 0.97, pointerEvents: "none" }}
			transition={
				reduced ? { ...REDUCED, layout: { duration: 0 } } : dragging ? SPRING_MOMENTUM : SPRING_MOVE
			}
			onDragStart={() => setDragging(true)}
			onDragEnd={() => setDragging(false)}
			inert={!present}
			data-dragging={dragging || undefined}
			className={cn("cms-sortable-row", className)}
		>
			{children(handle)}
		</Reorder.Item>
	);
}
