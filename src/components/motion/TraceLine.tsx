import { useEffect, useRef, type CSSProperties } from "react";
import {
	isMotionValue,
	motion,
	useMotionValue,
	useTransform,
	type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";
import { useOffscreenPause } from "./hooks";

interface TraceLineProps {
	orientation?: "vertical" | "horizontal";
	/**
	 * Bind the lit segment and dot to a 0–1 value (a number or a MotionValue such
	 * as `scrollYProgress`). Omit it for the looping "request travelling" mode.
	 */
	progress?: number | MotionValue<number>;
	/** Seconds per trip in travel mode. Defaults to 3.2. */
	duration?: number;
	/** Seconds before the first trip in travel mode. */
	delay?: number;
	/** Where the dot rests (0–1) under reduced motion in travel mode. Defaults to 0.5. */
	restAt?: number;
	/** Show the faint hairline track. Defaults to true. */
	track?: boolean;
	className?: string;
	style?: CSSProperties;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The signature accent line with a glowing dot. Decorative (`aria-hidden`).
 * Size it with classes: vertical defaults to `h-full w-3`, horizontal to
 * `w-full h-3`. The loop pauses off-screen and stops under reduced motion.
 */
export function TraceLine({
	orientation = "vertical",
	progress,
	duration = 3.2,
	delay,
	restAt = 0.5,
	track = true,
	className,
	style,
}: TraceLineProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const mode = progress === undefined ? "travel" : "progress";
	const fallback = useMotionValue(typeof progress === "number" ? clamp01(progress) : 0);
	useEffect(() => {
		if (typeof progress === "number") fallback.set(clamp01(progress));
	}, [fallback, progress]);
	const source = isMotionValue(progress) ? progress : fallback;
	const runnerOffset = useTransform(source, (value) => `${(clamp01(value) - 1) * 100}%`);
	const litScale = useTransform(source, (value) => clamp01(value));
	useOffscreenPause(rootRef, mode === "travel");
	const vertical = orientation === "vertical";

	return (
		<div
			ref={rootRef}
			data-slot="trace-line"
			data-orientation={orientation}
			data-mode={mode}
			aria-hidden="true"
			className={cn(vertical ? "h-full w-3" : "h-3 w-full", "shrink-0", className)}
			style={
				{
					"--trace-duration": `${duration}s`,
					"--trace-rest": String(clamp01(restAt)),
					...style,
				} as CSSProperties
			}
		>
			{track ? (
				<span
					data-trace-part="track"
					className={cn(
						"absolute bg-line-strong",
						vertical
							? "inset-y-0 left-[calc(50%-0.5px)] w-px"
							: "inset-x-0 top-[calc(50%-0.5px)] h-px",
					)}
				/>
			) : null}
			{mode === "progress" ? (
				<motion.span
					data-trace-part="lit"
					className={cn(
						"absolute bg-[linear-gradient(var(--trace-lit-angle),color-mix(in_srgb,var(--theme-accent-line)_25%,transparent),var(--theme-accent-line))]",
						vertical
							? "inset-y-0 left-[calc(50%-0.75px)] w-[1.5px] origin-top [--trace-lit-angle:180deg]"
							: "inset-x-0 top-[calc(50%-0.75px)] h-[1.5px] origin-left [--trace-lit-angle:90deg]",
					)}
					style={vertical ? { scaleY: litScale } : { scaleX: litScale }}
				/>
			) : null}
			<motion.span
				data-trace-part="runner"
				style={
					mode === "progress"
						? vertical
							? { y: runnerOffset }
							: { x: runnerOffset }
						: delay
							? { animationDelay: `${delay}s` }
							: undefined
				}
			>
				<span data-trace-part="dot" />
			</motion.span>
		</div>
	);
}
