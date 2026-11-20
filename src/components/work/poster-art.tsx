import type { CSSProperties, ReactNode } from "react";
import { hashString, monogram, seededRandom } from "./project-utils";

/*
 * Hand-drawn SVG artwork for each project, on a shared 480 × 300 canvas.
 * Every piece is a small illustration of what the project does. Paint and
 * motion classes (`wp-*`) live in poster-styles.ts; nothing here hard-codes a
 * colour, so the art follows the theme and accent.
 */

export const POSTER_WIDTH = 480;
export const POSTER_HEIGHT = 300;

/**
 * Every poster is three transparent planes drawn on the same canvas. At rest
 * they line up into one flat picture; on tilt, hover, or focus they separate
 * in 3D, so you can see what sits behind the screen.
 */
export interface PosterLayers {
	back: ReactNode;
	mid: ReactNode;
	front: ReactNode;
}

export interface PosterArtProps {
	/** Unique, SSR-stable prefix for <defs> ids. */
	uid: string;
	id: string;
	title: string;
}

type Vars = CSSProperties & Record<`--${string}`, string | number>;

function Bar({
	x,
	y,
	w,
	h = 6,
	className = "wp-k2",
	style,
}: {
	x: number;
	y: number;
	w: number;
	h?: number;
	className?: string;
	style?: Vars;
}) {
	return <rect x={x} y={y} width={w} height={h} rx={h / 2} className={className} style={style} />;
}

function TrafficLights({ x, y }: { x: number; y: number }) {
	return (
		<g>
			<circle cx={x} cy={y} r={3.5} className="wp-k3" />
			<circle cx={x + 12} cy={y} r={3.5} className="wp-k2" />
			<circle cx={x + 24} cy={y} r={3.5} className="wp-k2" />
		</g>
	);
}

function Glow({ uid, cx, cy, r }: { uid: string; cx: number; cy: number; r: number }) {
	const id = `${uid}-glow`;
	return (
		<>
			<defs>
				<radialGradient id={id}>
					<stop offset="0%" style={{ stopColor: "var(--theme-accent)", stopOpacity: 0.28 }} />
					<stop offset="100%" style={{ stopColor: "var(--theme-accent)", stopOpacity: 0 }} />
				</radialGradient>
			</defs>
			<circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} className="wp-glow" />
		</>
	);
}

/* ------------------------------------------------------------------ */
/* kuno — a guided 1:1 peer conversation session building a skill     */
/* ------------------------------------------------------------------ */

