import { cn } from "@/lib/utils";

export interface RollingNumberProps {
	/** A non-negative integer. Anything else renders as plain text. */
	value: number;
	/** Minimum digit count, zero-padded. Default 2. */
	pad?: number;
	className?: string;
}

export function RollingNumber({ value, pad = 2, className }: RollingNumberProps) {
	const valid = Number.isInteger(value) && value >= 0;
	return (
		<span data-slot="rolling-number" className={cn("tabular-nums", className)}>
			{valid ? String(value).padStart(pad, "0") : String(value)}
		</span>
	);
}
