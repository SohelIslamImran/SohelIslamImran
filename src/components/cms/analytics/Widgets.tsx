import { useRouter } from "@tanstack/react-router";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../../lib/utils";
import type { AnalyticsCount } from "../../../server/analytics.server";
import { REDUCED, SPRING_MOVE, SPRING_SNAPPY } from "../motion";
import { AlertTriangleIcon, CheckCircleIcon } from "../shell/cms-icons";
import type { useLiveVisitors } from "./LiveVisitors";

export const controlClass =
	"cms-press cms-page-focus inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-line-strong bg-surface-solid px-3.5 text-[13px] font-medium text-foreground no-underline shadow-[0_1px_2px_var(--theme-shadow-soft)] hover:border-[color-mix(in_srgb,var(--theme-ink)_28%,transparent)] hover:bg-surface-raised pointer-coarse:min-h-11";

export const visitorDayDescription =
	"Each visitor counts once per UTC day and can count again on another day.";

const numbers = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
export const countLabel = (value: number) => numbers.format(value);

/** Stagger style helper for `.cms-enter` elements. */
export function staggerStyle(index: number): CSSProperties {
	return { "--cms-stagger": index } as CSSProperties;
}

/**
 * Displays a numeric value in `tabular-nums` that smoothly ticks up/down ONLY
 * when its value actually changes after mount (no CountUp replays on load or
 * unchanged polling cycles).
 */