function KunoArt({ uid }: PosterArtProps): PosterLayers {
	const peerAClip = `${uid}-peer-a`;
	const peerBClip = `${uid}-peer-b`;
	const waveA = [
		{ x: 70.8, h: 6, delay: "0s" },
		{ x: 76.8, h: 10, delay: "0.18s" },
		{ x: 82.8, h: 6, delay: "0.34s" },
	];
	const kunoSteps = [
		{ x: 75, label: "DIAGNOSE", state: "done" },
		{ x: 137, label: "MATCH", state: "done" },
		{ x: 199, label: "PRACTICE", state: "now" },
		{ x: 261, label: "APPLY", state: "next" },
	] as const;
	const waveB = [
		{ x: 394.8, h: 5, delay: "0.1s" },
		{ x: 400.8, h: 9, delay: "0.26s" },
		{ x: 406.8, h: 5, delay: "0.42s" },
	];
	return {
		back: (
			<>
				<Glow uid={uid} cx={240} cy={138} r={168} />
				{/* Session window shell */}
				<g className="wp-drop-lg">
					<rect x={39} y={22} width={402} height={218} rx={16} className="wp-raised" />
				</g>
				{/* Session header */}
				<line x1={39} y1={54} x2={441} y2={54} className="wp-ln" />
				<circle cx={58} cy={38} r={3.2} className="wp-a wp-pulse" />
				<text x={68} y={40.8} fontSize={8} fontWeight={600} letterSpacing={0.6} className="wp-ink">
					1:1 SESSION
				</text>
				{/* Practised workplace skill pill */}
				<rect x={181} y={29} width={118} height={18} rx={9} className="wp-a1" />
				<text
					x={240}
					y={40.6}
					fontSize={7.5}
					fontWeight={600}
					letterSpacing={0.5}
					textAnchor="middle"
					className="wp-at"
				>
					ACTIVE LISTENING
				</text>
				{/* Pacing timer */}
				<rect x={371} y={29} width={54} height={18} rx={9} className="wp-k1" />
				<circle cx={384.5} cy={38} r={3.5} className="wp-ln2" strokeWidth={1.1} />
				<path d="M384.5 36 v2 l1.4 1" className="wp-ln2" strokeWidth={1.1} strokeLinecap="round" />
				<text x={392.5} y={40.6} fontSize={7.5} className="wp-muted">
					14:20
				</text>
				{/* Three-phase session ritual bar (Intent · Practice · Reflect) */}
				<Bar x={55} y={63} w={118} h={4} className="wp-a" />
				<Bar x={181} y={63} w={118} h={4} className="wp-k2" />
				<Bar x={181} y={63} w={78} h={4} className="wp-a" />
				<Bar x={307} y={63} w={118} h={4} className="wp-k2" />
				{/* Subtle lower tray anchor inside the session frame */}
				<rect x={55} y={200} width={370} height={26} rx={9} className="wp-k1" />
			</>
		),
		mid: (
			<>
				<defs>
					<clipPath id={peerAClip}>
						<circle cx={142} cy={121} r={24} />
					</clipPath>
					<clipPath id={peerBClip}>
						<circle cx={338} cy={121} r={24} />
					</clipPath>
				</defs>

				{/* Peer A participant tile */}
				<g className="wp-drop">
					<rect x={55} y={76} width={174} height={108} rx={13} className="wp-surface" />
				</g>
				<rect
					x={55}
					y={76}
					width={174}
					height={108}
					rx={13}
					className="wp-as wp-kuno-ring-a"
					strokeWidth={1.75}
				/>
				<rect x={65} y={85} width={26} height={16} rx={8} className="wp-a1" />
				{waveA.map((bar) => (
					<rect
						key={bar.x}
						x={bar.x}
						y={93 - bar.h / 2}
						width={2.4}
						height={bar.h}
						rx={1.2}
						className="wp-a wp-kuno-wave-a"
						style={{ animationDelay: bar.delay }}
					/>
				))}
				<circle cx={142} cy={121} r={24} className="wp-a1" />
				<g clipPath={`url(#${peerAClip})`}>
					<circle cx={142} cy={113.5} r={8.2} className="wp-a" style={{ opacity: 0.85 }} />
					<path
						d="M122 146 C 122 131, 130 125.5, 142 125.5 C 154 125.5, 162 131, 162 146 Z"
						className="wp-a"
						style={{ opacity: 0.68 }}
					/>
				</g>
				<circle cx={142} cy={121} r={24} className="wp-as-soft" strokeWidth={1.2} />
				<Bar x={67} y={163} w={50} h={5.5} className="wp-k3" />
				<Bar x={123} y={163.5} w={28} h={4.5} className="wp-k2" />
				<circle cx={213} cy={166} r={3} className="wp-a wp-kuno-ring-a" />

				{/* Peer B participant tile */}
				<g className="wp-drop">
					<rect x={251} y={76} width={174} height={108} rx={13} className="wp-surface" />
				</g>
				<rect
					x={251}
					y={76}
					width={174}
					height={108}
					rx={13}
					className="wp-as wp-kuno-ring-b"
					strokeWidth={1.75}
					opacity={0}
				/>
				<rect x={389} y={85} width={26} height={16} rx={8} className="wp-k1" />
				{waveB.map((bar) => (
					<rect
						key={bar.x}
						x={bar.x}
						y={93 - bar.h / 2}
						width={2.4}
						height={bar.h}
						rx={1.2}
						className="wp-k4 wp-kuno-wave-b"
						style={{ animationDelay: bar.delay }}
					/>
				))}
				<circle cx={338} cy={121} r={24} className="wp-k2" />
				<g clipPath={`url(#${peerBClip})`}>
					<circle cx={338} cy={113.5} r={8.2} className="wp-k4" />
					<path
						d="M318 146 C 318 131, 326 125.5, 338 125.5 C 350 125.5, 358 131, 358 146 Z"
						className="wp-k4"
						style={{ opacity: 0.78 }}
					/>
				</g>
				<circle cx={338} cy={121} r={24} className="wp-ln" />
				<Bar x={263} y={163} w={56} h={5.5} className="wp-k3" />
				<Bar x={325} y={163.5} w={24} h={4.5} className="wp-k2" />
				<circle cx={409} cy={166} r={3} className="wp-a wp-kuno-ring-b" opacity={0} />

				{/* Peer-to-peer dialogue exchange badge */}
				<circle cx={240} cy={130} r={12} className="wp-as wp-ping wp-h" strokeWidth={1.3} />
				<g className="wp-drop">
					<circle cx={240} cy={130} r={12} className="wp-surface" />
				</g>
				<path
					d="M234.5 127.5 H244.5 M242 125 l2.5 2.5 -2.5 2.5 M245.5 132.5 H235.5 M238 130 l-2.5 2.5 2.5 2.5"
					className="wp-as"
					strokeWidth={1.5}
				/>
			</>
		),
		front: (
			<>
				{/* Skill pathway card: diagnose, match with a peer, practice, apply */}
				<g className="wp-drop-lg">
					<rect x={51} y={192} width={228} height={84} rx={14} className="wp-surface" />
				</g>
				<circle cx={71} cy={212} r={10} className="wp-a1" />
				<path
					d="M65.5 215.5 L69.5 211.5 L72.5 214 L76.5 208.5"
					className="wp-as"
					strokeWidth={1.5}
				/>
				<text x={88} y={214.8} fontSize={8} fontWeight={600} letterSpacing={0.7} className="wp-ink">
					SKILL PATHWAY
				</text>
				<text x={265} y={214.8} fontSize={8} fontWeight={600} textAnchor="end" className="wp-at">
					3/4
				</text>
				{/* Track: done up to the session in progress, which fills on each loop */}
				<Bar x={75} y={238.5} w={186} h={3} className="wp-k2" />
				<Bar x={75} y={238.5} w={62} h={3} className="wp-a" />
				<Bar x={137} y={238.5} w={62} h={3} className="wp-a wp-kuno-trail" />
				{kunoSteps.map((step) => (
					<g key={step.label}>
						{step.state === "done" ? (
							<>
								<circle cx={step.x} cy={240} r={7} className="wp-a" />
								<path
									d={`M${step.x - 3} 240 l2 2 l4 -4.2`}
									className="wp-on-a-s"
									strokeWidth={1.6}
								/>
							</>
						) : step.state === "now" ? (
							<>
								<circle cx={step.x} cy={240} r={7} className="wp-as wp-ping" strokeWidth={1.3} />
								<circle cx={step.x} cy={240} r={7.5} className="wp-surface" />
								<circle cx={step.x} cy={240} r={7.5} className="wp-as" strokeWidth={1.6} />
								<circle cx={step.x} cy={240} r={3} className="wp-a wp-pulse" />
							</>
						) : (
							<circle cx={step.x} cy={240} r={6} className="wp-k2" />
						)}
						<text
							x={step.x}
							y={262}
							fontSize={7.4}
							fontWeight={step.state === "now" ? 600 : 500}
							letterSpacing={0.4}
							textAnchor="middle"
							className={step.state === "now" ? "wp-at" : "wp-k5"}
						>
							{step.label}
						</text>
					</g>
				))}

				{/* Reflection & skill-growth card */}
				<g className="wp-drop">
					<rect x={291} y={192} width={138} height={84} rx={14} className="wp-surface" />
				</g>
				<text x={305} y={214.8} fontSize={7.8} letterSpacing={0.7} className="wp-muted">
					REFLECTION
				</text>
				<g className="wp-kuno-check">
					<circle cx={409} cy={212} r={8.5} className="wp-a" />
					<path d="M405.5 212 l2.3 2.3 L413 209.2" className="wp-on-a-s" strokeWidth={1.8} />
				</g>
				<Bar x={305} y={232} w={106} h={5.5} className="wp-k3" />
				<Bar x={305} y={243} w={74} h={5.5} className="wp-k2" />
				{/* Skill mastery progress pips */}
				<Bar x={305} y={258} w={24.5} h={5} className="wp-a" />
				<Bar x={333.5} y={258} w={24.5} h={5} className="wp-a" />
				<Bar x={362} y={258} w={24.5} h={5} className="wp-a" />
				<Bar x={390.5} y={258} w={24.5} h={5} className="wp-k2" />
				<Bar x={390.5} y={258} w={24.5} h={5} className="wp-a wp-kuno-pip" />
			</>
		),
	};
}

