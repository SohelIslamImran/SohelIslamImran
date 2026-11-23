/**
 * Splits a non-negative integer into zero-padded decimal digits for
 * `RollingNumber`. Returns `null` for negative, fractional, or non-finite
 * inputs, and for integers too large to print as plain digits, so the component can fall back to plain text.
 */
export function rollingDigits(value: number, pad = 2): number[] | null {
	if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) return null;
	const width = Number.isFinite(pad) && pad > 0 ? Math.floor(pad) : 0;
	// Past 1e21 `String` switches to exponent notation; render those as text.
	const raw = String(value);
	if (!/^\d+$/.test(raw)) return null;
	const text = raw.padStart(width, "0");
	return Array.from(text, (digit) => Number(digit));
}
