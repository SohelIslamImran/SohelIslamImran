import type { CSSProperties } from "react";

export const prismPalettes = [
	{ name: "Cobalt", value: "#2f5cff" },
	{ name: "Sky blue", value: "#42b7ff" },
	{ name: "Azure", value: "#1294d8" },
	{ name: "Tangerine", value: "#ff7657" },
	{ name: "Violet", value: "#825cff" },
	{ name: "Mint", value: "#18b89a" },
] as const;

function contrastInk(hex: string) {
	const value = hex.replace("#", "");
	const red = Number.parseInt(value.slice(0, 2), 16);
	const green = Number.parseInt(value.slice(2, 4), 16);
	const blue = Number.parseInt(value.slice(4, 6), 16);
	const linear = (channel: number) => {
		const value = channel / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};
	const luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
	const darkContrast = (luminance + 0.05) / 0.05;
	const lightContrast = 1.05 / (luminance + 0.05);
	return darkContrast >= lightContrast ? "#10213c" : "#ffffff";
}

export function prismAccentStyle(accent: string) {
	return {
		"--prism-blue": accent,
		"--prism-blue-soft": `color-mix(in srgb, ${accent} 13%, white)`,
		"--prism-picker-ink": contrastInk(accent),
		"--prism-picker-soft": `color-mix(in srgb, ${accent} 11%, transparent)`,
	} as CSSProperties;
}

interface ColorPlaygroundProps {
	accent: string;
	onAccentChange: (accent: string) => void;
}

export function ColorPlayground({ accent, onAccentChange }: ColorPlaygroundProps) {
	const paletteName = prismPalettes.find((palette) => palette.value === accent)?.name ?? "Custom";

	return (
		<section className="links-color-studio prism-glass-card" aria-labelledby="links-color-title">
			<div className="links-color-studio__copy">
				<p className="eyebrow">Color studio</p>
				<h2 id="links-color-title">Find the right signal.</h2>
				<p>Preview the link desk in a different primary hue. This only changes your local view.</p>
			</div>
			<div className="links-color-studio__controls">
				<div className="links-color-swatches" role="group" aria-label="Choose a primary color">
					{prismPalettes.map((palette) => (
						<button
							key={palette.value}
							type="button"
							className="links-color-swatch"
							style={{ "--swatch": palette.value } as CSSProperties}
							aria-label={`Use ${palette.name}`}
							aria-pressed={accent === palette.value}
							onClick={() => onAccentChange(palette.value)}
						/>
					))}
				</div>
				<label className="links-color-input">
					<span>Custom</span>
					<input
						aria-label="Choose a custom primary color"
						type="color"
						value={accent}
						onChange={(event) => onAccentChange(event.target.value)}
					/>
				</label>
				<output className="links-color-value" aria-live="polite">
					<span style={{ background: accent }} aria-hidden="true" />
					{paletteName} · {accent.toUpperCase()}
				</output>
			</div>
		</section>
	);
}
