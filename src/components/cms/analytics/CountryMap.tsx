import { useState } from "react";
import { cn } from "../../../lib/utils";
import type { AnalyticsCount } from "../../../server/analytics.server";
import { LAND_DOTS, MAP_HEIGHT, MAP_WIDTH, dotsPath, project } from "../../home/remote-map";
import { RankedList, countLabel } from "./Widgets";

const ALL_LAND = dotsPath(LAND_DOTS);
const names = new Intl.DisplayNames("en", { type: "region", fallback: "code" });

// Approximate country centers. The list below also includes unmapped countries.
const centers: Record<string, readonly [lat: number, lon: number]> = {
	AE: [24, 54],
	AR: [-35, -65],
	AT: [47, 14],
	AU: [-25, 134],
	BD: [24, 90],
	BE: [51, 4],
	BR: [-10, -53],
	CA: [56, -106],
	CH: [47, 8],
	CL: [-34, -71],
	CN: [35, 104],
	CO: [4, -73],
	CZ: [50, 15],
	DE: [51, 10],
	DK: [56, 10],
	EG: [27, 30],
	ES: [40, -4],
	FI: [64, 26],
	FR: [46, 2],
	GB: [55, -3],
	GR: [39, 22],
	HK: [22, 114],
	HU: [47, 20],
	ID: [-2, 118],
	IE: [53, -8],
	IL: [31, 35],
	IN: [22, 79],
	IT: [43, 12],
	JP: [37, 138],
	KE: [0, 38],
	KR: [36, 128],
	LK: [7, 81],
	MX: [23, -102],
	MY: [4, 102],
	NG: [10, 8],
	NL: [52, 5],
	NO: [62, 10],
	NP: [28, 84],
	NZ: [-42, 173],
	PE: [-10, -75],
	PH: [12, 122],
	PK: [30, 70],
	PL: [52, 19],
	PT: [40, -8],
	RO: [46, 25],
	RU: [61, 100],
	SA: [24, 45],
	SE: [62, 16],
	SG: [1, 104],
	TH: [15, 101],
	TR: [39, 35],
	TW: [24, 121],
	UA: [49, 32],
	US: [39, -98],
	VN: [16, 107],
	ZA: [-30, 25],
};

export function CountryMap({ rows }: { rows: AnalyticsCount[] }) {
	const [activeCountry, setActiveCountry] = useState<string | null>(null);
	const labels = rows.map((row) => ({
		...row,
		label: row.value === "unknown" ? "Unknown" : names.of(row.value),
	}));
	const max = rows[0]?.count ?? 1;
	const activeEntry = activeCountry ? labels.find((item) => item.value === activeCountry) : null;

	return (
		<div className="grid gap-3">
			<div className="relative overflow-hidden rounded-[12px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2%,transparent)] p-3">
				<svg
					viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
					aria-hidden="true"
					className="block h-auto w-full"
				>
					<path
						d={ALL_LAND}
						fill="none"
						stroke="currentColor"
						strokeWidth="4.5"
						strokeLinecap="round"
						className="text-muted-foreground/35"
					/>
					{rows.map(({ value, count }) => {
						const center = centers[value];
						if (!center) return null;
						const [lat, lon] = center;
						const { x, y } = project({ lat, lon });
						const r = 4.5 + Math.sqrt(count / max) * 8.5;
						const active = activeCountry === value;
						return (
							<g
								key={value}
								onMouseEnter={() => setActiveCountry(value)}
								onMouseLeave={() => setActiveCountry(null)}
								className="cursor-pointer"
							>
								<circle
									cx={x}
									cy={y}
									r={active ? r + 8 : r + 4.5}
									fill="currentColor"
									className={cn(
										"text-primary transition-opacity duration-200",
										active ? "opacity-30" : "opacity-15",
									)}
								/>
								<circle
									cx={x}
									cy={y}
									r={active ? r + 1.5 : r}
									fill="currentColor"
									className="text-primary-text transition-opacity duration-150"
								/>
							</g>
						);
					})}
				</svg>

				{activeEntry ? (
					<div className="pointer-events-none absolute right-2.5 bottom-2.5 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface-solid/95 px-2.5 py-1 text-[11.5px] shadow-[0_2px_10px_var(--theme-shadow)]">
						<span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
						<span className="font-medium text-foreground">{activeEntry.label}</span>
						<span className="font-mono tabular-nums text-primary-text">
							{countLabel(activeEntry.count)}
						</span>
					</div>
				) : null}
			</div>

			<RankedList
				rows={labels}
				empty="No country traffic in this period."
				highlightedValue={activeCountry}
				onHoverValue={setActiveCountry}
			/>
		</div>
	);
}