/* ------------------------------------------------------------------ */
/* expo-in-app-updates — Android and iOS, one "Update available" sheet */
/* ------------------------------------------------------------------ */

function InAppUpdatesArt({ uid }: PosterArtProps): PosterLayers {
	const screen = `${uid}-screen`;
	const sheetClip = `${uid}-sheet`;
	return {
		back: (
			<>
				<Glow uid={uid} cx={300} cy={170} r={150} />
				{/* Android, behind */}
				<g transform="translate(92 52) rotate(-9 59 118)">
					<g className="wp-drop">
						<rect width={118} height={236} rx={22} className="wp-raised" />
					</g>
					<rect x={6} y={6} width={106} height={224} rx={17} className="wp-paper" />
					<circle cx={59} cy={17} r={3.5} className="wp-k3" />
					<Bar x={16} y={32} w={50} h={7} className="wp-k3" />
					<rect x={16} y={48} width={86} height={42} rx={10} className="wp-k1" />
					<rect x={16} y={98} width={41} height={41} rx={10} className="wp-k1" />
					<rect x={61} y={98} width={41} height={41} rx={10} className="wp-k1" />
					<Bar x={16} y={150} w={70} h={5} className="wp-k2" />
					<Bar x={16} y={160} w={50} h={5} className="wp-k1" />
					<rect x={12} y={184} width={94} height={34} rx={11} className="wp-surface" />
					<Bar x={21} y={193} w={44} h={5} className="wp-k3" />
					<Bar x={21} y={205} w={76} h={4} className="wp-k2" />
					<Bar x={21} y={205} w={76} h={4} className="wp-a wp-upd-bar wp-h" />
				</g>
			</>
		),
		mid: (
			<>
				{/* iPhone, in front */}
				<g transform="translate(226 18)">
					<g className="wp-drop-lg">
						<rect width={136} height={272} rx={30} className="wp-surface" />
					</g>
					<defs>
						<clipPath id={screen}>
							<rect x={7} y={7} width={122} height={258} rx={23} />
						</clipPath>
					</defs>
					<rect x={7} y={7} width={122} height={258} rx={23} className="wp-paper" />
					<g clipPath={`url(#${screen})`}>
						<text x={22} y={26} fontSize={8} fontWeight={600} className="wp-ink">
							9:41
						</text>
						<rect x={48} y={14} width={40} height={12} rx={6} className="wp-k4" />
						<Bar x={20} y={44} w={62} h={9} className="wp-k3" />
						<Bar x={20} y={60} w={92} h={5} className="wp-k2" />
						<rect x={20} y={74} width={96} height={54} rx={13} className="wp-a1" />
						<Bar x={30} y={86} w={46} h={6} className="wp-a2" />
						<Bar x={30} y={98} w={70} h={4} className="wp-a2" />
						<rect x={20} y={136} width={46} height={46} rx={12} className="wp-k1" />
						<rect x={70} y={136} width={46} height={46} rx={12} className="wp-k1" />
					</g>
				</g>
			</>
		),
		front: (
			<g transform="translate(226 18)">
				<defs>
					<clipPath id={sheetClip}>
						<rect x={7} y={7} width={122} height={258} rx={23} />
					</clipPath>
				</defs>
				<g clipPath={`url(#${sheetClip})`}>
					{/* Update sheet: it rises out of the phone when the planes separate */}
					<g className="wp-upd-sheet">
						<rect x={7} y={150} width={122} height={130} rx={22} className="wp-surface" />
						<Bar x={56} y={158} w={24} h={4} className="wp-k3" />
						<circle cx={68} cy={190} r={16} className="wp-ln3" strokeWidth={4} />
						<circle
							cx={68}
							cy={190}
							r={16}
							pathLength={100}
							strokeDasharray="100 100"
							strokeDashoffset={30}
							transform="rotate(-90 68 190)"
							className="wp-as wp-upd-ring"
							strokeWidth={4}
						/>
						<path
							d="M68 182 v14 M62 190.5 l6 6 6 -6"
							className="wp-as wp-upd-arrow"
							strokeWidth={2.2}
						/>
						<path
							d="M60.5 190 l5 5 L76 184.5"
							className="wp-as wp-upd-check"
							strokeWidth={2.4}
							opacity={0}
						/>
						<text
							x={68}
							y={222}
							fontSize={8.5}
							fontWeight={600}
							textAnchor="middle"
							className="wp-ink"
						>
							Update available
						</text>
						<rect x={26} y={232} width={84} height={20} rx={10} className="wp-a" />
						<text
							x={68}
							y={245}
							fontSize={8.5}
							fontWeight={600}
							textAnchor="middle"
							className="wp-on-a"
						>
							Update
						</text>
					</g>
				</g>
			</g>
		),
	};
}

/* ------------------------------------------------------------------ */
/* tilleli — a ticket stub, a map, and a pin for the place             */
/* ------------------------------------------------------------------ */

const ticketPath =
	"M14 0 H181 A9 9 0 0 0 199 0 H246 A14 14 0 0 1 260 14 V110 A14 14 0 0 1 246 124 H199 A9 9 0 0 0 181 124 H14 A14 14 0 0 1 0 110 V14 A14 14 0 0 1 14 0 Z";

// A fixed 6 × 6 pattern so the "QR" looks the same everywhere.
const ticketCode = ["111011", "100101", "101110", "011001", "110111", "101011"];

