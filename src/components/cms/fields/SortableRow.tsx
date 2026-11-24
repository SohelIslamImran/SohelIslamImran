import { Reorder, useDragControls, useIsPresent, type HTMLMotionProps } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { cn } from "../../../lib/utils";
import { REDUCED, SPRING_MOMENTUM, SPRING_MOVE } from "../motion";
import { moveAnnouncement, reorderOffset } from "./row-list";

/**
 * Tracks a row that actually changed position (by drag, Alt+Arrow, or menu)
 * to apply the one-shot `data-settled` tint and a polite status announcement.
 */
export function useReorderFeedback() {
	const [settledKey, setSettledKey] = useState<number | null>(null);
	const [announcement, setAnnouncement] = useState("");
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dragRef = useRef<{ key: number; from: number; label: string } | null>(null);

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);

	const markMoved = useCallback(
		(key: number, label: string, from: number, to: number, total: number) => {
			const message = moveAnnouncement(label, from, to, total);
			if (!message) return;
			setSettledKey(key);
			setAnnouncement(message);
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				setSettledKey(null);
			}, 600);
		},
		[],
	);

	const startDrag = useCallback((key: number, from: number, label: string) => {
		dragRef.current = { key, from, label };
	}, []);

	const endDrag = useCallback(
		(keys: readonly number[], resolveLabel?: (index: number) => string) => {
			const drag = dragRef.current;
			dragRef.current = null;
			if (!drag) return;
			const to = keys.indexOf(drag.key);
			if (to < 0) return;
			markMoved(
				drag.key,
				resolveLabel ? resolveLabel(to) : drag.label,
				drag.from,
				to,
				keys.length,
			);
		},
		[markMoved],
	);

	return { settledKey, announcement, markMoved, startDrag, endDrag };
}

export function SortableRow({
	value,
	reorderable,
	label,
	settled,
	children,
	className,
	onMove,
	onDragStart,
	onDragEnd,
	...props
}: Omit<HTMLMotionProps<"li">, "value" | "children" | "onKeyDown" | "onDragStart" | "onDragEnd"> & {
	value: string | number;
	label: string;
	settled?: boolean;
	onMove?: (offset: -1 | 1) => void;
	onDragStart?: () => void;
	onDragEnd?: () => void;
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
			tabIndex={-1}
			layout="position"
			value={value}
			drag={reorderable ? "y" : false}
			dragListener={false}
			dragControls={controls}
			dragMomentum={false}
			dragSnapToOrigin
			dragElastic={0.08}
			whileDrag={reduced ? undefined : { scale: 1.01 }}
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
			onDragStart={() => {
				setDragging(true);
				onDragStart?.();
			}}
			onDragEnd={() => {
				setDragging(false);
				onDragEnd?.();
			}}
			inert={!present}
			data-dragging={dragging || undefined}
			data-settled={settled || undefined}
			className={cn("cms-sortable-row", className)}
		>
			{children(handle)}
		</Reorder.Item>
	);
}
