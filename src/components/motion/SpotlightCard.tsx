import type { CSSProperties, HTMLAttributes, PointerEvent as ReactPointerEvent, Ref } from "react";
import { cn } from "@/lib/utils";

/**
 * Cursor-following glow + border light. Spread the returned props onto any
 * element (a card, a Link, a tile). Mouse/trackpad only; touch never lights it.
 * Writes CSS variables directly, so moving the pointer never re-renders React.
 */
export function useSpotlight<T extends HTMLElement = HTMLElement>(
	options: {
		/** Diameter of the glow in px. Defaults to 420. */
		size?: number;
		onPointerMove?: (event: ReactPointerEvent<T>) => void;
		onPointerLeave?: (event: ReactPointerEvent<T>) => void;
	} = {},
) {
	const { size, onPointerMove, onPointerLeave } = options;
	return {
		"data-spotlight": "",
		style: size ? ({ "--spotlight-size": `${size}px` } as CSSProperties) : undefined,
		onPointerMove(event: ReactPointerEvent<T>) {
			onPointerMove?.(event);
			if (event.pointerType !== "mouse") return;
			const element = event.currentTarget;
			const rect = element.getBoundingClientRect();
			element.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
			element.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
			if (!element.hasAttribute("data-spotlight-active")) {
				element.setAttribute("data-spotlight-active", "");
			}
		},
		onPointerLeave(event: ReactPointerEvent<T>) {
			onPointerLeave?.(event);
			event.currentTarget.removeAttribute("data-spotlight-active");
		},
	};
}

type SpotlightCardProps = HTMLAttributes<HTMLElement> & {
	as?: "div" | "article" | "section" | "li" | "figure" | "aside";
	/** `surface` (default) is a solid card: hairline, 28px radius, soft shadow. `plain` adds no chrome. */
	variant?: "surface" | "tile" | "plain";
	size?: number;
	ref?: Ref<HTMLElement>;
};

/**
 * A content card with the shared spotlight effect. For a whole-card link, put
 * a stretched `<Link className="after:absolute after:inset-0">` inside.
 */
export function SpotlightCard({
	as = "div",
	variant = "surface",
	size,
	className,
	style,
	onPointerMove,
	onPointerLeave,
	ref,
	...props
}: SpotlightCardProps) {
	const spotlight = useSpotlight<HTMLElement>({ size, onPointerMove, onPointerLeave });
	const Tag = as as "div";
	return (
		<Tag
			data-slot="spotlight-card"
			ref={ref as Ref<HTMLDivElement>}
			{...props}
			data-spotlight=""
			onPointerMove={spotlight.onPointerMove}
			onPointerLeave={spotlight.onPointerLeave}
			style={{ ...spotlight.style, ...style }}
			className={cn(
				variant === "surface" &&
					"min-w-0 rounded-card border border-line bg-surface-solid shadow-raised transition-[box-shadow,border-color,translate] duration-300 ease-trace",
				variant === "tile" &&
					"min-w-0 rounded-tile border border-line bg-surface-solid shadow-raised transition-[box-shadow,border-color,translate] duration-300 ease-trace",
				className,
			)}
		/>
	);
}