function TilleliArt({ uid }: PosterArtProps): PosterLayers {
	return {
		back: (
			<>
				{/* Map */}
				<path
					d="M-20 214 C 90 186, 170 262, 270 226 S 430 164, 500 196"
					className="wp-road"
					strokeWidth={14}
				/>
				<path d="M128 -10 C 150 80, 96 150, 154 320" className="wp-road" strokeWidth={10} />
				<path d="M336 -10 C 306 92, 394 162, 368 320" className="wp-road" strokeWidth={10} />
				<path d="M-20 64 C 120 84, 300 30, 500 58" className="wp-road" strokeWidth={8} />
				<rect x={176} y={238} width={44} height={30} rx={6} className="wp-k1" />
				<rect x={412} y={92} width={40} height={52} rx={6} className="wp-k1" />
				<rect x={22} y={12} width={52} height={36} rx={6} className="wp-k1" />
				<Glow uid={uid} cx={386} cy={130} r={110} />

				{/* Route to the venue */}
				<path
					d="M318 206 C 352 214, 356 170, 384 150"
					className="wp-as wp-march"
					strokeWidth={2.5}
					strokeDasharray="1 7"
				/>
			</>
		),
		mid: (
			<>
				{/* Ticket */}
				<g transform="translate(62 96) rotate(-6 130 62)">
					<g className="wp-sway">
						<g className="wp-drop-lg">
							<path d={ticketPath} className="wp-surface" />
						</g>
						<line x1={190} y1={14} x2={190} y2={110} className="wp-ln2" strokeDasharray="3 4" />
						<text x={20} y={26} fontSize={8} letterSpacing={1.1} className="wp-at">
							ADMIT ONE
						</text>
						<Bar x={20} y={36} w={132} h={12} className="wp-k3" />
						<Bar x={20} y={55} w={92} h={7} className="wp-k2" />
						<rect x={20} y={73} width={10} height={10} rx={2.5} className="wp-ln2" />
						<Bar x={36} y={75} w={44} h={6} className="wp-k2" />
						<path
							d="M101 83 c-3.5 -3.6 -5 -5.8 -5 -7.7 a5 5 0 0 1 10 0 c0 1.9 -1.5 4.1 -5 7.7z"
							className="wp-a"
						/>
						<Bar x={112} y={75} w={40} h={6} className="wp-k2" />
						<circle
							cx={28}
							cy={104}
							r={8}
							className="wp-a2"
							style={{ stroke: "var(--theme-surface-solid)" }}
							strokeWidth={2}
						/>
						<circle
							cx={40}
							cy={104}
							r={8}
							className="wp-k2"
							style={{ stroke: "var(--theme-surface-solid)" }}
							strokeWidth={2}
						/>
						<circle
							cx={52}
							cy={104}
							r={8}
							className="wp-k3"
							style={{ stroke: "var(--theme-surface-solid)" }}
							strokeWidth={2}
						/>
						<Bar x={68} y={101} w={44} h={6} className="wp-k2" />
						{ticketCode.flatMap((row, rowIndex) =>
							[...row].map((cell, columnIndex) =>
								cell === "1" ? (
									<rect
										key={`${rowIndex}-${columnIndex}`}
										x={204 + columnIndex * 7}
										y={30 + rowIndex * 7}
										width={6}
										height={6}
										rx={1.2}
										className="wp-k4"
									/>
								) : null,
							),
						)}
						<text
							x={225}
							y={100}
							fontSize={7.5}
							letterSpacing={1}
							textAnchor="middle"
							className="wp-muted"
						>
							ENTRY
						</text>
					</g>
				</g>
			</>
		),
		front: (
			<>
				{/* Pin */}
				<g transform="translate(386 146)">
					<ellipse cx={0} cy={2} rx={12} ry={4} className="wp-k2 wp-pin-shadow" />
					<circle cx={0} cy={2} r={10} className="wp-as wp-ping" strokeWidth={1.5} />
					<circle
						cx={0}
						cy={2}
						r={10}
						className="wp-as wp-ping wp-h"
						strokeWidth={1}
						style={{ animationDelay: "1.3s" }}
					/>
					<g className="wp-pin">
						<g className="wp-drop">
							<path
								d="M0 0 C -4 -10, -17 -18, -17 -31 A17 17 0 1 1 17 -31 C 17 -18, 4 -10, 0 0 Z"
								className="wp-a"
							/>
						</g>
						<circle cx={0} cy={-31} r={6.5} className="wp-on-a" />
					</g>
				</g>
			</>
		),
	};
}

/* ------------------------------------------------------------------ */
/* portfolio — SSR chunks streaming into a browser from the edge       */
/* ------------------------------------------------------------------ */

function PortfolioArt({ uid }: PosterArtProps): PosterLayers {
	const chunks: { x: number; y: number; w: number; h: number; className: string }[] = [
		{ x: 22, y: 48, w: 176, h: 16, className: "wp-k3" },
		{ x: 22, y: 70, w: 122, h: 16, className: "wp-k3" },
		{ x: 22, y: 98, w: 226, h: 6, className: "wp-k2" },
		{ x: 22, y: 110, w: 190, h: 6, className: "wp-k2" },
		{ x: 22, y: 126, w: 66, h: 20, className: "wp-a" },
	];
	const cards = [22, 116, 210];
	return {
		back: (
			<>
				<Glow uid={uid} cx={402} cy={120} r={110} />
				{/* Edge → browser */}
				<line x1={360} y1={115} x2={392} y2={115} className="wp-ln2" />
				{[0, 0.58, 1.16].map((delay) => (
					<rect
						key={delay}
						x={386}
						y={112}
						width={7}
						height={6}
						rx={2}
						className="wp-a wp-packet"
						style={{ animationDelay: `${delay}s`, "--wp-dx": "-30px", "--wp-dy": "0px" } as Vars}
					/>
				))}
				<g transform="translate(392 86)">
					<g className="wp-drop">
						<rect width={56} height={58} rx={15} className="wp-surface" />
					</g>
					<path
						d="M17 32 h22 a6.5 6.5 0 0 0 0 -13 a9.5 9.5 0 0 0 -18.5 -2 a7 7 0 0 0 -3.5 15z"
						className="wp-as"
						strokeWidth={1.8}
					/>
					<text
						x={28}
						y={48}
						fontSize={7}
						letterSpacing={1}
						textAnchor="middle"
						className="wp-muted"
					>
						EDGE
					</text>
				</g>
				{/* Edge ↔ D1 */}
				<line x1={420} y1={144} x2={420} y2={180} className="wp-ln2" />
				<circle
					cx={420}
					cy={178}
					r={2.5}
					className="wp-a wp-packet"
					style={{ "--wp-dx": "0px", "--wp-dy": "-32px" } as Vars}
				/>
				<g transform="translate(396 180)">
					<path d="M0 7 v28 a24 7 0 0 0 48 0 v-28" className="wp-surface" />
					<ellipse cx={24} cy={7} rx={24} ry={7} className="wp-surface" />
					<path d="M0 21 a24 7 0 0 0 48 0" className="wp-ln" />
					<text
						x={24}
						y={34}
						fontSize={7.5}
						letterSpacing={1}
						textAnchor="middle"
						className="wp-muted"
					>
						D1
					</text>
				</g>
			</>
		),
		mid: (
			<g transform="translate(40 40)">
				<g className="wp-drop-lg">
					<rect width={320} height={222} rx={14} className="wp-surface" />
				</g>
				<line x1={0} y1={30} x2={320} y2={30} className="wp-ln" />
				<TrafficLights x={16} y={15} />
				<rect x={84} y={8} width={170} height={15} rx={7.5} className="wp-k1" />
				<path
					d="M110 13.5 v-1.5 a2.6 2.6 0 0 1 5.2 0 v1.5 M108.6 13.5 h8 v5.4 h-8z"
					className="wp-ln2"
					strokeWidth={1.1}
				/>
				<text x={175} y={18.8} fontSize={7.5} textAnchor="middle" className="wp-muted">
					sohelislamimran.com
				</text>
			</g>
		),
		front: (
			<g transform="translate(40 40)">
				{chunks.map((chunk, index) => (
					<rect
						key={chunk.y}
						x={chunk.x}
						y={chunk.y}
						width={chunk.w}
						height={chunk.h}
						rx={chunk.h / 2}
						className={`${chunk.className} wp-stream`}
						style={{ "--i": index } as Vars}
					/>
				))}
				<rect
					x={18}
					y={122}
					width={74}
					height={28}
					rx={14}
					className="wp-as wp-hydrate"
					strokeWidth={1.5}
				/>
				{cards.map((x, index) => (
					<g key={x} className="wp-stream" style={{ "--i": index + 5 } as Vars}>
						<rect x={x} y={162} width={88} height={44} rx={10} className="wp-k1" />
						<Bar x={x + 10} y={174} w={44} h={5} className="wp-k3" />
						<Bar x={x + 10} y={184} w={62} h={4} className="wp-k2" />
					</g>
				))}
			</g>
		),
	};
}

