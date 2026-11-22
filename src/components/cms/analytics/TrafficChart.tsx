import { motion } from "motion/react";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import type { TrafficPoint } from "../../../server/analytics.server";
import { REDUCED } from "../motion";
import { SegmentedControl, countLabel, staggerStyle } from "./Widgets";

const width = 640;
const height = 188;
const padX = 12;
const padTop = 14;
const padBottom = 14;
/** Height of the readout band above the plot: legend at rest, callout while inspecting. */
const BAND_PX = 50;
const HOUR_MS = 3_600_000;

const plural = (count: number, one: string, many: string) =>
	`${countLabel(count)} ${count === 1 ? one : many}`;

const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const hour = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
	timeZone: "UTC",
});

/**
 * Round the axis maximum up so the middle gridline lands on a whole number
 * (a max of 7 becomes 8, so the mid label reads 4 on the 4 line).
 */
export function niceAxisMax(rawMax: number): number {
	const half = Math.max(1, rawMax / 2);
	if (half <= 10) return Math.ceil(half) * 2;
	const magnitude = 10 ** Math.floor(Math.log10(half));
	const step = magnitude / 2;
	return Math.ceil(half / step) * step * 2;
}

interface Coord {
	x: number;
	y: number;
}

/**
 * Monotone cubic Hermite spline (Fritsch-Carlson) so curves stay smooth like
 * Apple Stocks / Analytics without ever overshooting below zero or above peaks.
 */
function monotonePath(coords: readonly Coord[]): string {
	if (coords.length === 0) return "";
	if (coords.length === 1) return `M${coords[0]!.x.toFixed(1)},${coords[0]!.y.toFixed(1)}`;
	if (coords.length === 2) {
		return `M${coords[0]!.x.toFixed(1)},${coords[0]!.y.toFixed(1)} L${coords[1]!.x.toFixed(1)},${coords[1]!.y.toFixed(1)}`;
	}

	const n = coords.length;
	const slopes: number[] = [];
	for (let i = 0; i < n - 1; i++) {
		const dx = coords[i + 1]!.x - coords[i]!.x;
		slopes.push(dx === 0 ? 0 : (coords[i + 1]!.y - coords[i]!.y) / dx);
	}

	const tangents = Array.from({ length: n }, () => 0);
	tangents[0] = slopes[0]!;
	tangents[n - 1] = slopes[n - 2]!;
	for (let i = 1; i < n - 1; i++) {
		const prev = slopes[i - 1]!;
		const next = slopes[i]!;
		if (prev * next <= 0) {
			tangents[i] = 0;
		} else {
			tangents[i] = (prev + next) / 2;
		}
	}

	for (let i = 0; i < n - 1; i++) {
		const slope = slopes[i]!;
		if (slope === 0) {
			tangents[i] = 0;
			tangents[i + 1] = 0;
		} else {
			const a = tangents[i]! / slope;
			const b = tangents[i + 1]! / slope;
			const sumSq = a * a + b * b;
			if (sumSq > 9) {
				const scale = 3 / Math.sqrt(sumSq);
				tangents[i] = scale * a * slope;
				tangents[i + 1] = scale * b * slope;
			}
		}
	}

	let d = `M${coords[0]!.x.toFixed(1)},${coords[0]!.y.toFixed(1)}`;
	for (let i = 0; i < n - 1; i++) {
		const p0 = coords[i]!;
		const p1 = coords[i + 1]!;
		const dx = (p1.x - p0.x) / 3;
		const cp1x = p0.x + dx;
		const cp1y = p0.y + tangents[i]! * dx;
		const cp2x = p1.x - dx;
		const cp2y = p1.y - tangents[i + 1]! * dx;
		d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
	}
	return d;
}

