import { useId, useState } from "react";
import type { TrafficPoint } from "../../../server/analytics.server";
import { controlClass, countLabel } from "./Widgets";

const width = 600;
const height = 156;
const inset = 8;
const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const hour = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
	timeZone: "UTC",
});

export function TrafficChart({
	points,
	hourly = false,
	title = "Traffic",
}: {
	points: TrafficPoint[];
	hourly?: boolean;
	title?: string;
}) {
	const [selection, setSelection] = useState<number | null>(null);
	const [asTable, setAsTable] = useState(false);
	const id = useId();
	const last = points.length - 1;
	const index = Math.min(selection ?? last, last);
	const selected = points[index];
	const max = Math.max(1, ...points.map((point) => Math.max(point.visitorDays, point.pageviews)));
	const x = (i: number) => inset + (i / Math.max(1, last)) * (width - 2 * inset);
	const y = (value: number) => height - inset - (value / max) * (height - 2 * inset);
	const format = (point: TrafficPoint | undefined) =>
		point ? (hourly ? hour : date).format(new Date(point.at)) : "";
	const shape = (metric: "pageviews" | "visitorDays") =>
		points.map((point, i) => `${x(i)},${y(point[metric])}`).join(" ");

	return (
		<section aria-labelledby={id} className="cms-panel grid min-w-0 gap-3 p-[18px]">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 id={id} className="m-0 text-base font-semibold">
					{title}
				</h2>
				<button type="button" className={controlClass} onClick={() => setAsTable(!asTable)}>
					{asTable ? "View as chart" : "View as table"}
				</button>
			</div>
			{asTable ? (
				<div
					className="max-h-96 overflow-auto rounded-[10px] border border-line"
					role="region"
					aria-label="Traffic data"
					tabIndex={0}
				>
					<table className="w-full border-collapse text-left text-sm tabular-nums">
						<thead className="sticky top-0 bg-background">
							<tr>
								<th scope="col" className="p-2">
									UTC
								</th>
								<th scope="col" className="p-2 text-right">
									{hourly ? "Visitor-days per hour" : "Visitor-days"}
								</th>
								<th scope="col" className="p-2 text-right">
									Pageviews
								</th>
							</tr>
						</thead>
						<tbody>
							{points.map((point) => (
								<tr key={point.at} className="border-t border-line">
									<th scope="row" className="p-2 font-mono text-xs font-normal">
										{format(point)}
									</th>
									<td className="p-2 text-right">{countLabel(point.visitorDays)}</td>
									<td className="p-2 text-right">{countLabel(point.pageviews)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<>
					<div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-2">
							<span aria-hidden="true" className="w-5 border-t-2 border-foreground" />
							Pageviews
						</span>
						<span className="inline-flex items-center gap-2">
							<span
								aria-hidden="true"
								className="w-5 border-t-2 border-dashed border-primary-text"
							/>
							{hourly ? "Visitor-days per hour" : "Visitor-days"}
						</span>
					</div>
					<div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-stretch gap-2">
						<div
							aria-hidden="true"
							className="flex flex-col justify-between py-1 font-mono text-[11px] text-muted-foreground"
						>
							<span>{countLabel(max)}</span>
							<span>0</span>
						</div>
						<svg
							aria-hidden="true"
							viewBox={`0 0 ${width} ${height}`}
							preserveAspectRatio="none"
							className="h-36 w-full sm:h-48"
							onPointerMove={(event) => {
								if (event.pointerType !== "mouse" && event.buttons === 0) return;
								const box = event.currentTarget.getBoundingClientRect();
								const position = ((event.clientX - box.left) / box.width) * width;
								setSelection(
									Math.max(
										0,
										Math.min(last, Math.round(((position - inset) / (width - 2 * inset)) * last)),
									),
								);
							}}
						>
							{[inset, height / 2, height - inset].map((line) => (
								<line
									key={line}
									x1={inset}
									x2={width - inset}
									y1={line}
									y2={line}
									stroke="currentColor"
									className="text-line"
									vectorEffect="non-scaling-stroke"
								/>
							))}
							<polyline
								fill="none"
								stroke="currentColor"
								className="text-foreground"
								strokeWidth="1.5"
								points={shape("pageviews")}
								vectorEffect="non-scaling-stroke"
							/>
							<polyline
								fill="none"
								stroke="currentColor"
								className="text-primary-text"
								strokeWidth="2"
								strokeDasharray="5 4"
								points={shape("visitorDays")}
								vectorEffect="non-scaling-stroke"
							/>
							{selected ? (
								<line
									x1={x(index)}
									x2={x(index)}
									y1={inset}
									y2={height - inset}
									stroke="currentColor"
									className="text-muted-foreground"
									vectorEffect="non-scaling-stroke"
								/>
							) : null}
						</svg>
					</div>
					<div className="flex justify-between gap-3 pl-7 font-mono text-[11px] text-muted-foreground">
						<span>{format(points[0])}</span>
						<span>{format(points[last])} UTC</span>
					</div>
					{selected ? (
						<div className="grid min-w-0 gap-1 rounded-[10px] border border-line px-3 py-2">
							<label htmlFor={`${id}-position`} className="text-sm font-medium">
								Inspect traffic
							</label>
							<input
								id={`${id}-position`}
								type="range"
								min={0}
								max={last}
								value={index}
								aria-valuetext={`${format(selected)} UTC, ${countLabel(selected.visitorDays)} visitor-days, ${countLabel(selected.pageviews)} pageviews`}
								className="h-11 w-full accent-primary-text focus-visible:outline-2 focus-visible:outline-ring"
								onChange={(event) => setSelection(event.currentTarget.valueAsNumber)}
							/>
							<div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground tabular-nums">
								<span>{format(selected)} UTC</span>
								<span>
									{countLabel(selected.visitorDays)}{" "}
									{hourly ? "visitor-days this hour" : "visitor-days"}
								</span>
								<span>{countLabel(selected.pageviews)} pageviews</span>
							</div>
						</div>
					) : null}
				</>
			)}
		</section>
	);
}