/* ------------------------------------------------------------------ */
/* ghosttime — an ASCII ghost in a terminal, shimmering like ANSI art  */
/* ------------------------------------------------------------------ */

/** The ghost's silhouette; also used by the case study's replay. */
export const ghostRows = [
	"......####......",
	"...##########...",
	"..############..",
	".##############.",
	".###..####..###.",
	"####..####..####",
	"################",
	"################",
	"################",
	"################",
	"##.####..####.##",
	"#...##....##...#",
];
const ghostInk = "@%#*";

/** The ASCII character drawn at one cell of the ghost, or null for empty space. */
export function ghostChar(rowIndex: number, column: number): string | null {
	const row = ghostRows[rowIndex] ?? "";
	if (row[column] !== "#") return null;
	const left = row[column - 1] === "#";
	const right = row[column + 1] === "#";
	const above = ghostRows[rowIndex - 1]?.[column] === "#";
	const below = ghostRows[rowIndex + 1]?.[column] === "#";
	const edge = !(left && right && above && below);
	return edge
		? above
			? "+"
			: ":"
		: (ghostInk[(rowIndex * 3 + column * 5) % ghostInk.length] ?? "#");
}

function ghostLine(row: string, rowIndex: number, x0: number) {
	const chars: string[] = [];
	const xs: number[] = [];
	[...row].forEach((_cell, column) => {
		const char = ghostChar(rowIndex, column);
		if (!char) return;
		chars.push(char);
		xs.push(x0 + column * 8);
	});
	return { text: chars.join(""), x: xs.join(" ") };
}

function GhosttimeArt({ uid }: PosterArtProps): PosterLayers {
	const x0 = 56 + (368 - 16 * 8) / 2 + 4;
	const lines = ghostRows.map((row, index) => ({
		...ghostLine(row, index, x0),
		y: 104 + index * 12,
	}));
	return {
		back: (
			<>
				<Glow uid={uid} cx={240} cy={170} r={130} />
				<g transform="translate(56 34)">
					<g className="wp-drop-lg">
						<rect width={368} height={232} rx={14} className="wp-raised" />
					</g>
					<line x1={0} y1={28} x2={368} y2={28} className="wp-ln" />
					<TrafficLights x={16} y={14} />
					<text x={184} y={17.5} fontSize={8} textAnchor="middle" className="wp-muted">
						ghosttime
					</text>
				</g>
			</>
		),
		mid: (
			<g transform="translate(56 34)">
				<text x={18} y={52} fontSize={10} className="wp-ink">
					<tspan className="wp-at">$</tspan> ghosttime
				</text>
				<rect x={86} y={43.5} width={6} height={11} rx={1} className="wp-a wp-blink" />
				<text x={350} y={218} fontSize={7.5} textAnchor="end" className="wp-muted wp-h-show">
					pauses when focus leaves
				</text>
			</g>
		),
		front: (
			<g className="wp-bob">
				{lines.map((line) => (
					<text
						key={line.y}
						x={line.x}
						y={line.y}
						fontSize={11.5}
						fontWeight={600}
						className="wp-k5"
					>
						{line.text}
					</text>
				))}
				{lines.map((line, index) => (
					<text
						key={`s-${line.y}`}
						x={line.x}
						y={line.y}
						fontSize={11.5}
						fontWeight={600}
						className="wp-at wp-shimmer"
						opacity={0}
						style={{ animationDelay: `${index * 0.085}s` }}
					>
						{line.text}
					</text>
				))}
			</g>
		),
	};
}

/* ------------------------------------------------------------------ */
/* tailsync — a send queue, two peers, delivery confirmed by both       */
/* ------------------------------------------------------------------ */

