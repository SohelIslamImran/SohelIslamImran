/**
 * Hydration-safe relative time and byte formatting helpers for the CMS.
 * Never calls `Date.now()` during render: SSR and first client paint show a
 * neutral placeholder, then an effect ticks the relative label.
 */
import { useEffect, useState } from "react";

export function formatRelativeFromNow(iso: string | null | undefined, nowMs: number): string {
	if (!iso) return "";
	const timestamp = Date.parse(iso);
	if (!Number.isFinite(timestamp)) return "";
	const diffSeconds = Math.max(0, Math.floor((nowMs - timestamp) / 1000));
	if (diffSeconds < 5) return "just now";
	if (diffSeconds < 60) return `${diffSeconds}s ago`;
	const minutes = Math.floor(diffSeconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo ago`;
	return `${Math.floor(months / 12)}y ago`;
}

/**
 * Returns a ticking relative time string (e.g. `"12s ago"`), or `null` during
 * SSR and before hydration completes so server and client HTML always match.
 */
export function useRelativeTime(
	iso: string | null | undefined,
	intervalMs = 10_000,
): string | null {
	const [nowMs, setNowMs] = useState<number | null>(null);

	useEffect(() => {
		setNowMs(Date.now());
		const timer = window.setInterval(() => setNowMs(Date.now()), intervalMs);
		return () => window.clearInterval(timer);
	}, [iso, intervalMs]);

	if (nowMs === null || !iso) return null;
	return formatRelativeFromNow(iso, nowMs);
}

/** Deterministic UTC timestamp string safe for SSR & tooltips. */
export function formatUtcTimestamp(iso: string | null | undefined): string {
	if (!iso) return "—";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	const y = date.getUTCFullYear();
	const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	const h = String(date.getUTCHours()).padStart(2, "0");
	const mi = String(date.getUTCMinutes()).padStart(2, "0");
	return `${y}-${mo}-${d} ${h}:${mi} UTC`;
}

export function formatBytes(bytes: number | null | undefined): string {
	if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "—";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
