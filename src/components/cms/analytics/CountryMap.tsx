import type { AnalyticsCount } from "../../../server/analytics.server";
import { LAND_DOTS, MAP_HEIGHT, MAP_WIDTH, dotsPath, project } from "../../home/remote-map";
import { RankedList } from "./Widgets";

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
	const labels = rows.map((row) => ({
		...row,
		label: row.value === "unknown" ? "Unknown" : names.of(row.value),
	}));
	const max = rows[0]?.count ?? 1;
	return (
		<>
			<svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden="true" className="h-auto w-full">
				<path
					d={ALL_LAND}
					fill="none"
					stroke="currentColor"
					strokeWidth="4.5"
					strokeLinecap="round"
					className="text-muted-foreground/45"
				/>
				{rows.map(({ value, count }) => {
					const center = centers[value];
					if (!center) return null;
					const [lat, lon] = center;
					const { x, y } = project({ lat, lon });
					return (
						<circle
							key={value}
							cx={x}
							cy={y}
							r={4 + Math.sqrt(count / max) * 9}
							fill="currentColor"
							className="text-primary-text"
						/>
					);
				})}
			</svg>
			<RankedList rows={labels} />
		</>
	);
}
