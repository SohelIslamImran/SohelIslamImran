import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { rollingDigits } from "./rolling-number";

const DIGIT_STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export interface RollingNumberProps {
	/** A non-negative integer. Anything else renders as plain text. */
	value: number;
	/** Minimum digit count, zero-padded. Default 2. */
	pad?: number;
	className?: string;
}

export function RollingNumber({ value, pad = 2, className }: RollingNumberProps) {
	const digits = rollingDigits(value, pad);
	if (!digits) {
		return (
			<span data-slot="rolling-number" className={className}>
				{String(value)}
			</span>
		);
	}
	const text = digits.join("");
	return (
		<span data-slot="rolling-number" className={cn("rolling-number", className)}>
			<span className="sr-only">{text}</span>
			<span aria-hidden="true" className="rolling-number__digits">
				{digits.map((digit, index) => (
					<span
						key={digits.length - 1 - index}
						className="rolling-number__col"
						style={{ "--d": digit } as CSSProperties}
					>
						<span className="rolling-number__strip">
							{DIGIT_STRIP.map((n) => (
								<span key={n} className="rolling-number__digit">
									{n}
								</span>
							))}
						</span>
					</span>
				))}
			</span>
		</span>
	);
}
