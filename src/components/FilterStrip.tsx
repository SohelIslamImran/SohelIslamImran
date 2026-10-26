import { useEffect, useRef, type KeyboardEvent } from "react";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { useScrollEdges } from "./useScrollEdges";

const containerClassName =
	"flex w-full min-w-0 max-w-full flex-wrap gap-1 max-[800px]:flex-nowrap max-[800px]:overflow-x-auto overscroll-x-contain scroll-px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const itemClassName =
	"relative isolate flex min-h-11 min-w-0 max-w-full flex-1 basis-0 items-center justify-center rounded-[14px] border-0 bg-transparent !px-3.5 text-center text-[13px] font-medium whitespace-normal break-words text-muted-foreground [overflow-wrap:anywhere] transition-colors duration-200 ease-route hover:bg-muted/70 hover:text-foreground focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none data-[active=true]:z-10 data-[active=true]:text-primary-text aria-pressed:text-primary-text max-[800px]:min-w-[5.5rem] max-[800px]:flex-none max-[800px]:basis-auto max-[800px]:scroll-mx-3 max-[800px]:!px-3";

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
 * Single-select chip filter shared by /work and /links.
 *
 * Owns the roving keyboard navigation, the scroll-into-view of the active chip,
 * and the edge fades that only appear when the strip genuinely overflows. Both
 * call sites previously carried near-verbatim copies of all of that, and had
 * drifted into two different selected-state treatments.
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
		<div className={className}>
			<div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
				<p
					className="m-0 min-w-0 max-w-full break-words text-xs font-extrabold uppercase tracking-[0.11em] text-primary-text [overflow-wrap:anywhere]"
					id={labelId}
				>
					{label}
				</p>
				<p
					className="m-0 flex min-w-0 max-w-full flex-wrap items-center gap-2 break-words text-[11px] font-medium text-muted-foreground [overflow-wrap:anywhere]"
					id={hintId}
				>
					<span>
						Selected: <span className="font-semibold text-foreground">{labels[value]}</span>
					</span>
					{/*
						aria-describedby on the group is not inherited by its buttons, so
						each item references the hint too — otherwise nothing announces
						that the strip is arrow-key navigable.
					*/}
					<span className="sr-only">Use the left and right arrow keys to change the filter.</span>
					{edges.overflows ? (
						<span className="hidden items-center gap-1 font-semibold text-primary-text max-[800px]:inline-flex">
							Scroll to see all <span aria-hidden="true">→</span>
						</span>
					) : null}
				</p>
			</div>
			<div className="relative w-full max-w-full overflow-hidden rounded-[20px] border border-border/60 bg-muted/35 p-1">
				{edges.canScrollLeft ? (
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-y-1 left-1 z-10 hidden w-4 bg-[linear-gradient(to_right,var(--theme-muted-surface),transparent)] max-[800px]:block"
					/>
				) : null}
				{edges.canScrollRight ? (
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-y-1 right-1 z-10 hidden w-4 bg-[linear-gradient(to_left,var(--theme-muted-surface),transparent)] max-[800px]:block"
					/>
				) : null}
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
					className={containerClassName}
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
								className={itemClassName}
								onKeyDown={(event) => moveFocus(event, options.indexOf(option))}
							>
								{selected ? (
									<span
										aria-hidden="true"
										className="pointer-events-none absolute inset-0 z-0 rounded-[14px] bg-primary/10 ring-1 ring-inset ring-primary/20"
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
