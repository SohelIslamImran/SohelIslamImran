import { motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import type { TrafficPoint } from "../../../server/analytics.server";
import { REDUCED } from "../motion";
import { SegmentedControl, countLabel, staggerStyle } from "./Widgets";

const width = 640;
const height = 188;
const padX = 12;
const padTop = 14;
const padBottom = 14;

const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const hour = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
	timeZone: "UTC",
});

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
	stagger,
}: {
	points: TrafficPoint[];
	hourly?: boolean;
	title?: string;
	stagger?: number;
}) {
	const reduced = useReducedMotion();
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);
	const [mode, setMode] = useState<"chart" | "table">("chart");
	const [canvasWidth, setCanvasWidth] = useState(640);
	const wrapRef = useRef<HTMLDivElement>(null);
	const id = useId();
	const fillId = `${id}-pv-fill`;
	const clipId = `${id}-draw-clip`;

	const last = Math.max(0, points.length - 1);
	const rawMax = useMemo(
		() => Math.max(0, ...points.map((point) => Math.max(point.visitorDays, point.pageviews))),
		[points],
	);
	const isAllZero = rawMax === 0;
	const max = Math.max(1, rawMax);
	const midLabel = Math.round(max / 2);

	const xOf = (i: number) => (points.length <= 1 ? padX : padX + (i / last) * (width - 2 * padX));
	const yOf = (value: number) => height - padBottom - (value / max) * (height - padTop - padBottom);

	const format = (point: TrafficPoint | undefined) =>
		point ? (hourly ? hour : date).format(new Date(point.at)) : "";

	const { pvCoords, vdCoords, pvLine, vdLine, pvArea } = useMemo(() => {
		const pv = points.map((point, i) => ({ x: xOf(i), y: yOf(point.pageviews) }));
		const vd = points.map((point, i) => ({ x: xOf(i), y: yOf(point.visitorDays) }));
		const pvPath = monotonePath(pv);
		const vdPath = monotonePath(vd);
		const baseLine = height - padBottom;
		const area =
			pv.length > 1
				? `${pvPath} L${pv[pv.length - 1]!.x.toFixed(1)},${baseLine} L${pv[0]!.x.toFixed(1)},${baseLine} Z`
				: "";
		return { pvCoords: pv, vdCoords: vd, pvLine: pvPath, vdLine: vdPath, pvArea: area };
	}, [points, max, last]);

	const activeIndex = hoverIndex ?? keyboardIndex;
	const activePoint = activeIndex !== null ? points[activeIndex] : undefined;
	const summaryPoint = activePoint ?? points[last];
	const activeRatio = activeIndex !== null && last > 0 ? activeIndex / last : 0;

	const tooltipWidth = 186;
	const rawLeft = activeRatio * Math.max(tooltipWidth, canvasWidth);
	const clampedLeft = Math.max(
		6,
		Math.min(Math.max(6, canvasWidth - tooltipWidth - 6), rawLeft - tooltipWidth / 2),
	);

	const updateFromPointer = (clientX: number, target: HTMLElement) => {
		if (points.length === 0) return;
		const rect = target.getBoundingClientRect();
		if (rect.width <= 0) return;
		setCanvasWidth(rect.width);
		const relX = ((clientX - rect.left) / rect.width) * width;
		const idx = Math.max(
			0,
			Math.min(last, Math.round(((relX - padX) / Math.max(1, width - 2 * padX)) * last)),
		);
		setHoverIndex(idx);
	};

	const stepSelection = (delta: number) => {
		if (points.length === 0) return;
		const current = keyboardIndex ?? hoverIndex ?? last;
		const next = Math.max(0, Math.min(last, current + delta));
		setKeyboardIndex(next);
		if (wrapRef.current) setCanvasWidth(wrapRef.current.getBoundingClientRect().width);
	};

	const midIndex = Math.floor(last / 2);

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
				<div className="grid gap-1">
					<h2 id={id} className="m-0 text-[15px] font-semibold tracking-[-0.012em] text-foreground">
						{title}
					</h2>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
						<span className="inline-flex items-center gap-1.5">
							<span aria-hidden="true" className="size-2 rounded-full bg-foreground" />
							<span>Pageviews</span>
						</span>
						<span className="inline-flex items-center gap-1.5">
							<span
								aria-hidden="true"
								className="w-3.5 border-t-2 border-dashed border-primary-text"
							/>
							<span>{hourly ? "Visitor-days / hr" : "Visitor-days"}</span>
						</span>
					</div>
				</div>

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
					className="max-h-96 overflow-auto rounded-[12px] border border-line"
					role="region"
					aria-label="Traffic data"
					tabIndex={0}
				>
					<table className="w-full border-collapse text-left text-[13px] tabular-nums">
						<thead className="sticky top-0 bg-surface-solid">
							<tr className="border-b border-line text-[11px] text-muted-foreground">
								<th scope="col" className="px-3 py-2.5 font-mono font-medium">
									UTC
								</th>
								<th scope="col" className="px-3 py-2.5 text-right font-mono font-medium">
									{hourly ? "Visitor-days / hr" : "Visitor-days"}
								</th>
								<th scope="col" className="px-3 py-2.5 text-right font-mono font-medium">
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
									<td className="px-3 py-2 text-right font-medium text-primary-text">
										{countLabel(point.visitorDays)}
									</td>
									<td className="px-3 py-2 text-right font-medium text-foreground">
										{countLabel(point.pageviews)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div className="grid min-w-0 gap-2.5">
					<div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-stretch gap-2.5">
						<div
							aria-hidden="true"
							className="flex flex-col justify-between py-2.5 text-right font-mono text-[10.5px] tabular-nums text-muted-foreground"
						>
							<span>{countLabel(max)}</span>
							{max > 1 ? <span>{countLabel(midLabel)}</span> : null}
							<span>0</span>
						</div>

						<div
							ref={wrapRef}
							role="group"
							tabIndex={0}
							aria-label={`${title} interactive chart. Use left and right arrow keys to inspect data points.`}
							onPointerMove={(event) => {
								if (event.pointerType !== "mouse" && event.buttons === 0) return;
								updateFromPointer(event.clientX, event.currentTarget);
							}}
							onPointerDown={(event) => {
								updateFromPointer(event.clientX, event.currentTarget);
							}}
							onPointerLeave={() => setHoverIndex(null)}
							onFocus={() => {
								if (wrapRef.current) setCanvasWidth(wrapRef.current.getBoundingClientRect().width);
								if (keyboardIndex === null && points.length > 0) setKeyboardIndex(last);
							}}
							onBlur={() => setKeyboardIndex(null)}
							onKeyDown={(event) => {
								if (event.key === "ArrowLeft") {
									event.preventDefault();
									stepSelection(-1);
								} else if (event.key === "ArrowRight") {
									event.preventDefault();
									stepSelection(1);
								} else if (event.key === "Home") {
									event.preventDefault();
									setKeyboardIndex(0);
								} else if (event.key === "End") {
									event.preventDefault();
									setKeyboardIndex(last);
								} else if (event.key === "Escape") {
									setKeyboardIndex(null);
									setHoverIndex(null);
								}
							}}
							className="cms-page-focus relative min-w-0 cursor-crosshair select-none rounded-[12px]"
						>
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
										<motion.rect
											x={0}
											y={0}
											width={width}
											height={height}
											style={{ transformOrigin: "0px 0px" }}
											initial={reduced ? { scaleX: 1, opacity: 0 } : { scaleX: 0 }}
											animate={reduced ? { scaleX: 1, opacity: 1 } : { scaleX: 1 }}
											transition={reduced ? REDUCED : { duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
										/>
									</clipPath>
								</defs>

								{/* Horizontal guide tracks */}
								{[padTop, (padTop + height - padBottom) / 2, height - padBottom].map(
									(lineY, idx) => (
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
									),
								)}

								{/* Series group revealed smoothly left-to-right once (preserves custom dashes) */}
								<motion.g
									clipPath={reduced ? undefined : `url(#${clipId})`}
									initial={reduced ? { opacity: 0 } : undefined}
									animate={reduced ? { opacity: 1 } : undefined}
									transition={reduced ? REDUCED : undefined}
								>
									{/* Area fill under pageviews */}
									{pvArea && !isAllZero ? <path d={pvArea} fill={`url(#${fillId})`} /> : null}

									{/* Pageviews series (solid) */}
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

									{/* Visitor-days series (dashed accent) */}
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

								{/* Hover / keyboard crosshair */}
								{activeIndex !== null && pvCoords[activeIndex] ? (
									<line
										x1={pvCoords[activeIndex]!.x}
										x2={pvCoords[activeIndex]!.x}
										y1={padTop}
										y2={height - padBottom}
										stroke="currentColor"
										strokeWidth="1.25"
										className="text-muted-foreground/70"
										vectorEffect="non-scaling-stroke"
									/>
								) : null}
							</svg>

							{/* Crisp non-distorted active data dots overlaid in CSS space (transform-only) */}
							{activeIndex !== null && pvCoords[activeIndex] && vdCoords[activeIndex] ? (
								<>
									<span
										aria-hidden="true"
										className="pointer-events-none absolute inset-0 transition-transform duration-100 ease-out motion-reduce:transition-none"
										style={{
											transform: `translate3d(${(pvCoords[activeIndex]!.x / width) * 100}%, ${(pvCoords[activeIndex]!.y / height) * 100}%, 0)`,
										}}
									>
										<span className="absolute top-0 left-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-solid bg-foreground shadow-[0_1px_4px_var(--theme-shadow-strong)]" />
									</span>
									<span
										aria-hidden="true"
										className="pointer-events-none absolute inset-0 transition-transform duration-100 ease-out motion-reduce:transition-none"
										style={{
											transform: `translate3d(${(vdCoords[activeIndex]!.x / width) * 100}%, ${(vdCoords[activeIndex]!.y / height) * 100}%, 0)`,
										}}
									>
										<span className="absolute top-0 left-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-solid bg-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--theme-accent)_22%,transparent)]" />
									</span>
								</>
							) : null}

							{/* Quiet center pill on flat zero-data chart */}
							{isAllZero && activeIndex === null ? (
								<div className="pointer-events-none absolute inset-0 grid place-items-center">
									<span className="rounded-full border border-line bg-surface-solid/95 px-3 py-1 font-mono text-[11px] text-muted-foreground shadow-[0_1px_3px_var(--theme-shadow-soft)]">
										Flat baseline · no visits in this range
									</span>
								</div>
							) : null}

							{/* Floating glass tooltip following pointer smoothly */}
							{activePoint ? (
								<div
									className="cms-chart-tooltip px-3 py-2"
									style={{
										width: `${tooltipWidth}px`,
										transform: `translate3d(${clampedLeft}px, 0, 0)`,
									}}
								>
									<p className="m-0 mb-1.5 font-mono text-[10.5px] font-medium text-muted-foreground">
										{format(activePoint)} UTC
									</p>
									<div className="grid gap-1 text-[12px] tabular-nums">
										<div className="flex items-center justify-between gap-3">
											<span className="inline-flex items-center gap-1.5 text-ink-soft">
												<span aria-hidden="true" className="size-1.5 rounded-full bg-foreground" />
												Pageviews
											</span>
											<span className="font-mono font-semibold text-foreground">
												{countLabel(activePoint.pageviews)}
											</span>
										</div>
										<div className="flex items-center justify-between gap-3">
											<span className="inline-flex items-center gap-1.5 text-ink-soft">
												<span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
												Visitor-days
											</span>
											<span className="font-mono font-semibold text-primary-text">
												{countLabel(activePoint.visitorDays)}
											</span>
										</div>
									</div>
								</div>
							) : null}
						</div>
					</div>

					{/* X-axis tick labels */}
					<div className="flex items-center justify-between gap-3 pl-7 font-mono text-[11px] text-muted-foreground">
						<span>{format(points[0])}</span>
						{points.length > 4 ? (
							<span className="hidden sm:inline">{format(points[midIndex])}</span>
						) : null}
						<span>{format(points[last])} UTC</span>
					</div>

					{/* Subtle inspection footer with keyboard stepper */}
					{summaryPoint ? (
						<div className="flex flex-wrap items-center justify-between gap-2 rounded-[11px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2.2%,transparent)] px-3 py-2">
							<div
								aria-live={keyboardIndex !== null ? "polite" : undefined}
								className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] tabular-nums"
							>
								<span className="font-medium text-foreground">{format(summaryPoint)} UTC</span>
								<span className="text-primary-text">
									{countLabel(summaryPoint.visitorDays)}{" "}
									{hourly ? "visitor-days / hr" : "visitor-days"}
								</span>
								<span className="text-muted-foreground">
									{countLabel(summaryPoint.pageviews)} pageviews
								</span>
							</div>
							<div className="flex items-center gap-1">
								<button
									type="button"
									aria-label="Inspect previous point"
									disabled={(activeIndex ?? last) <= 0}
									onClick={() => stepSelection(-1)}
									className="cms-press cms-page-focus inline-grid size-7 place-items-center rounded-full border border-line bg-surface-solid font-mono text-[12px] text-ink-soft hover:border-line-strong hover:text-foreground disabled:opacity-40 pointer-coarse:size-11"
								>
									←
								</button>
								<button
									type="button"
									aria-label="Inspect next point"
									disabled={(activeIndex ?? last) >= last}
									onClick={() => stepSelection(1)}
									className="cms-press cms-page-focus inline-grid size-7 place-items-center rounded-full border border-line bg-surface-solid font-mono text-[12px] text-ink-soft hover:border-line-strong hover:text-foreground disabled:opacity-40 pointer-coarse:size-11"
								>
									→
								</button>
							</div>
						</div>
					) : null}
				</div>
			)}
		</section>
	);
}
