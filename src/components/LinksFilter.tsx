import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";

export const linkKinds = ["all", "social", "contact", "work", "story", "other"] as const;
export type LinkKind = (typeof linkKinds)[number];

interface LinksFilterProps {
	value: LinkKind;
	onChange: (value: LinkKind) => void;
}

/**
 * A URL-backed segmented control. It becomes a compact two-row grid on small
 * screens so every category stays discoverable without horizontal scrolling.
 * Motion's layout projection keeps the selected pill moving between targets.
 */
export function LinksFilter({ value, onChange }: LinksFilterProps) {
	const reducedMotion = useReducedMotion();
	const trackRef = useRef<HTMLDivElement>(null);
	const [indicator, setIndicator] = useState<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>(null);
	const indicatorX = useMotionValue(0);
	const indicatorY = useMotionValue(0);
	const indicatorWidth = useMotionValue(0);
	const indicatorHeight = useMotionValue(0);
	const indicatorInitialized = useRef(false);

	useLayoutEffect(() => {
		const track = trackRef.current;
		const active = track?.querySelector<HTMLButtonElement>(`[data-kind="${value}"]`);
		if (!track || !active) return;
		const syncIndicator = () => {
			const trackRect = track.getBoundingClientRect();
			const activeRect = active.getBoundingClientRect();
			setIndicator({
				x: activeRect.left - trackRect.left,
				y: activeRect.top - trackRect.top,
				width: activeRect.width,
				height: activeRect.height,
			});
		};
		syncIndicator();
		if (typeof ResizeObserver !== "undefined") {
			const observer = new ResizeObserver(syncIndicator);
			observer.observe(track);
			return () => observer.disconnect();
		}
		window.addEventListener("resize", syncIndicator);
		return () => window.removeEventListener("resize", syncIndicator);
	}, [value]);

	useLayoutEffect(() => {
		if (!indicator) return;
		const transition =
			!indicatorInitialized.current || reducedMotion
				? { duration: 0 }
				: { type: "spring" as const, duration: 0.32, bounce: 0.08 };
		indicatorInitialized.current = true;
		const controls = [
			animate(indicatorX, indicator.x, transition),
			animate(indicatorY, indicator.y, transition),
			animate(indicatorWidth, indicator.width, transition),
			animate(indicatorHeight, indicator.height, transition),
		];
		return () => controls.forEach((control) => control.stop());
	}, [indicator, indicatorHeight, indicatorWidth, indicatorX, indicatorY, reducedMotion]);
	const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		const index = linkKinds.indexOf(event.currentTarget.dataset.kind as LinkKind);
		const nextIndex =
			event.key === "ArrowRight" || event.key === "ArrowDown"
				? (index + 1) % linkKinds.length
				: event.key === "ArrowLeft" || event.key === "ArrowUp"
					? (index - 1 + linkKinds.length) % linkKinds.length
					: event.key === "Home"
						? 0
						: event.key === "End"
							? linkKinds.length - 1
							: -1;
		if (nextIndex < 0) return;
		event.preventDefault();
		const next = linkKinds[nextIndex];
		onChange(next);
		document.getElementById(`link-filter-${next}`)?.focus();
	};

	return (
		<div
			className="links-filter relative w-full overflow-hidden rounded-[20px] border border-line bg-surface-solid p-1 shadow-[0_18px_40px_var(--theme-shadow)] backdrop-blur-xl"
			role="group"
			aria-label="Link categories"
		>
			<div className="links-filter-track" ref={trackRef}>
				{indicator && (
					<motion.span
						className="links-filter-indicator"
						aria-hidden="true"
						initial={false}
						style={{ x: indicatorX, y: indicatorY, width: indicatorWidth, height: indicatorHeight }}
					/>
				)}
				{linkKinds.map((kind) => (
					<button
						key={kind}
						id={`link-filter-${kind}`}
						type="button"
						className="relative z-10 min-w-0 rounded-[15px] px-3 py-3 text-sm font-semibold capitalize text-muted transition-colors duration-200 ease-route hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-[0.98]"
						aria-pressed={value === kind}
						aria-controls="link-results"
						data-kind={kind}
						onKeyDown={onKeyDown}
						onClick={() => onChange(kind)}
					>
						<span
							className={`relative z-[1]${value === kind ? " text-[var(--theme-picker-ink)]" : ""}`}
						>
							{kind}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}
