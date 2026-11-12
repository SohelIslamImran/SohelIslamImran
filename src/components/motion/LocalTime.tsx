import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface LocalTimeState {
	/** Formatted clock, e.g. "14:05". Null on the server and before mount. */
	time: string | null;
	/** UTC offset label, e.g. "UTC+6". Null until mounted. */
	offset: string | null;
	/** ISO timestamp for `<time dateTime>`. */
	iso: string | null;
}

function formatOffset(timeZone: string, now: Date): string | null {
	try {
		const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
			.formatToParts(now)
			.find((entry) => entry.type === "timeZoneName")?.value;
		if (!part) return null;
		return part === "GMT" ? "UTC" : part.replace("GMT", "UTC");
	} catch {
		return null;
	}
}

/**
 * Live wall-clock time for an IANA zone. Hydration-safe: returns nulls until
 * mounted, then ticks on the minute (or second) boundary. Invalid zones stay null.
 */
export function useLocalTime(
	timeZone: string,
	options: { seconds?: boolean; hour12?: boolean } = {},
): LocalTimeState {
	const { seconds = false, hour12 = false } = options;
	const [state, setState] = useState<LocalTimeState>({ time: null, offset: null, iso: null });

	useEffect(() => {
		let formatter: Intl.DateTimeFormat;
		try {
			formatter = new Intl.DateTimeFormat(hour12 ? "en-US" : "en-GB", {
				timeZone,
				hour: "2-digit",
				minute: "2-digit",
				second: seconds ? "2-digit" : undefined,
				hour12,
			});
		} catch {
			return;
		}
		let timer: number | undefined;
		const tick = () => {
			const now = new Date();
			setState({
				time: formatter.format(now),
				offset: formatOffset(timeZone, now),
				iso: now.toISOString(),
			});
			const unit = seconds ? 1000 : 60_000;
			timer = window.setTimeout(tick, unit - (now.getTime() % unit) + 20);
		};
		tick();
		const onVisible = () => {
			if (document.visibilityState !== "visible") return;
			window.clearTimeout(timer);
			tick();
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			window.clearTimeout(timer);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [timeZone, seconds, hour12]);

	return state;
}

interface LocalTimeProps {
	/** IANA zone, e.g. "Asia/Dhaka". */
	timeZone: string;
	seconds?: boolean;
	hour12?: boolean;
	/** Append the UTC offset ("14:05 UTC+6"). */
	showOffset?: boolean;
	/** Shown on the server and before mount; keep it the same width as the clock. */
	placeholder?: string;
	className?: string;
}

/** Renders a `<time>` with the live local time for `timeZone`. */
export function LocalTime({
	timeZone,
	seconds = false,
	hour12 = false,
	showOffset = false,
	placeholder,
	className,
}: LocalTimeProps) {
	const { time, offset, iso } = useLocalTime(timeZone, { seconds, hour12 });
	const fallback = placeholder ?? (seconds ? "--:--:--" : "--:--");
	return (
		<time
			data-slot="local-time"
			dateTime={iso ?? undefined}
			className={cn("tabular-nums", className)}
		>
			{time ?? fallback}
			{showOffset && offset ? (
				<span className="ml-[0.5ch] text-muted-foreground">{offset}</span>
			) : null}
		</time>
	);
}
