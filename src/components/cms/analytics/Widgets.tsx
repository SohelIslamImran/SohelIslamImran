import { useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../../lib/utils";
import type { AnalyticsCount } from "../../../server/analytics.server";
import { REDUCED, SPRING_MOVE, SPRING_SNAPPY } from "../motion";
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
	const reduced = useReducedMotion();
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
	const reduced = useReducedMotion();
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
						onClick={() => onChange(option.value)}
						className={cn("cms-seg-item shrink-0", compact && "min-h-7 px-2.5 text-[12px]")}
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
							<span
								className={cn(
									"font-mono text-[10.5px] tabular-nums",
									active ? "text-primary-text" : "text-muted-foreground",
								)}
							>
								{option.badge}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}

/** Consistent calm editorial header across CMS pages. */
export function PageHeader({
	eyebrow,
	title,
	description,
	actions,
}: {
	eyebrow: string;
	title: string;
	description?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<header className="cms-enter flex min-w-0 flex-wrap items-end justify-between gap-4">
			<div className="grid min-w-0 gap-1">
				<p className="mono-label m-0 text-[11px] text-primary-text">{eyebrow}</p>
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
		return (
			<div className="grid gap-2.5 py-1">
				<div aria-hidden="true" className="grid gap-2 opacity-50">
					{[72, 48, 30].map((pct) => (
						<div key={pct} className="flex items-center justify-between gap-3 py-1">
							<span className="h-2 rounded-full bg-line" style={{ width: `${pct}%` }} />
							<span className="h-2 w-6 rounded-full bg-line" />
						</div>
					))}
				</div>
				<p className="m-0 text-[12.5px] text-muted-foreground">{empty}</p>
			</div>
		);
	}
	const max = Math.max(1, ...rows.map((row) => row.count));
	const total = rows.reduce((sum, row) => sum + row.count, 0);

	return (
		<ul className="m-0 grid list-none gap-1 p-0">
			{rows.map((row) => {
				const ratio = Math.max(0.03, row.count / max);
				const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
				const active = highlightedValue === row.value;
				return (
					<li
						key={row.value}
						onMouseEnter={onHoverValue ? () => onHoverValue(row.value) : undefined}
						onMouseLeave={onHoverValue ? () => onHoverValue(null) : undefined}
						className={cn(
							"group relative flex min-w-0 items-center justify-between gap-3 rounded-[9px] px-2.5 py-2 transition-colors duration-150",
							active
								? "bg-primary-soft/65"
								: "hover:bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)]",
						)}
					>
						<span
							aria-hidden="true"
							className="cms-bar-fill pointer-events-none"
							style={{ transform: `scaleX(${ratio})` }}
						/>
						<span className="relative z-[1] min-w-0 text-[13.5px] font-medium text-foreground [overflow-wrap:anywhere]">
							{row.label ?? row.value}
						</span>
						<span className="relative z-[1] flex shrink-0 items-baseline gap-2 font-mono text-[12px] tabular-nums">
							<span className="font-semibold text-foreground">{countLabel(row.count)}</span>
							{rows.length > 1 ? (
								<span className="hidden w-8 text-right text-[11px] text-muted-foreground sm:inline">
									{share}%
								</span>
							) : null}
						</span>
					</li>
				);
			})}
		</ul>
	);
}

export function NoVisits({ allTime = false }: { allTime?: boolean }) {
	return (
		<div className="cms-enter flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-surface-solid px-4 py-3 shadow-[0_1px_2px_var(--theme-shadow-soft),inset_0_1px_var(--theme-highlight)]">
			<div className="flex min-w-0 items-center gap-3">
				<span
					aria-hidden="true"
					className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-raised text-muted-foreground"
				>
					<svg
						viewBox="0 0 20 20"
						className="size-4 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
					>
						<path d="M3.25 14.5h13.5" />
						<path d="M4.5 11.5h11" strokeDasharray="2.5 2.5" />
					</svg>
				</span>
				<div className="min-w-0">
					<p className="m-0 text-[13.5px] font-medium text-foreground">
						{allTime ? "No visits recorded yet" : "No visits in this period"}
					</p>
					<p className="m-0 text-[12.5px] text-muted-foreground">
						{allTime
							? "First-party cookieless visits appear automatically once visitors browse the public site."
							: "Flat tracks below reflect zero recorded pageviews for the selected UTC range."}
					</p>
				</div>
			</div>
			<span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
				<span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/50" />
				<span>Awaiting signal</span>
			</span>
		</div>
	);
}

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
	live = false,
	paused = false,
	stagger,
	title,
}: {
	label: string;
	value: number | null;
	points: number[];
	delta: number | null;
	comparison: string;
	live?: boolean;
	paused?: boolean;
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
			<div className="flex items-center justify-between gap-2">
				<h2 className="mono-label m-0 text-[10.5px] text-muted-foreground">{label}</h2>
				{live || paused ? <LiveDot active={live} paused={paused} /> : null}
			</div>
			<div className="text-[28px] leading-none font-semibold tracking-[-0.03em] text-foreground">
				<TickingNumber value={value} />
			</div>
			<Sparkline points={points} />
			<Delta value={delta} comparison={comparison} />
		</div>
	);
}

export function LiveControls({
	paused,
	setPaused,
	failed,
}: Pick<ReturnType<typeof useLiveVisitors>, "paused" | "setPaused" | "failed">) {
	return (
		<div className="flex flex-wrap items-center gap-2.5">
			<button
				type="button"
				className={controlClass}
				aria-pressed={paused}
				onClick={() => setPaused(!paused)}
			>
				<LiveDot active={!paused && !failed} paused={paused} />
				<span>{paused ? "Resume live" : "Live updates"}</span>
			</button>
			{failed && !paused ? (
				<span className="inline-flex items-center gap-1 rounded-full border border-line bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
					Live feed retrying
				</span>
			) : null}
		</div>
	);
}