export function TrafficChart({
	points,
	hourly = false,
	title = "Traffic",
	rangeLabel = "this range",
	stagger,
}: {
	points: TrafficPoint[];
	hourly?: boolean;
	title?: string;
	/** "the last 30 days", for the screen-reader summary. */
	rangeLabel?: string;
	stagger?: number;
}) {
	const reduced = useLiveReducedMotion();
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);
	const [mode, setMode] = useState<"chart" | "table">("chart");
	const [canvasWidth, setCanvasWidth] = useState(640);
	const wrapRef = useRef<HTMLDivElement>(null);
	const id = useId();
	const fillId = `${id}-pv-fill`;
	const clipId = `${id}-draw-clip`;
	const visitorLabel = hourly ? "Visitor-days / hr" : "Visitor-days";

	useEffect(() => {
		const element = wrapRef.current;
		if (!element) return;
		setCanvasWidth(element.getBoundingClientRect().width);
		const observer = new ResizeObserver(([entry]) => {
			if (entry) setCanvasWidth(entry.contentRect.width);
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [mode]);

	const last = Math.max(0, points.length - 1);
	const rawMax = useMemo(
		() => Math.max(0, ...points.map((point) => Math.max(point.visitorDays, point.pageviews))),
		[points],
	);
	const isAllZero = rawMax === 0;
	const max = niceAxisMax(rawMax);
	const plotTop = padTop;
	const plotBottom = height - padBottom;

	const xOf = (i: number) => (points.length <= 1 ? padX : padX + (i / last) * (width - 2 * padX));
	const yOf = (value: number) => plotBottom - (value / max) * (plotBottom - plotTop);

	// Hourly buckets roll with the clock; label each by the hour it falls in.
	const format = (point: TrafficPoint | undefined) => {
		if (!point) return "";
		const at = Date.parse(point.at);
		return hourly ? hour.format(Math.floor(at / HOUR_MS) * HOUR_MS) : date.format(at);
	};

	const summary = useMemo(() => {
		if (points.length === 0) return "";
		const pageviews = points.reduce((sum, point) => sum + point.pageviews, 0);
		const visitorDays = points.reduce((sum, point) => sum + point.visitorDays, 0);
		const totals = `${title}, ${rangeLabel}: ${plural(pageviews, "pageview", "pageviews")} and ${plural(visitorDays, "visitor-day", "visitor-days")}.`;
		if (pageviews === 0) return totals;
		const peak = points.reduce((best, point) => (point.pageviews > best.pageviews ? point : best));
		const half = Math.floor(points.length / 2);
		const early = points.slice(0, half).reduce((sum, point) => sum + point.pageviews, 0);
		const late = points
			.slice(points.length - half)
			.reduce((sum, point) => sum + point.pageviews, 0);
		const trend =
			half === 0 || Math.abs(late - early) <= Math.max(1, early * 0.1)
				? "held steady"
				: late > early
					? "rose"
					: "fell";
		return `${totals} Busiest ${hourly ? "hour" : "day"}: ${format(peak)} UTC with ${plural(peak.pageviews, "pageview", "pageviews")}. Pageviews ${trend} from the first half of the range to the second.`;
	}, [points, title, rangeLabel, hourly]);

	const { pvCoords, vdCoords, pvLine, vdLine, pvArea } = useMemo(() => {
		const pv = points.map((point, i) => ({ x: xOf(i), y: yOf(point.pageviews) }));
		const vd = points.map((point, i) => ({ x: xOf(i), y: yOf(point.visitorDays) }));
		const pvPath = monotonePath(pv);
		const vdPath = monotonePath(vd);
		const area =
			pv.length > 1
				? `${pvPath} L${pv[pv.length - 1]!.x.toFixed(1)},${plotBottom} L${pv[0]!.x.toFixed(1)},${plotBottom} Z`
				: "";
		return { pvCoords: pv, vdCoords: vd, pvLine: pvPath, vdLine: vdPath, pvArea: area };
	}, [points, max, last]);

	const activeIndex = hoverIndex ?? keyboardIndex;
	const activePoint = activeIndex !== null ? points[activeIndex] : undefined;
	const activePv = activeIndex !== null ? pvCoords[activeIndex] : undefined;
	const activeVd = activeIndex !== null ? vdCoords[activeIndex] : undefined;

	// The callout lives in its own band above the plot, centred on the
	// crosshair and clamped to the edges, so it never covers the data.
	const tooltipWidth = Math.min(236, canvasWidth);
	const crossPx = activePv ? (activePv.x / width) * canvasWidth : 0;
	const tooltipLeft = Math.max(0, Math.min(canvasWidth - tooltipWidth, crossPx - tooltipWidth / 2));

	const clearInspection = () => {
		setHoverIndex(null);
		setKeyboardIndex(null);
	};

	const updateFromPointer = (clientX: number, target: HTMLElement) => {
		if (points.length === 0) return;
		const rect = target.getBoundingClientRect();
		if (rect.width <= 0) return;
		const relX = ((clientX - rect.left) / rect.width) * width;
		const idx = Math.max(
			0,
			Math.min(last, Math.round(((relX - padX) / Math.max(1, width - 2 * padX)) * last)),
		);
		setHoverIndex(idx);
	};

	const stepTo = (next: number) => {
		if (points.length === 0) return;
		setHoverIndex(null);
		setKeyboardIndex(Math.max(0, Math.min(last, next)));
	};

	const midIndex = Math.floor(last / 2);
	const gridLines = [plotTop, (plotTop + plotBottom) / 2, plotBottom];
	const axisLabels = [max, max / 2, 0];
	const keyboardPoint = keyboardIndex !== null ? points[keyboardIndex] : undefined;
	const summaryId = `${id}-summary`;

	return (
		<section
			aria-labelledby={id}
			style={stagger !== undefined ? staggerStyle(stagger) : undefined}
			className={cn(
				"cms-panel grid min-w-0 gap-4 p-4 sm:p-5",
				stagger !== undefined && "cms-enter",
			)}
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id={id} className="m-0 text-[15px] font-semibold tracking-[-0.012em] text-foreground">
					{title}
				</h2>

				<SegmentedControl
					layoutId={`${id}-view-mode`}
					ariaLabel="Chart display mode"
					compact
					value={mode}
					onChange={setMode}
					options={[
						{ value: "chart", label: "Chart" },
						{ value: "table", label: "Table" },
					]}
				/>
			</div>

			{mode === "table" ? (
				<div
					className="cms-page-focus max-h-96 overflow-auto rounded-[12px] border border-line"
					role="region"
					aria-label="Traffic data"
					tabIndex={0}
				>
					<table className="w-full border-collapse text-left text-[13px] tabular-nums">
						<thead className="sticky top-0 bg-surface-solid">
							<tr className="border-b border-line text-[12px] text-muted-foreground">
								<th scope="col" className="px-3 py-2.5 font-medium">
									{hourly ? "Hour (UTC)" : "Day (UTC)"}
								</th>
								<th scope="col" className="px-3 py-2.5 text-right font-medium">
									{visitorLabel}
								</th>
								<th scope="col" className="px-3 py-2.5 text-right font-medium">
									Pageviews
								</th>
							</tr>
						</thead>
						<tbody>
							{points.map((point) => (
								<tr key={point.at} className="cms-row-hover border-t border-line">
									<th
										scope="row"
										className="px-3 py-2 font-mono text-[12px] font-normal text-ink-soft"
									>
										{format(point)}
									</th>
									<td className="px-3 py-2 text-right font-mono font-medium text-primary-text">
										{countLabel(point.visitorDays)}
									</td>
									<td className="px-3 py-2 text-right font-mono font-medium text-foreground">
										{countLabel(point.pageviews)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-2">
					{/* Y-axis labels sit exactly on their gridlines, below the readout band. */}
					<div
						aria-hidden="true"
						className="relative min-w-[2ch] font-mono text-[10.5px] tabular-nums text-muted-foreground"
					>
						<div className="absolute inset-x-0 bottom-0" style={{ top: BAND_PX }}>
							{axisLabels.map((value, index) => (
								<span
									key={index}
									className="absolute right-0 -translate-y-1/2 leading-none"
									style={{ top: `${(gridLines[index]! / height) * 100}%` }}
								>
									{countLabel(value)}
								</span>
							))}
						</div>
						<span className="invisible block leading-none">{countLabel(max)}</span>
					</div>

					<div
						ref={wrapRef}
						role="group"
						tabIndex={0}
						aria-label={`${title}. Use the left and right arrow keys to read each ${hourly ? "hour" : "day"}.`}
						aria-describedby={summaryId}
						onPointerMove={(event) => {
							if (event.pointerType !== "mouse" && event.buttons === 0) return;
							updateFromPointer(event.clientX, event.currentTarget);
						}}
						onPointerDown={(event) => {
							updateFromPointer(event.clientX, event.currentTarget);
						}}
						onPointerLeave={clearInspection}
						onPointerCancel={clearInspection}
						onFocus={(event) => {
							if (
								keyboardIndex === null &&
								points.length > 0 &&
								event.currentTarget.matches(":focus-visible")
							) {
								setKeyboardIndex(last);
							}
						}}
						onBlur={clearInspection}
						onKeyDown={(event) => {
							const current = keyboardIndex ?? hoverIndex ?? last;
							if (event.key === "ArrowLeft") {
								event.preventDefault();
								stepTo(current - 1);
							} else if (event.key === "ArrowRight") {
								event.preventDefault();
								stepTo(current + 1);
							} else if (event.key === "Home") {
								event.preventDefault();
								stepTo(0);
							} else if (event.key === "End") {
								event.preventDefault();
								stepTo(last);
							} else if (event.key === "Escape") {
								clearInspection();
							}
						}}
						className="cms-page-focus relative min-w-0 cursor-crosshair touch-pan-y select-none rounded-[12px]"
						style={{ paddingTop: BAND_PX }}
					>
						{/* Readout band: the legend at rest, the callout while inspecting. */}
						<div
							aria-hidden="true"
							className={cn(
								"absolute inset-x-0 top-0 flex items-center gap-x-4 text-[12px] text-muted-foreground transition-opacity duration-150",
								activePoint ? "opacity-0" : "opacity-100",
							)}
							style={{ height: BAND_PX - 8 }}
						>
							<span className="inline-flex items-center gap-1.5">
								<SeriesSwatch kind="pageviews" />
								<span>Pageviews</span>
							</span>
							<span className="inline-flex items-center gap-1.5">
								<SeriesSwatch kind="visitors" />
								<span>{visitorLabel}</span>
							</span>
						</div>
						{activePoint ? (
							<div
								aria-hidden="true"
								className="cms-chart-tooltip grid content-center gap-1 px-3"
								style={{
									width: `${tooltipWidth}px`,
									left: `${tooltipLeft}px`,
									height: BAND_PX - 8,
								}}
							>
								<p className="m-0 truncate text-[11px] leading-none font-medium text-muted-foreground">
									{format(activePoint)} UTC
								</p>
								<div className="flex items-center gap-3 text-[12px] leading-none whitespace-nowrap tabular-nums">
									<span className="inline-flex items-center gap-1.5">
										<SeriesSwatch kind="pageviews" />
										<span className="font-mono font-semibold text-foreground">
											{countLabel(activePoint.pageviews)}
										</span>
										<span className="text-[11px] text-muted-foreground">views</span>
									</span>
									<span className="inline-flex items-center gap-1.5">
										<SeriesSwatch kind="visitors" />
										<span className="font-mono font-semibold text-primary-text">
											{countLabel(activePoint.visitorDays)}
										</span>
										<span className="text-[11px] text-muted-foreground">
											{hourly ? "visitor-days/hr" : "visitor-days"}
										</span>
									</span>
								</div>
							</div>
						) : null}

						<div className="relative">
							<svg
								aria-hidden="true"
								viewBox={`0 0 ${width} ${height}`}
								preserveAspectRatio="none"
								className="block h-44 w-full sm:h-56"
							>
								<defs>
									<linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor="var(--theme-accent)" stopOpacity="0.16" />
										<stop offset="100%" stopColor="var(--theme-accent)" stopOpacity="0" />
									</linearGradient>
									<clipPath id={clipId}>
										{/* originX 0: Motion defaults SVG transforms to the box centre. */}
										<motion.rect
											x={0}
											y={0}
											width={width}
											height={height}
											style={{ originX: 0, originY: 0 }}
											initial={{ scaleX: 0 }}
											animate={{ scaleX: 1 }}
											transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
										/>
									</clipPath>
								</defs>

								{gridLines.map((lineY, idx) => (
									<line
										key={lineY}
										x1={padX}
										x2={width - padX}
										y1={lineY}
										y2={lineY}
										stroke="currentColor"
										strokeDasharray={idx === 2 ? undefined : "3 4"}
										className={idx === 2 ? "text-line-strong" : "text-line"}
										vectorEffect="non-scaling-stroke"
									/>
								))}

								{/* Series revealed left to right once; reduced motion fades instead. */}
								<motion.g
									className="cms-chart-series"
									clipPath={reduced ? undefined : `url(#${clipId})`}
									initial={reduced ? { opacity: 0 } : undefined}
									animate={reduced ? { opacity: 1 } : undefined}
									transition={reduced ? REDUCED : undefined}
								>
									{pvArea && !isAllZero ? <path d={pvArea} fill={`url(#${fillId})`} /> : null}
									{pvLine ? (
										<path
											d={pvLine}
											fill="none"
											stroke="currentColor"
											className={isAllZero ? "text-line-strong" : "text-foreground"}
											strokeWidth={isAllZero ? "1.5" : "2"}
											strokeLinecap="round"
											strokeLinejoin="round"
											vectorEffect="non-scaling-stroke"
										/>
									) : null}
									{vdLine ? (
										<path
											d={vdLine}
											fill="none"
											stroke="currentColor"
											className={isAllZero ? "text-primary-text/50" : "text-primary-text"}
											strokeWidth="2"
											strokeDasharray="5 4"
											strokeLinecap="round"
											strokeLinejoin="round"
											vectorEffect="non-scaling-stroke"
										/>
									) : null}
								</motion.g>
							</svg>

							{/* Crosshair and dots move together in one frame. */}
							{activePoint && activePv && activeVd ? (
								<>
									<span
										aria-hidden="true"
										className="pointer-events-none absolute w-px -translate-x-1/2 bg-muted-foreground/60"
										style={{
											left: `${(activePv.x / width) * 100}%`,
											top: `${(plotTop / height) * 100}%`,
											bottom: `${(padBottom / height) * 100}%`,
										}}
									/>
									<span
										aria-hidden="true"
										className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-solid bg-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--theme-accent)_22%,transparent)]"
										style={{
											left: `${(activeVd.x / width) * 100}%`,
											top: `${(activeVd.y / height) * 100}%`,
										}}
									/>
									<span
										aria-hidden="true"
										className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-solid bg-foreground shadow-[0_1px_4px_var(--theme-shadow-strong)]"
										style={{
											left: `${(activePv.x / width) * 100}%`,
											top: `${(activePv.y / height) * 100}%`,
										}}
									/>
								</>
							) : null}
						</div>
					</div>

					{/* X-axis labels share the plot's column, so they line up with it. */}
					<span aria-hidden="true" />
					<div
						aria-hidden="true"
						className="flex items-center justify-between gap-3 font-mono text-[11px] text-muted-foreground"
						style={{ paddingInline: `${(padX / width) * 100}%` }}
					>
						<span>{format(points[0])}</span>
						{points.length > 4 ? (
							<span className="hidden sm:inline">{format(points[midIndex])}</span>
						) : null}
						<span>{format(points[last])} UTC</span>
					</div>

					<p id={summaryId} className="sr-only">
						{summary}
					</p>
					<p className="sr-only" aria-live="polite">
						{keyboardPoint
							? `${format(keyboardPoint)} UTC: ${plural(keyboardPoint.pageviews, "pageview", "pageviews")}, ${plural(keyboardPoint.visitorDays, hourly ? "visitor-day this hour" : "visitor-day", hourly ? "visitor-days this hour" : "visitor-days")}`
							: ""}
					</p>
				</div>
			)}
		</section>
	);
}

/** Legend and tooltip swatch: solid line for pageviews, dashed accent for visitor-days. */
function SeriesSwatch({ kind }: { kind: "pageviews" | "visitors" }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"inline-block w-3.5 shrink-0 border-t-2",
				kind === "pageviews" ? "border-foreground" : "border-dashed border-primary-text",
			)}
		/>
	);
}
