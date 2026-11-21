import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";
import type { AnalyticsCount } from "../../../server/analytics.server";
import type { useLiveVisitors } from "./LiveVisitors";

export const controlClass =
	"inline-flex min-h-11 items-center justify-center rounded-[10px] border border-line px-3 font-medium text-foreground no-underline hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export const visitorDayDescription =
	"Each visitor counts once per UTC day and can count again on another day.";

const numbers = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
export const countLabel = (value: number) => numbers.format(value);

export function Delta({
	value,
	comparison,
	unit,
}: {
	value: number | null;
	comparison: string;
	unit?: string;
}) {
	return (
		<span className="text-xs text-muted-foreground">
			{value === null ? (
				"No comparison"
			) : value === 0 ? (
				"No change"
			) : (
				<>
					<span aria-hidden="true">{value > 0 ? "↑" : "↓"}</span> {countLabel(Math.abs(value))}
					{unit ? ` ${unit}` : ""} {value > 0 ? "more" : "fewer"}
				</>
			)}
			{value ? ` ${comparison}` : ""}
		</span>
	);
}

export function Panel({
	title,
	children,
	className,
}: {
	title: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={cn("cms-panel grid min-w-0 content-start gap-3 p-[18px]", className)}>
			<h2 className="m-0 text-base font-semibold">{title}</h2>
			{children}
		</section>
	);
}

export function RankedList({
	rows,
	empty = "No data in this period.",
}: {
	rows: AnalyticsCount[];
	empty?: string;
}) {
	if (rows.length === 0) return <p className="m-0 text-sm text-muted-foreground">{empty}</p>;
	return (
		<ul className="m-0 grid list-none divide-y divide-line p-0">
			{rows.map((row) => (
				<li key={row.value} className="flex min-w-0 items-baseline justify-between gap-3 py-2">
					<span className="min-w-0 [overflow-wrap:anywhere]">{row.label ?? row.value}</span>
					<span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
						{countLabel(row.count)}
					</span>
				</li>
			))}
		</ul>
	);
}

export function NoVisits({ allTime = false }: { allTime?: boolean }) {
	return (
		<p className="m-0 rounded-[10px] border border-line px-3 py-2 text-muted-foreground">
			{allTime ? "No visits recorded yet" : "No visits in this period"}
		</p>
	);
}

export function AnalyticsUnavailable() {
	const router = useRouter();
	return (
		<Panel title="Analytics unavailable">
			<p className="m-0 text-muted-foreground">Traffic data could not be loaded.</p>
			<button
				type="button"
				className={`${controlClass} justify-self-start`}
				onClick={() => void router.invalidate()}
			>
				Try again
			</button>
		</Panel>
	);
}

export function Sparkline({ points }: { points: number[] }) {
	const data = points.length > 1 ? points : [points[0] ?? 0, points[0] ?? 0];
	const max = Math.max(1, ...data);
	const line = data
		.map((point, index) => `${(index / (data.length - 1)) * 108},${23 - (point / max) * 20}`)
		.join(" ");
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 108 26"
			preserveAspectRatio="none"
			className="h-7 w-full text-primary-text"
		>
			<polyline
				points={line}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
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
}: {
	label: string;
	value: number | null;
	points: number[];
	delta: number | null;
	comparison: string;
	live?: boolean;
}) {
	return (
		<div className="cms-panel grid min-w-0 content-between gap-2 p-3">
			<div className="flex items-center justify-between gap-2">
				<h2 className="mono-label m-0 text-muted-foreground">{label}</h2>
				{live && (
					<span aria-hidden="true" className="relative size-2">
						<span className="absolute inset-0 rounded-full bg-primary-text motion-safe:animate-ping" />
						<span className="absolute inset-0 rounded-full bg-primary-text" />
					</span>
				)}
			</div>
			<span className="text-2xl font-semibold tracking-tight tabular-nums">
				{value === null ? "—" : countLabel(value)}
			</span>
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
		<div className="flex flex-wrap items-center gap-3">
			<button type="button" className={controlClass} onClick={() => setPaused(!paused)}>
				{paused ? "Resume live updates" : "Pause live updates"}
			</button>
			{paused ? (
				<span className="text-xs text-muted-foreground">Paused</span>
			) : failed ? (
				<span className="text-xs text-muted-foreground">Live data unavailable</span>
			) : null}
		</div>
	);
}
