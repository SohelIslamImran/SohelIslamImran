import { useRef, type CSSProperties, type ReactNode } from "react";
import { useOffscreenPause } from "../motion/hooks";
import { cn } from "@/lib/utils";

export interface TraceStackLayer {
	label: string;
	/** Small mono note under the label (e.g. "✓", "no route"). */
	note?: string;
	tone?: "default" | "accent" | "error" | "muted";
}

/**
 * A stack of translucent planes in real CSS 3D: the interface on top, the layers
 * behind it below. A lit node pulses down through them (paused off-screen,
 * still under reduced motion). Hovering, focusing inside `data-open` hosts, or
 * `open` spreads the stack apart so you can look behind the interface.
 *
 * `lostAt` marks the layer where the request left the path: its node sits
 * outside the plane, and moves back in while `rerouting` is true.
 * Decorative: the surrounding text says the same thing.
 */
export function TraceStack({
	layers,
	lostAt,
	pausedAt,
	rerouting = false,
	open = false,
	className,
	children,
}: {
	layers: readonly TraceStackLayer[];
	lostAt?: number;
	pausedAt?: number;
	rerouting?: boolean;
	open?: boolean;
	className?: string;
	children?: ReactNode;
}) {
	const ref = useRef<HTMLDivElement>(null);
	useOffscreenPause(ref);
	const stopAt = lostAt ?? pausedAt;
	return (
		<div
			ref={ref}
			aria-hidden="true"
			data-slot="trace-stack"
			data-open={open || undefined}
			data-rerouting={rerouting || undefined}
			className={cn("trace-stack relative", className)}
			style={{ "--count": layers.length } as CSSProperties}
		>
			<div className="trace-stack__rig">
				{layers.map((layer, index) => {
					const reached = stopAt === undefined || index <= stopAt;
					return (
						<div
							key={layer.label}
							className="trace-stack__plane"
							data-tone={layer.tone ?? "default"}
							data-first={index === 0 || undefined}
							style={{ "--i": index } as CSSProperties}
						>
							{index === 0 ? (
								<span className="trace-stack__chrome">
									<i />
									<i />
									<i />
								</span>
							) : null}
							<span className="trace-stack__label">
								<span>{layer.label}</span>
								{layer.note ? <span className="trace-stack__note">{layer.note}</span> : null}
							</span>
							{reached && index !== lostAt ? (
								<span
									className="trace-stack__node"
									data-stopped={index === pausedAt || undefined}
								/>
							) : null}
							{index === lostAt ? (
								<span className="trace-stack__lost">
									<span className="trace-stack__lost-line" />
									<span className="trace-stack__lost-dot" />
								</span>
							) : null}
						</div>
					);
				})}
			</div>
			{children}
		</div>
	);
}

/** @deprecated Kept for older imports; the status pages use `TraceStack`. */
export function StatusScene({
	variant,
	className,
}: {
	variant: "lost" | "paused";
	className?: string;
}) {
	return variant === "lost" ? (
		<TraceStack
			className={cn("h-[240px] w-full", className)}
			lostAt={1}
			layers={[
				{ label: "Interface", note: "✓" },
				{ label: "Router", note: "no route", tone: "error" },
				{ label: "API", tone: "muted" },
				{ label: "Data", tone: "muted" },
			]}
		/>
	) : (
		<TraceStack
			className={cn("h-[240px] w-full", className)}
			pausedAt={2}
			layers={[
				{ label: "Interface", note: "✓" },
				{ label: "Router", note: "✓" },
				{ label: "Loader", note: "paused", tone: "accent" },
				{ label: "Data", tone: "muted" },
			]}
		/>
	);
}