function TailSyncArt({ uid }: PosterArtProps): PosterLayers {
	const tiles: { x: number; y: number; className: string }[] = [];
	for (let row = 0; row < 4; row += 1) {
		for (let column = 0; column < 3; column += 1) {
			const tone = (row * 3 + column) % 4;
			tiles.push({
				x: 16 + column * 30,
				y: 48 + row * 30,
				className: tone === 1 ? "wp-a1" : tone === 3 ? "wp-k2" : "wp-k1",
			});
		}
	}
	return {
		back: (
			<>
				<Glow uid={uid} cx={236} cy={140} r={120} />
				{/* Beams */}
				<line
					x1={168}
					y1={112}
					x2={300}
					y2={74}
					className="wp-ln2"
					strokeDasharray="2 5"
					strokeLinecap="round"
				/>
				<line
					x1={168}
					y1={156}
					x2={316}
					y2={208}
					className="wp-ln2"
					strokeDasharray="2 5"
					strokeLinecap="round"
				/>
				<line x1={168} y1={112} x2={300} y2={74} className="wp-as wp-h-show" strokeWidth={1.5} />
				<line x1={168} y1={156} x2={316} y2={208} className="wp-as wp-h-show" strokeWidth={1.5} />
				<text
					x={226}
					y={140}
					fontSize={7.5}
					letterSpacing={1}
					textAnchor="middle"
					className="wp-muted"
				>
					PEER TO PEER
				</text>
				<rect
					x={164}
					y={106}
					width={12}
					height={12}
					rx={3}
					className="wp-a wp-hop"
					opacity={0}
					style={{ "--wp-dx": "124px", "--wp-dy": "-36px" } as Vars}
				/>
				<rect
					x={164}
					y={150}
					width={12}
					height={12}
					rx={3}
					className="wp-a wp-hop"
					opacity={0}
					style={{ "--wp-dx": "140px", "--wp-dy": "52px", animationDelay: "0.25s" } as Vars}
				/>
			</>
		),
		front: (
			<>
				{/* Send queue: an app panel of files waiting to go out */}
				<g transform="translate(56 40)">
					<g className="wp-drop-lg">
						<rect width={112} height={224} rx={14} className="wp-surface" />
					</g>
					<text x={14} y={20} fontSize={7.5} letterSpacing={1} className="wp-muted">
						QUEUE
					</text>
					<text x={98} y={20} fontSize={7.5} textAnchor="end" className="wp-at">
						12
					</text>
					<line x1={0} y1={28} x2={112} y2={28} className="wp-ln" />
					<rect x={6} y={34} width={100} height={184} rx={9} className="wp-paper" />
					<Bar x={16} y={38} w={42} h={5} className="wp-k3" />
					{tiles.map((tile) =>
						tile.x === 46 && tile.y === 78 ? null : (
							<rect
								key={`${tile.x}-${tile.y}`}
								x={tile.x}
								y={tile.y}
								width={26}
								height={26}
								rx={6}
								className={tile.className}
							/>
						),
					)}
					<g className="wp-original">
						<rect x={46} y={78} width={26} height={26} rx={6} className="wp-a" />
						<path d="M51 98 l6 -7 4 4 3 -3 4 6z" className="wp-on-a" style={{ opacity: 0.85 }} />
					</g>
					<rect x={16} y={176} width={80} height={24} rx={12} className="wp-a" />
					<text
						x={56}
						y={191}
						fontSize={8.5}
						fontWeight={600}
						textAnchor="middle"
						className="wp-on-a"
					>
						Send
					</text>
				</g>
			</>
		),
		mid: (
			<>
				{/* Laptop */}
				<g transform="translate(300 34)">
					<g className="wp-drop">
						<rect width={140} height={92} rx={9} className="wp-surface" />
					</g>
					<rect x={6} y={6} width={128} height={78} rx={4} className="wp-paper" />
					<rect x={48} y={20} width={44} height={34} rx={6} className="wp-a1" />
					<path d="M54 49 l9 -10 6 6 4 -4 7 8z" className="wp-a2" />
					<Bar x={46} y={62} w={48} h={5} className="wp-k2" />
					<path d="M-14 92 h168 l-9 10 h-150z" className="wp-raised" />
				</g>
				<g transform="translate(438 36)">
					<g className="wp-confirm">
						<circle r={11} className="wp-success" />
						<path d="M-4.5 0 l3 3 L5 -3.5" className="wp-paper-s" />
					</g>
				</g>

				{/* Tablet */}
				<g transform="translate(316 168)">
					<g className="wp-drop">
						<rect width={118} height={88} rx={13} className="wp-surface" />
					</g>
					<rect x={6} y={6} width={106} height={76} rx={8} className="wp-paper" />
					<rect x={38} y={18} width={42} height={32} rx={6} className="wp-a1" />
					<path d="M44 44 l8 -9 6 6 4 -4 6 7z" className="wp-a2" />
					<Bar x={36} y={58} w={46} h={5} className="wp-k2" />
				</g>
				<g transform="translate(432 170)">
					<g className="wp-confirm" style={{ animationDelay: "0.25s" }}>
						<circle r={11} className="wp-success" />
						<path d="M-4.5 0 l3 3 L5 -3.5" className="wp-paper-s" />
					</g>
				</g>
			</>
		),
	};
}

/* ------------------------------------------------------------------ */
/* android-mac-display — the Mac screen mirrored to a display over USB  */
/* ------------------------------------------------------------------ */

function Desk({ delay = 0 }: { delay?: number }) {
	return (
		<g>
			<rect width={204} height={120} className="wp-a1" />
			<rect width={204} height={9} className="wp-k1" />
			<circle cx={10} cy={4.5} r={2} className="wp-k4" />
			<Bar x={18} y={3} w={26} h={3} className="wp-k3" />
			<circle cx={196} cy={4.5} r={2.2} className="wp-signal wp-rec" />
			<g>
				<rect x={14} y={18} width={104} height={70} rx={5} className="wp-surface" />
				<line x1={14} y1={28} x2={118} y2={28} className="wp-ln" />
				<circle cx={21} cy={23} r={1.8} className="wp-k3" />
				<circle cx={27} cy={23} r={1.8} className="wp-k2" />
				<circle cx={33} cy={23} r={1.8} className="wp-k2" />
				<Bar x={22} y={36} w={56} h={5} className="wp-k3" />
				<Bar x={22} y={46} w={84} h={4} className="wp-k2" />
				<Bar x={22} y={55} w={70} h={4} className="wp-k2" />
				<Bar x={22} y={64} w={78} h={4} className="wp-k2" />
			</g>
			<g className="wp-drop">
				<rect x={96} y={40} width={94} height={62} rx={5} className="wp-surface" />
			</g>
			<rect x={106} y={74} width={10} height={18} rx={2} className="wp-a2" />
			<rect x={120} y={64} width={10} height={28} rx={2} className="wp-a" />
			<rect x={134} y={70} width={10} height={22} rx={2} className="wp-a2" />
			<rect x={148} y={56} width={10} height={36} rx={2} className="wp-a" />
			<rect x={162} y={66} width={10} height={26} rx={2} className="wp-a2" />
			<Bar x={106} y={50} w={44} h={4} className="wp-k3" />
			<rect x={66} y={108} width={72} height={9} rx={4.5} className="wp-k2" />
			<g transform="translate(36 54)">
				<path
					d="M0 0 L0 13 L3.4 9.8 L6 15 L8.4 14 L5.8 8.8 L10.4 8.8 Z"
					className="wp-ink wp-cursor"
					style={{
						stroke: "var(--theme-surface-solid)",
						strokeWidth: 1,
						animationDelay: `${delay}s`,
					}}
				/>
			</g>
		</g>
	);
}

