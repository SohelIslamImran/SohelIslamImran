/**
 * Hydration-stable relative time for CMS pages.
 *
 * One shared clock ticks every 30 seconds. During SSR and hydration the clock
 * reads `null`, so server and client render the same date. The relative
 * label fades into the same slot once hydrated.
 */
import { useSyncExternalStore } from "react";
import { cn } from "../../../lib/utils";
import { formatRelativeFromNow, formatUtcTimestamp, parseCmsTimestamp } from "../shell/time";

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
	const parsed = parseCmsTimestamp(iso);
	const valid = Number.isFinite(parsed);
	const relative = nowMs === null ? "" : formatRelativeFromNow(iso, nowMs);
	const absolute = valid ? shortDate.format(parsed) : formatUtcTimestamp(iso);
	return (
		<time
			dateTime={valid ? new Date(parsed).toISOString() : iso}
			title={formatUtcTimestamp(iso)}
			className={cn("inline-block w-[8ch] whitespace-nowrap tabular-nums", className)}
		>
			{relative ? <span className="cms-time-in">{relative}</span> : absolute}
		</time>
	);
}
