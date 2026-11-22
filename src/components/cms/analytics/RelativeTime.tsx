/**
 * Hydration-stable relative time for CMS pages.
 *
 * One shared clock ticks every 30 seconds. During SSR and hydration the clock
 * reads `null`, so server and client render the same date. The relative
 * label fades into the same slot once hydrated.
 */
import { useSyncExternalStore } from "react";
import { cn } from "../../../lib/utils";
import { formatRelativeFromNow, formatUtcTimestamp } from "../shell/time";

const TICK_MS = 30_000;
const shortDate = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
});
let now: number | null = null;
let timer: number | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	if (timer === undefined) {
		timer = window.setInterval(() => {
			now = Date.now();
			for (const notify of listeners) notify();
		}, TICK_MS);
	}
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0 && timer !== undefined) {
			window.clearInterval(timer);
			timer = undefined;
			now = null;
		}
	};
}

function getSnapshot(): number {
	now ??= Date.now();
	return now;
}

function getServerSnapshot(): number | null {
	return null;
}

/**
 * D1 timestamps arrive as `YYYY-MM-DD HH:MM:SS` with no zone. `Date.parse`
 * reads that as local time in the browser but UTC on the server, which skews
 * relative labels and breaks hydration. Treat zone-less timestamps as UTC.
 */
export function asUtcIso(value: string): string {
	return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/u.test(value)
		? `${value.replace(" ", "T")}Z`
		: value;
}

/** Current time in ms, or `null` during SSR and hydration. */
export function useNow(): number | null {
	return useSyncExternalStore<number | null>(subscribe, getSnapshot, getServerSnapshot);
}

export function RelativeTime({
	iso,
	className,
	fallback = "",
}: {
	iso: string | null | undefined;
	className?: string;
	/** Text when `iso` is missing. */
	fallback?: string;
}) {
	const nowMs = useNow();
	if (!iso) return fallback ? <span className={className}>{fallback}</span> : null;
	const utc = asUtcIso(iso);
	const relative = nowMs === null ? "" : formatRelativeFromNow(utc, nowMs);
	const parsed = Date.parse(utc);
	const absolute = Number.isFinite(parsed) ? shortDate.format(parsed) : formatUtcTimestamp(utc);
	return (
		<time
			dateTime={utc}
			title={formatUtcTimestamp(utc)}
			className={cn("inline-block w-[8ch] whitespace-nowrap tabular-nums", className)}
		>
			{relative ? <span className="cms-time-in">{relative}</span> : absolute}
		</time>
	);
}