function AndroidMacDisplayArt({ uid }: PosterArtProps): PosterLayers {
	const macScreen = `${uid}-mac`;
	const phoneScreen = `${uid}-display`;
	const cable = (
		<>
			{/* USB */}
			<path
				d="M262 194 C 298 194, 286 160, 322 160"
				className="wp-ln2"
				strokeWidth={2.5}
				strokeLinecap="round"
			/>
			<path
				d="M262 194 C 298 194, 286 160, 322 160"
				pathLength={100}
				className="wp-as wp-run"
				strokeWidth={3}
				style={{ "--wp-d": "1.8s" } as Vars}
			/>
			<path
				d="M262 194 C 298 194, 286 160, 322 160"
				pathLength={100}
				className="wp-as wp-run wp-h"
				strokeWidth={3}
				style={{ "--wp-d": "1.8s", animationDelay: "0.9s" } as Vars}
			/>
			<rect x={252} y={190} width={12} height={8} rx={2} className="wp-k4" />
			<text
				x={292}
				y={222}
				fontSize={7.5}
				letterSpacing={1}
				textAnchor="middle"
				className="wp-muted"
			>
				USB · H.264
			</text>
		</>
	);
	return {
		back: (
			<>
				<Glow uid={uid} cx={300} cy={180} r={130} />
				{cable}
			</>
		),
		mid: (
			<>
				{/* Mac */}
				<g transform="translate(30 46)">
					<g className="wp-drop-lg">
						<rect width={224} height={140} rx={11} className="wp-surface" />
					</g>
					<defs>
						<clipPath id={macScreen}>
							<rect x={10} y={10} width={204} height={120} rx={4} />
						</clipPath>
					</defs>
					<g clipPath={`url(#${macScreen})`}>
						<g transform="translate(10 10)">
							<Desk />
						</g>
					</g>
					<path d="M-18 140 h260 l-12 11 h-236z" className="wp-raised" />
					<rect x={98} y={140} width={28} height={4} rx={2} className="wp-k2" />
				</g>
			</>
		),
		front: (
			<>
				{/* The receiving display, drawn as a plain screen on a stand */}
				<g transform="translate(320 118)">
					<path d="M64 84 h18 l4 12 h-26 z" className="wp-raised" />
					<rect x={50} y={95} width={46} height={5} rx={2.5} className="wp-k2" />
					<g className="wp-drop-lg">
						<rect width={146} height={84} rx={8} className="wp-surface" />
					</g>
					<defs>
						<clipPath id={phoneScreen}>
							<rect x={13} y={6} width={120} height={70.6} rx={4} />
						</clipPath>
					</defs>
					<g clipPath={`url(#${phoneScreen})`}>
						<g transform="translate(13 6) scale(0.5882)">
							<Desk delay={0.16} />
						</g>
					</g>
				</g>
			</>
		),
	};
}

/* ------------------------------------------------------------------ */
/* expo-import-cost — editor lines with the size each import adds      */
/* ------------------------------------------------------------------ */

function ImportCostArt({ uid }: PosterArtProps): PosterLayers {
	const costs = [
		{ y: 56, value: "18.2 kB", ratio: 0.62, heavy: false },
		{ y: 76, value: "3.1 kB", ratio: 0.16, heavy: false },
		{ y: 96, value: "22.6 kB", ratio: 0.9, heavy: true },
	];
	return {
		back: (
			<>
				<Glow uid={uid} cx={360} cy={110} r={120} />
				<g transform="translate(40 34)">
					<g className="wp-drop-lg">
						<rect width={400} height={232} rx={14} className="wp-raised" />
					</g>
					<line x1={0} y1={30} x2={400} y2={30} className="wp-ln" />
					<TrafficLights x={16} y={15} />
					<path d="M64 30 v-17 a6 6 0 0 1 6 -6 h66 a6 6 0 0 1 6 6 v17z" className="wp-surface" />
					<text x={103} y={22} fontSize={8} textAnchor="middle" className="wp-ink">
						App.tsx
					</text>
					<circle cx={344} cy={15} r={2.5} className="wp-a" />
					<text
						x={384}
						y={18}
						fontSize={7.5}
						letterSpacing={0.8}
						textAnchor="end"
						className="wp-muted"
					>
						ATLAS
					</text>
					<rect
						x={4}
						y={45}
						width={392}
						height={16}
						rx={5}
						className="wp-a1 wp-scan"
						opacity={0}
						style={{ "--wp-scan": "40px" } as Vars}
					/>
				</g>
			</>
		),
		mid: (
			<g transform="translate(40 34)">
				{Array.from({ length: 9 }, (_, index) => (
					<text
						key={index}
						x={24}
						y={56 + index * 20}
						fontSize={8.5}
						textAnchor="end"
						className="wp-k3"
					>
						{index + 1}
					</text>
				))}
				<g fontSize={9.5}>
					<text x={36} y={56} className="wp-ink">
						<tspan className="wp-at">import</tspan> {"{ Image }"}{" "}
						<tspan className="wp-at">from</tspan> <tspan className="wp-k5">"expo-image"</tspan>;
					</text>
					<text x={36} y={76} className="wp-ink">
						<tspan className="wp-at">import</tspan> * <tspan className="wp-at">as</tspan> Haptics{" "}
						<tspan className="wp-at">from</tspan> <tspan className="wp-k5">"expo-haptics"</tspan>;
					</text>
					<text x={36} y={96} className="wp-ink">
						<tspan className="wp-at">import</tspan> {"{ format }"}{" "}
						<tspan className="wp-at">from</tspan> <tspan className="wp-k5">"date-fns"</tspan>;
					</text>
					<text x={36} y={136} className="wp-ink">
						<tspan className="wp-at">export function</tspan> Card() {"{"}
					</text>
					<text x={50} y={156} className="wp-ink">
						<tspan className="wp-at">return</tspan> (
					</text>
					<text x={64} y={176} className="wp-ink">
						<tspan className="wp-at">{"<Image"}</tspan> source={"{uri}"}{" "}
						<tspan className="wp-at">{"/>"}</tspan>
					</text>
					<text x={50} y={196} className="wp-ink">
						);
					</text>
					<text x={36} y={216} className="wp-ink">
						{"}"}
					</text>
				</g>
			</g>
		),
		front: (
			<g transform="translate(40 34)">
				{costs.map((cost, index) => (
					<g key={cost.y} className="wp-cost" style={{ "--i": index } as Vars}>
						<rect
							x={284}
							y={cost.y - 10.5}
							width={100}
							height={15}
							rx={7.5}
							className={cost.heavy ? "wp-surface" : "wp-k1"}
							style={
								cost.heavy
									? { stroke: "color-mix(in srgb, var(--theme-signal) 45%, transparent)" }
									: undefined
							}
						/>
						<Bar x={292} y={cost.y - 4.5} w={30} h={3} className="wp-k2" />
						<Bar
							x={292}
							y={cost.y - 4.5}
							w={30 * cost.ratio}
							h={3}
							className={cost.heavy ? "wp-signal" : "wp-a"}
						/>
						<text
							x={377}
							y={cost.y}
							fontSize={8}
							textAnchor="end"
							className={cost.heavy ? "wp-signal" : "wp-ink"}
						>
							{cost.value}
						</text>
					</g>
				))}
			</g>
		),
	};
}

