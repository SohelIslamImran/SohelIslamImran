import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useOffscreenPause } from "./hooks";

interface MarqueeProps {
	children: ReactNode;
	/** Seconds for one full loop. Larger is slower. Defaults to 40. */
	duration?: number;
	/** CSS length between items and between the two copies. Defaults to "2.5rem". */
	gap?: string;
	reverse?: boolean;
	/** Pause while hovered (focus inside always pauses). Defaults to true. */
	pauseOnHover?: boolean;
	/** Fade both edges. Defaults to true. */
	fade?: boolean;
	className?: string;
	/** Label for the strip (e.g. "Tools I use"). */
	"aria-label"?: string;
}

/**
 * Infinite horizontal strip. Children render once for assistive tech; the
 * visual duplicate is `aria-hidden` and inert. Pauses on hover, focus, and
 * off-screen; under reduced motion it becomes a still, swipeable row.
 */
export function Marquee({
	children,
	duration = 40,
	gap = "2.5rem",
	reverse = false,
	pauseOnHover = true,
	fade = true,
	className,
	"aria-label": ariaLabel,
}: MarqueeProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	useOffscreenPause(rootRef);
	return (
		<div
			ref={rootRef}
			data-slot="marquee"
			data-reverse={reverse || undefined}
			data-pause-on-hover={pauseOnHover || undefined}
			role={ariaLabel ? "group" : undefined}
			aria-label={ariaLabel}
			className={cn("min-w-0 overflow-hidden", fade && "mask-fade-x", className)}
			style={{ "--marquee-duration": `${duration}s`, "--marquee-gap": gap } as CSSProperties}
		>
			<div data-marquee-part="viewport" className="overflow-hidden">
				<div data-marquee-part="track" className="flex w-max gap-(--marquee-gap)">
					<div className="flex shrink-0 items-center gap-(--marquee-gap)">{children}</div>
					<div
						data-marquee-part="clone"
						aria-hidden="true"
						inert
						className="flex shrink-0 items-center gap-(--marquee-gap)"
					>
						{children}
					</div>
				</div>
			</div>
		</div>
	);
}
