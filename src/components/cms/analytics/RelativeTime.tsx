/**
 * Hydration-stable relative time for CMS pages.
 *
 * One shared clock ticks every 30 seconds. During SSR and hydration the clock
 * reads `null`, so server and client markup match and the label slot renders
 * empty at a fixed minimum width; once hydrated the label fades in without
 * reflowing the line. Rows that mount later (client-fetched lists) read the
 * clock synchronously, so they never flash an absolute timestamp first.
 */
import { useSyncExternalStore } from "react";
import { cn } from "../../../lib/utils";
import { formatRelativeFromNow, formatUtcTimestamp } from "../shell/time";

const TICK_MS = 30_000;
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
	const label = nowMs === null ? "" : formatRelativeFromNow(utc, nowMs);
	return (
		<time
			dateTime={utc}
			title={formatUtcTimestamp(utc)}
			className={cn(
				"inline-block min-w-[6ch] tabular-nums",
				label ? "cms-time-in" : "opacity-0",
				className,
			)}
		>
			{label || " "}
		</time>
	);
}