/* ------------------------------------------------------------------ */
/* Fallback — seeded from the id and title, so every project differs   */
/* ------------------------------------------------------------------ */

function GenericArt({ uid, id, title }: PosterArtProps): PosterLayers {
	const seed = hashString(`${id}:${title}`);
	const random = seededRandom(seed);
	const initials = monogram(title || id);
	const variant = seed % 2 === 0 ? "stack" : "orbit";

	if (variant === "orbit") {
		const rings = 2 + Math.floor(random() * 2);
		const nodes = Array.from({ length: rings + 2 }, (_, index) => {
			const ring = index % rings;
			const angle = random() * Math.PI * 2;
			const rx = 70 + ring * 46;
			const ry = rx * 0.56;
			return {
				cx: 240 + Math.cos(angle) * rx,
				cy: 150 + Math.sin(angle) * ry,
				accent: index === 0,
			};
		});
		return {
			back: <Glow uid={uid} cx={240} cy={150} r={140} />,
			mid: (
				<g className="wp-spin" style={{ animationDuration: `${22 + Math.floor(random() * 10)}s` }}>
					{Array.from({ length: rings }, (_, ring) => (
						<ellipse
							key={ring}
							cx={240}
							cy={150}
							rx={70 + ring * 46}
							ry={(70 + ring * 46) * 0.56}
							className="wp-ln2"
							strokeDasharray={ring % 2 ? "3 6" : undefined}
						/>
					))}
					{nodes.map((node, index) => (
						<circle
							key={index}
							cx={node.cx}
							cy={node.cy}
							r={node.accent ? 7 : 5}
							className={node.accent ? "wp-a" : "wp-surface"}
						/>
					))}
				</g>
			),
			front: (
				<>
					<circle cx={240} cy={150} r={34} className="wp-as wp-ping" strokeWidth={1.2} />
					<g className="wp-drop">
						<circle cx={240} cy={150} r={34} className="wp-surface" />
					</g>
					<text
						x={240}
						y={156}
						fontSize={17}
						fontWeight={600}
						letterSpacing={1}
						textAnchor="middle"
						className="wp-ink"
					>
						{initials}
					</text>
				</>
			),
		};
	}

	const planes = 3 + Math.floor(random() * 3);
	const accentPlane = Math.floor(random() * planes);
	const gap = Math.min(36, 120 / planes);
	const baseY = 150 + ((planes - 1) * gap) / 2;
	const run = (
		<path
			d="M240 34 L240 272"
			pathLength={100}
			className="wp-as wp-run"
			strokeWidth={2.5}
			style={{ "--wp-d": "3.4s" } as Vars}
		/>
	);
	return {
		back: (
			<>
				<Glow uid={uid} cx={240} cy={110} r={140} />
				<line x1={240} y1={34} x2={240} y2={272} className="wp-ln2" />
				{run}
			</>
		),
		mid: (
			<>
				{Array.from({ length: planes }, (_, index) => {
					const y = baseY - index * gap;
					const shift = Math.round((random() - 0.5) * 28);
					const accent = index === accentPlane;
					const d = `M${150 + shift} ${y} L${240 + shift} ${y - 46} L${330 + shift} ${y} L${240 + shift} ${y + 46} Z`;
					return (
						<g key={index} className="wp-drop">
							<path
								d={d}
								className={accent ? "wp-a1" : "wp-surface"}
								style={accent ? { stroke: "var(--theme-accent-line)" } : undefined}
							/>
							<circle
								cx={240 + shift + (random() - 0.5) * 80}
								cy={y + (random() - 0.5) * 30}
								r={3}
								className={accent ? "wp-a" : "wp-k3"}
							/>
						</g>
					);
				})}
			</>
		),
		front: (
			<g transform="translate(352 46)" className="wp-drop">
				<rect width={72} height={34} rx={17} className="wp-surface" />
				<text
					x={36}
					y={21.5}
					fontSize={12}
					fontWeight={600}
					letterSpacing={1.5}
					textAnchor="middle"
					className="wp-ink"
				>
					{initials}
				</text>
			</g>
		),
	};
}

const artById: Record<string, (props: PosterArtProps) => PosterLayers> = {
	kuno: KunoArt,
	"expo-in-app-updates": InAppUpdatesArt,
	tilleli: TilleliArt,
	portfolio: PortfolioArt,
	ghosttime: GhosttimeArt,
	tailsync: TailSyncArt,
	"android-mac-display": AndroidMacDisplayArt,
	"expo-import-cost": ImportCostArt,
};

export function hasCustomArt(id: string) {
	return Object.hasOwn(artById, id);
}

/** The three planes of a project's poster. Called as a function (not a component) so each plane can live in its own SVG. */
export function posterLayers(props: PosterArtProps): PosterLayers {
	const art = artById[props.id] ?? GenericArt;
	return art(props);
}
