/**
 * Splits a non-negative integer into zero-padded decimal digits for
 * `RollingNumber`. Returns `null` for negative, fractional, or non-finite
 * inputs so the component can fall back to plain text.
 */
export function rollingDigits(value: number, pad = 2): number[] | null {
	if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) return null;
	const width = Number.isFinite(pad) && pad > 0 ? Math.floor(pad) : 0;
	const text = String(value).padStart(width, "0");
	return Array.from(text, (digit) => Number(digit));
}