export function TickingNumber({
	value,
	format = countLabel,
	suffix,
	className,
}: {
	value: number | null;
	format?: (value: number) => string;
	suffix?: string;
	className?: string;
}) {
	const reduced = useLiveReducedMotion();
	const prevRef = useRef<number | null | undefined>(undefined);
	const directionRef = useRef<1 | -1>(1);

	if (prevRef.current !== undefined && prevRef.current !== value) {
		if (typeof value === "number" && typeof prevRef.current === "number") {
			directionRef.current = value >= prevRef.current ? 1 : -1;
		} else {
			directionRef.current = 1;
		}
	}

	useEffect(() => {
		prevRef.current = value;
	}, [value]);

	const display = value === null ? "—" : `${format(value)}${suffix ? ` ${suffix}` : ""}`;
	const dir = directionRef.current;

	return (
		<span
			className={cn("relative inline-flex overflow-hidden align-baseline tabular-nums", className)}
		>
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.span
					key={display}
					initial={reduced ? { opacity: 0 } : { opacity: 0, y: dir * 8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={reduced ? { opacity: 0 } : { opacity: 0, y: dir * -8 }}
					transition={reduced ? REDUCED : SPRING_SNAPPY}
					className="inline-block"
				>
					{display}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

/** Gentle <= 1 Hz live status dot, always decorative and kept outside aria-live. */
export function LiveDot({
	active,
	paused = false,
	className,
}: {
	active: boolean;
	paused?: boolean;
	className?: string;
}) {
	return (
		<span
			aria-hidden="true"
			className={cn("relative inline-grid size-2.5 shrink-0 place-items-center", className)}
		>
			{active && !paused ? (
				<span className="cms-live-ring absolute inset-0 rounded-full bg-success/45" />
			) : null}
			<span
				className={cn(
					"relative size-2 rounded-full transition-colors duration-200",
					active && !paused
						? "bg-success"
						: paused
							? "border border-line-strong bg-transparent"
							: "border border-line-strong bg-muted-foreground/35",
				)}
			/>
		</span>
	);
}

export interface SegmentedOption<T extends string> {
	value: T;
	label: string;
	shortLabel?: string;
	badge?: string | number;
	icon?: ReactNode;
}

/**
 * Apple-style segmented control with a sliding `layoutId` pill indicator.
 * State is communicated through surface elevation, border, weight, and an
 * optional subtle active dot — never hue alone.
 */
export function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	layoutId,
	ariaLabel,
	compact = false,
	className,
}: {
	options: readonly SegmentedOption<T>[];
	value: T;
	onChange: (next: T) => void;
	layoutId: string;
	ariaLabel: string;
	compact?: boolean;
	className?: string;
}) {
	const reduced = useLiveReducedMotion();
	return (
		<div role="group" aria-label={ariaLabel} className={cn("cms-seg-track", className)}>
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={active}
						data-active={active ? "true" : "false"}
						data-compact={compact ? "true" : undefined}
						onClick={() => onChange(option.value)}
						className="cms-seg-item shrink-0"
					>
						{active ? (
							<motion.span
								layoutId={layoutId}
								aria-hidden="true"
								transition={reduced ? REDUCED : SPRING_MOVE}
								className="cms-seg-pill"
							/>
						) : null}
						{option.icon ? <span className="shrink-0">{option.icon}</span> : null}
						{option.shortLabel ? (
							<>
								<span className="sm:hidden">{option.shortLabel}</span>
								<span className="hidden sm:inline">{option.label}</span>
							</>
						) : (
							<span>{option.label}</span>
						)}
						{option.badge !== undefined ? (
							<span className="cms-seg-badge" data-active={active ? "true" : "false"}>
								{option.badge}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}

/** Every CMS page uses the same container width so rail navigation never shifts the header. */
export const pageClass = "grid min-w-0 max-w-[1160px] grid-cols-1 gap-6";

/** Consistent calm editorial header across CMS pages. */
export function PageHeader({
	title,
	description,
	actions,
}: {
	title: string;
	description?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<header className="cms-enter flex min-w-0 flex-wrap items-end justify-between gap-4">
			<div className="grid min-w-0 gap-1">
				<h1 className="m-0 text-headline">{title}</h1>
				{description ? (
					<p className="m-0 max-w-[64ch] text-[14px] leading-relaxed text-muted-foreground">
						{description}
					</p>
				) : null}
			</div>
			{actions ? (
				<div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>
			) : null}
		</header>
	);
}

/** Designed empty state with concentric icon medallion (never bare text). */
export function EmptyState({
	icon,
	title,
	description,
	action,
	tone = "neutral",
	className,
}: {
	icon: ReactNode;
	title: string;
	description: ReactNode;
	action?: ReactNode;
	tone?: "neutral" | "success";
	className?: string;
}) {
	return (
		<div className={cn("grid place-items-center gap-2.5 px-6 py-11 text-center", className)}>
			<span
				aria-hidden="true"
				className={cn(
					"grid size-11 place-items-center rounded-full border shadow-[0_1px_2px_var(--theme-shadow-soft),inset_0_1px_var(--theme-highlight)]",
					tone === "success"
						? "border-success/35 bg-success/10 text-success"
						: "border-line-strong bg-surface-raised text-muted-foreground",
				)}
			>
				{icon}
			</span>
			<div className="grid gap-1">
				<p className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</p>
				<p className="m-0 max-w-[44ch] text-[13.5px] leading-relaxed text-muted-foreground">
					{description}
				</p>
			</div>
			{action ? (
				<div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">{action}</div>
			) : null}
		</div>
	);
}

export function Delta({
	value,
	comparison,
	unit,
}: {
	value: number | null;
	comparison: string;
	unit?: string;
}) {
	if (value === null) {
		return (
			<span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
				<span aria-hidden="true" className="font-mono text-[10px] opacity-65">
					·
				</span>
				<span>No comparison</span>
			</span>
		);
	}
	if (value === 0) {
		return (
			<span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
				<span aria-hidden="true" className="font-mono text-[10px] opacity-65">
					—
				</span>
				<span>No change</span>
			</span>
		);
	}
	const up = value > 0;
	return (
		<span className="inline-flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
			<span
				className={cn(
					"inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 font-mono text-[10.5px] font-medium tabular-nums",
					up
						? "border-success/30 bg-success/10 text-success"
						: "border-line-strong bg-muted text-ink-soft",
				)}
			>
				<span aria-hidden="true">{up ? "↑" : "↓"}</span>
				<span>
					{countLabel(Math.abs(value))}
					{unit ? ` ${unit}` : ""}
				</span>
			</span>
			<span className="truncate">{comparison}</span>
		</span>
	);
}

export function Panel({
	title,
	description,
	action,
	badge,
	stagger,
	children,
	className,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
	badge?: ReactNode;
	stagger?: number;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			style={stagger !== undefined ? staggerStyle(stagger) : undefined}
			className={cn(
				"cms-panel grid min-w-0 content-start gap-3.5 p-4 sm:p-5",
				stagger !== undefined && "cms-enter",
				className,
			)}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<h2 className="m-0 text-[15px] font-semibold tracking-[-0.012em] text-foreground">
						{title}
					</h2>
					{badge}
				</div>
				{action ? <div className="shrink-0">{action}</div> : null}
			</div>
			{description ? (
				<p className="m-0 -mt-2 text-[12.5px] text-muted-foreground">{description}</p>
			) : null}
			{children}
		</section>
	);
}

export function RankedList({
	rows,
	empty = "No data in this period.",
	highlightedValue,
	onHoverValue,
}: {
	rows: AnalyticsCount[];
	empty?: string;
	highlightedValue?: string | null;
	onHoverValue?: (value: string | null) => void;
}) {
	if (rows.length === 0) {
		return <p className="m-0 text-[13px] text-muted-foreground">{empty}</p>;
	}
	const max = Math.max(1, ...rows.map((row) => row.count));
	const total = rows.reduce((sum, row) => sum + row.count, 0);

	return (
		<ul className="m-0 grid list-none gap-0.5 p-0">
			{rows.map((row) => {
				const ratio = Math.max(0.02, row.count / max);
				const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
				const active = highlightedValue === row.value;
				return (
					<li
						key={row.value}
						data-active={active ? "true" : "false"}
						onMouseEnter={onHoverValue ? () => onHoverValue(row.value) : undefined}
						onMouseLeave={onHoverValue ? () => onHoverValue(null) : undefined}
						className="cms-ranked-row grid min-w-0 gap-1.5 rounded-[9px] px-2.5 pt-2 pb-2.5"
					>
						<div className="flex min-w-0 items-baseline justify-between gap-3">
							<span className="min-w-0 text-[13.5px] font-medium text-foreground [overflow-wrap:anywhere]">
								{row.label ?? row.value}
							</span>
							<span className="flex shrink-0 items-baseline gap-2 font-mono text-[12px] tabular-nums">
								<span className="font-semibold text-foreground">{countLabel(row.count)}</span>
								{rows.length > 1 ? (
									<span className="hidden w-8 text-right text-[11px] text-muted-foreground sm:inline">
										{share}%
									</span>
								) : null}
							</span>
						</div>
						<span aria-hidden="true" className="cms-bar-track">
							<span className="cms-bar-fill" style={{ transform: `scaleX(${ratio})` }} />
						</span>
					</li>
				);
			})}
		</ul>
	);
}

/**
 * One quiet line for an empty or informational state: an icon, a sentence, and
 * an optional inline action. Used instead of stacked empty cards.
 */
export function QuietNote({
	children,
	action,
	className,
}: {
	children: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"cms-enter flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[14px] border border-line bg-surface-solid px-4 py-3 text-[13.5px] text-muted-foreground shadow-[0_1px_2px_var(--theme-shadow-soft),inset_0_1px_var(--theme-highlight)]",
				className,
			)}
		>
			<span
				aria-hidden="true"
				className="grid size-6 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-raised text-muted-foreground"
			>
				<svg
					viewBox="0 0 20 20"
					className="size-3.5 fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
				>
					<path d="M3.25 14.5h13.5" />
					<path d="M4.5 10.5h11" strokeDasharray="2.5 2.5" />
				</svg>
			</span>
			<span className="min-w-0 flex-1">{children}</span>
			{action ? <span className="shrink-0">{action}</span> : null}
		</div>
	);
}

/** Inline text link styled for quiet notes; 44px tall on coarse pointers. */
export const inlineLinkClass =
	"cms-press cms-page-focus inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-primary-text no-underline hover:bg-primary-soft pointer-coarse:min-h-11";

export function AnalyticsUnavailable() {
	const router = useRouter();
	return (
		<section className="cms-panel cms-enter">
			<EmptyState
				icon={
					<svg
						viewBox="0 0 20 20"
						className="size-4 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
					>
						<path d="M10 3.5 17 16H3L10 3.5Z" />
						<path d="M10 8v3.5" />
						<circle cx="10" cy="13.75" r="0.6" className="fill-current" />
					</svg>
				}
				title="Analytics unavailable"
				description="Traffic data could not be loaded right now. Your site and draft content are unaffected."
				action={
					<button type="button" className={controlClass} onClick={() => void router.invalidate()}>
						Try again
					</button>
				}
			/>
		</section>
	);
}

export function Sparkline({ points }: { points: number[] }) {
	const gradId = useId();
	const data = points.length > 1 ? points : [points[0] ?? 0, points[0] ?? 0];
	const max = Math.max(...data, 0);
	const isFlat = max === 0;
	const scaleMax = Math.max(1, max);
	const coords = data.map((point, index) => ({
		x: (index / (data.length - 1)) * 108,
		y: isFlat ? 22 : 22 - (point / scaleMax) * 18,
	}));
	const linePath = coords
		.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
		.join(" ");
	const areaPath = `${linePath} L108,26 L0,26 Z`;

	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 108 26"
			preserveAspectRatio="none"
			className={cn("h-7 w-full", isFlat ? "text-line-strong" : "text-primary-text")}
		>
			{!isFlat ? (
				<defs>
					<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
						<stop offset="100%" stopColor="currentColor" stopOpacity="0" />
					</linearGradient>
				</defs>
			) : null}
			{!isFlat ? <path d={areaPath} fill={`url(#${gradId})`} /> : null}
			<path
				d={linePath}
				fill="none"
				stroke="currentColor"
				strokeWidth={isFlat ? "1.25" : "1.75"}
				strokeDasharray={isFlat ? "3 3" : undefined}
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}

export function Kpi({
	label,
	value,
	points,
	delta,
	comparison,
	suffix,
	unit,
	stagger,
	title,
}: {
	label: string;
	value: number | null;
	/** Sparkline samples; omitted or a single sample draws no sparkline. */
	points?: number[];
	delta?: number | null;
	comparison?: string;
	suffix?: string;
	unit?: string;
	stagger?: number;
	title?: string;
}) {
	return (
		<div
			title={title}
			style={stagger !== undefined ? staggerStyle(stagger) : undefined}
			className={cn(
				"cms-panel cms-kpi-card grid min-w-0 content-between gap-2.5 p-4",
				stagger !== undefined && "cms-enter",
			)}
		>
			<h2 className="m-0 text-[12.5px] font-medium text-muted-foreground">{label}</h2>
			<div className="text-[28px] leading-none font-semibold tracking-[-0.03em] text-foreground">
				<TickingNumber value={value} suffix={suffix} />
			</div>
			{points && points.length > 1 && points.some((point) => point > 0) ? (
				<Sparkline points={points} />
			) : null}
			{comparison !== undefined && delta !== undefined ? (
				<Delta value={delta} comparison={comparison} unit={unit} />
			) : null}
		</div>
	);
}

export function LiveControls({
	paused,
	setPaused,
	failed,
}: Pick<ReturnType<typeof useLiveVisitors>, "paused" | "setPaused" | "failed">) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{failed && !paused ? (
				<span className="text-[12.5px] text-muted-foreground">Retrying…</span>
			) : null}
			<button
				type="button"
				className={controlClass}
				aria-pressed={paused}
				onClick={() => setPaused(!paused)}
			>
				{paused ? "Resume updates" : "Pause updates"}
			</button>
		</div>
	);
}

/** Status notice with a 44px-on-touch Dismiss button. */
export function PageNotice({
	tone,
	text,
	onDismiss,
}: {
	tone: "ok" | "error";
	text: string;
	onDismiss: () => void;
}) {
	return (
		<div
			role="status"
			className={cn(
				"cms-enter flex items-center justify-between gap-3 rounded-[12px] border py-1.5 pr-1.5 pl-4 text-[13px]",
				tone === "ok"
					? "border-success/35 bg-success/10 text-success"
					: "border-destructive/35 bg-destructive/10 text-destructive",
			)}
		>
			<span className="flex items-center gap-2">
				{tone === "ok" ? (
					<CheckCircleIcon className="size-4 shrink-0" />
				) : (
					<AlertTriangleIcon className="size-4 shrink-0" />
				)}
				<span>{text}</span>
			</span>
			<button
				type="button"
				onClick={onDismiss}
				className="cms-press cms-page-focus inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-[12.5px] font-medium hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)] pointer-coarse:min-h-11"
			>
				Dismiss
			</button>
		</div>
	);
}
