import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../lib/utils";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { useScrollEdges } from "./useScrollEdges";

interface FilterStripProps<T extends string> {
	/** Stable ids so the label and hint can be wired with aria-labelledby/describedby. */
	labelId: string;
	hintId: string;
	label: string;
	options: readonly T[];
	labels: Record<T, string>;
	value: T;
	onChange: (value: T) => void;
	resultsId?: string;
	className?: string;
}

/**
 * Single-select segmented control shared by /work and /links: a pill track
 * with a raised indicator that glides to the selected option.
 *
 * Owns the roving keyboard navigation (arrows, Home, End), the scroll-into-view
 * of the active option, and the edge fades that only appear when the strip
 * genuinely overflows (narrow screens scroll it sideways).
 */
export function FilterStrip<T extends string>({
	labelId,
	hintId,
	label,
	options,
	labels,
	value,
	onChange,
	resultsId,
	className,
}: FilterStripProps<T>) {
	const stripRef = useRef<HTMLDivElement>(null);
	const previousValueRef = useRef<T>(value);
	const edges = useScrollEdges(stripRef);
	const indicatorId = `filter-indicator-${useId()}`;
	const reduceMotion = useReducedMotion() === true;

	useEffect(() => {
		const strip = stripRef.current;
		const revealActive = () => {
			const active = strip?.querySelector<HTMLElement>('[data-active="true"]');
			if (!strip || !active || strip.clientWidth === 0) return;
			const stripRect = strip.getBoundingClientRect();
			const itemRect = active.getBoundingClientRect();
			if (itemRect.left >= stripRect.left && itemRect.right <= stripRect.right) return;
			strip.scrollTo({
				left:
					strip.scrollLeft +
					itemRect.left -
					stripRect.left -
					(strip.clientWidth - itemRect.width) / 2,
			});
		};
		// Returning to the first option means the empty-result view was just
		// abandoned, so move focus to the control the user is looking at.
		const recovered = previousValueRef.current !== options[0] && value === options[0];
		previousValueRef.current = value;
		revealActive();
		if (recovered) {
			stripRef.current
				?.querySelector<HTMLElement>('[data-active="true"]')
				?.focus({ preventScroll: true });
		}
		window.addEventListener("resize", revealActive);
		return () => window.removeEventListener("resize", revealActive);
	}, [options, value]);

	const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
		const requested =
			event.key === "ArrowRight"
				? index + 1
				: event.key === "ArrowLeft"
					? index - 1
					: event.key === "Home"
						? 0
						: event.key === "End"
							? options.length - 1
							: null;
		if (requested === null) return;

		const nextIndex = Math.min(Math.max(requested, 0), options.length - 1);
		if (nextIndex === index) return;
		event.preventDefault();
		event.stopPropagation();
		stripRef.current
			?.querySelectorAll<HTMLButtonElement>('[data-slot="toggle-group-item"]')
			[nextIndex]?.focus({ preventScroll: true });
		onChange(options[nextIndex]);
	};

	return (
		<div data-slot="filter-strip" className={cn("min-w-0", className)}>
			<div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
				<p className="mono-label m-0 min-w-0 text-muted-foreground" id={labelId}>
					{label}
				</p>
				<p
					className="m-0 flex min-w-0 items-center gap-2 text-caption text-muted-foreground"
					id={hintId}
				>
					<span className="sr-only">
						Selected: {labels[value]}. Use the left and right arrow keys to change the filter.
					</span>
					{edges.overflows ? (
						<span
							aria-hidden="true"
							className="mono-label inline-flex items-center gap-1 md:hidden"
						>
							Swipe for more <span>→</span>
						</span>
					) : null}
				</p>
			</div>
			<div className="relative w-full max-w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)] p-1 shadow-[inset_0_0_0_1px_var(--theme-line)]">
				<div
					aria-hidden="true"
					data-visible={edges.canScrollLeft || undefined}
					className="pointer-events-none absolute inset-y-1 left-1 z-[2] w-8 rounded-l-full bg-[linear-gradient(to_right,color-mix(in_srgb,var(--theme-ink)_5%,var(--theme-paper))_30%,transparent)] opacity-0 transition-opacity duration-200 data-[visible]:opacity-100"
				/>
				<div
					aria-hidden="true"
					data-visible={edges.canScrollRight || undefined}
					className="pointer-events-none absolute inset-y-1 right-1 z-[2] w-8 rounded-r-full bg-[linear-gradient(to_left,color-mix(in_srgb,var(--theme-ink)_5%,var(--theme-paper))_30%,transparent)] opacity-0 transition-opacity duration-200 data-[visible]:opacity-100"
				/>
				<ToggleGroup
					value={[value]}
					onValueChange={(next) => {
						const chosen = next[0];
						if (chosen && (options as readonly string[]).includes(chosen)) {
							onChange(chosen as T);
						}
					}}
					aria-describedby={hintId}
					aria-labelledby={labelId}
					ref={stripRef}
					className="flex w-full min-w-0 max-w-full flex-nowrap gap-0.5 overflow-x-auto overscroll-x-contain rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					spacing={0}
				>
					{options.map((option) => {
						const selected = value === option;
						return (
							<ToggleGroupItem
								key={option}
								value={option}
								data-active={selected ? "true" : undefined}
								aria-pressed={selected}
								aria-describedby={hintId}
								aria-controls={resultsId}
								className={cn(
									"relative isolate h-auto min-h-11 min-w-fit flex-1 basis-auto scroll-mx-6 rounded-full! border-0 bg-transparent px-4! text-center text-[14px] font-medium whitespace-nowrap text-muted-foreground shadow-none",
									"transition-[color,transform,translate,scale] duration-200 ease-trace hover:bg-transparent hover:text-foreground active:scale-[.97]",
									"aria-pressed:bg-transparent aria-pressed:text-foreground aria-pressed:shadow-none data-[pressed]:bg-transparent",
									"focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
								)}
								onKeyDown={(event) => moveFocus(event, options.indexOf(option))}
							>
								{selected ? (
									<motion.span
										aria-hidden="true"
										layoutId={indicatorId}
										className="pointer-events-none absolute inset-0 z-0 rounded-full bg-surface-solid shadow-[0_1px_2px_var(--theme-shadow-soft),0_4px_14px_var(--theme-shadow),inset_0_0_0_1px_var(--theme-line)] dark:bg-[color-mix(in_srgb,var(--theme-ink)_14%,var(--theme-surface-solid))]"
										transition={
											reduceMotion
												? { duration: 0 }
												: { type: "spring", duration: 0.34, bounce: 0.08 }
										}
									/>
								) : null}
								<span className="relative z-[1]">{labels[option]}</span>
							</ToggleGroupItem>
						);
					})}
				</ToggleGroup>
			</div>
		</div>
	);
}
