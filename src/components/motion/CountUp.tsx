import { useRef } from "react";
import { animate } from "motion/react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, useEnterViewportOnce } from "./hooks";

export interface ParsedCount {
	prefix: string;
	value: number;
	decimals: number;
	grouped: boolean;
	suffix: string;
}

/**
 * Splits a display value such as "79,185", "280k", "5 years", "$1.2M" or
 * "99.9%" into prefix / number / suffix. Returns null when there is no number.
 */
export function parseCount(text: string): ParsedCount | null {
	const match = /^(\D*?)(\d[\d,]*(?:\.\d+)?)([\s\S]*)$/u.exec(text);
	if (!match) return null;
	const [, prefix = "", digits = "", suffix = ""] = match;
	const value = Number(digits.replaceAll(",", ""));
	if (!Number.isFinite(value)) return null;
	return {
		prefix,
		value,
		decimals: digits.includes(".") ? (digits.split(".")[1]?.length ?? 0) : 0,
		grouped: digits.includes(","),
		suffix,
	};
}

export function formatCount(parsed: ParsedCount, current: number): string {
	const number = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: parsed.decimals,
		maximumFractionDigits: parsed.decimals,
		useGrouping: parsed.grouped,
	}).format(current);
	return `${parsed.prefix}${number}${parsed.suffix}`;
}

/** Mutates React's own text node so later prop updates still land. */
function setText(element: HTMLElement, text: string) {
	const node = element.firstChild;
	if (node && node.nodeType === Node.TEXT_NODE) node.nodeValue = text;
	else element.textContent = text;
}

interface CountUpProps {
	/** The final display value, e.g. "79,185" or "5 years". Rendered as-is on the server. */
	value: string;
	/** Seconds. Defaults to 1.4. */
	duration?: number;
	className?: string;
}

/**
 * Counts up to `value` when it first scrolls into view. The server and any
 * already-visible instance show the final value immediately (no flash), the
 * box is sized by the final value (no layout shift), and assistive tech only
 * ever hears the final value.
 */
export function CountUp({ value, duration = 1.4, className }: CountUpProps) {
	const rootRef = useRef<HTMLSpanElement>(null);
	const liveRef = useRef<HTMLSpanElement>(null);
	const parsed = parseCount(value);

	useEnterViewportOnce(rootRef, (wasVisibleOnMount) => {
		const live = liveRef.current;
		if (!parsed || !live || wasVisibleOnMount || prefersReducedMotion()) return;
		setText(live, formatCount(parsed, 0));
		const controls = animate(0, parsed.value, {
			duration,
			ease: [0.22, 1, 0.36, 1],
			onUpdate: (latest) => {
				setText(live, formatCount(parsed, parsed.decimals ? latest : Math.round(latest)));
			},
			onComplete: () => {
				setText(live, value);
			},
		});
		return () => {
			controls.stop();
			setText(live, value);
		};
	});

	return (
		<span ref={rootRef} data-slot="count-up" className={cn("inline-grid tabular-nums", className)}>
			<span aria-hidden="true" className="invisible col-start-1 row-start-1">
				{value}
			</span>
			<span ref={liveRef} aria-hidden="true" className="col-start-1 row-start-1">
				{value}
			</span>
			<span className="sr-only">{value}</span>
		</span>
	);
}
