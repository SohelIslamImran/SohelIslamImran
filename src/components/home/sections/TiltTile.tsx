import { useRef, type HTMLAttributes, type PointerEvent as ReactPointerEvent } from "react";
import { prefersReducedMotion, useSpotlight } from "@/components/motion";
import { cn } from "@/lib/utils";

type TiltTileProps = HTMLAttributes<HTMLElement> & {
	as?: "div" | "article" | "section" | "figure";
	/** Maximum tilt in degrees. */
	max?: number;
	/**
	 * Classes for the grid cell that holds the tile (spans, order). The cell
	 * is a separate element so reveal transitions on it never delay the tilt.
	 */
	frameClassName?: string;
};

/**
 * A bento tile that leans toward a mouse pointer and shifts its
 * `[data-par]` children (1, 2, 3, or -2) by different amounts, so the content reads as
 * layers at different distances. Mouse/trackpad only (touch and keyboard see
 * a still tile); the CSS (`.depth-tile`) drops the motion under reduced motion.
 * Writes CSS variables, so pointer moves never re-render React.
 */
export function TiltTile({
	as = "article",
	max = 5,
	frameClassName,
	className,
	children,
	...props
}: TiltTileProps) {
	const frame = useRef(0);
	const spotlight = useSpotlight<HTMLElement>();
	const Tag = as as "article";

	const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
		spotlight.onPointerMove(event);
		if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
		const element = event.currentTarget;
		const rect = element.getBoundingClientRect();
		const x = (event.clientX - rect.left) / rect.width - 0.5;
		const y = (event.clientY - rect.top) / rect.height - 0.5;
		cancelAnimationFrame(frame.current);
		frame.current = requestAnimationFrame(() => {
			element.style.setProperty("--tilt-x", `${(-y * max).toFixed(2)}deg`);
			element.style.setProperty("--tilt-y", `${(x * max).toFixed(2)}deg`);
			element.style.setProperty("--par-x", x.toFixed(3));
			element.style.setProperty("--par-y", y.toFixed(3));
			element.setAttribute("data-tilting", "");
		});
	};

	const onPointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
		spotlight.onPointerLeave(event);
		cancelAnimationFrame(frame.current);
		const element = event.currentTarget;
		element.removeAttribute("data-tilting");
		for (const name of ["--tilt-x", "--tilt-y", "--par-x", "--par-y"]) {
			element.style.removeProperty(name);
		}
	};

	return (
		<div className={cn("grid min-w-0", frameClassName)}>
			<Tag
				data-spotlight=""
				{...props}
				onPointerMove={onPointerMove}
				onPointerLeave={onPointerLeave}
				className={cn(
					"depth-tile min-w-0 rounded-tile border border-line bg-surface-solid shadow-raised",
					className,
				)}
			>
				{children}
			</Tag>
		</div>
	);
}
