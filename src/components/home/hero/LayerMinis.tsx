/*
 * Tiny living drawings printed on each plane of the Stack Trace, one per
 * layer, in a 100×100 space. Decorative (the scene is aria-hidden). Each
 * one's first and last keyframe is its rest pose, so with the animation
 * off (inactive plane, reduced motion, no JS) it reads as a still icon.
 * Motion is transform/opacity only; styles live in `stack-css.ts` (`.mi-*`).
 */

const line = {
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
};

/** A web app window; a cursor clicks its button. */
function InterfaceMini() {
	return (
		<>
			<g {...line}>
				<rect x="14" y="20" width="72" height="58" rx="7" />
				<path d="M14 31h72" />
				<path d="M24 42h32M24 50h44" opacity="0.55" />
				<rect x="24" y="59" width="26" height="10" rx="5" />
			</g>
			<g fill="currentColor">
				<circle cx="20" cy="25.5" r="1.4" />
				<circle cx="25" cy="25.5" r="1.4" />
				<circle cx="30" cy="25.5" r="1.4" />
			</g>
			<rect className="mi-press" x="24" y="59" width="26" height="10" rx="5" />
			<path
				className="mi-cursor"
				d="M0 0v13l3.6-3.4 2.7 5.6 2.4-1.1-2.7-5.5H11Z"
				fill="currentColor"
				stroke="var(--theme-surface-solid)"
				strokeWidth="1"
				strokeLinejoin="round"
			/>
		</>
	);
}

/** A request travels to the service and a response comes back. */
function ApiMini() {
	return (
		<>
			<g {...line}>
				<path d="M22 34c-5 0-6 3-6 7v4c0 3-2 5-5 5 3 0 5 2 5 5v4c0 4 1 7 6 7" />
				<rect x="64" y="30" width="24" height="40" rx="5" />
				<path d="M70 40h12M70 48h8" opacity="0.55" />
				<path d="M28 44h32M60 58H28" opacity="0.4" strokeDasharray="2 4" />
			</g>
			<rect className="mi-srv" x="64" y="30" width="24" height="40" rx="5" />
			<circle className="mi-req" cx="30" cy="44" r="3" />
			<circle className="mi-res" cx="58" cy="58" r="3" />
		</>
	);
}

/** A table gets a new row written. */
function DataMini() {
	return (
		<>
			<g {...line}>
				<rect x="16" y="20" width="68" height="60" rx="7" />
				<path d="M16 32h68M38 32v48" opacity="0.55" />
			</g>
			<g fill="currentColor" opacity="0.4">
				<rect x="21" y="38" width="12" height="4" rx="2" />
				<rect x="43" y="38" width="34" height="4" rx="2" />
				<rect x="21" y="48" width="12" height="4" rx="2" />
				<rect x="43" y="48" width="26" height="4" rx="2" />
				<rect x="21" y="58" width="12" height="4" rx="2" />
				<rect x="43" y="58" width="30" height="4" rx="2" />
			</g>
			<rect className="mi-write-bg" x="18" y="65" width="64" height="10" rx="3" />
			<rect className="mi-write" x="21" y="68" width="12" height="4" rx="2" />
			<rect className="mi-write mi-write-late" x="43" y="68" width="32" height="4" rx="2" />
		</>
	);
}

/** The lock closes and a check resolves. */
function AccessMini() {
	return (
		<>
			<path className="mi-shackle" d="M40 46v-8a10 10 0 0 1 20 0v8" {...line} />
			<g {...line}>
				<rect x="32" y="46" width="36" height="30" rx="7" />
				<path d="M50 57v8" />
			</g>
			<g className="mi-check">
				<circle cx="70" cy="74" r="10" fill="var(--theme-success)" />
				<path
					d="m65.5 74 3 3 6-6"
					fill="none"
					stroke="var(--theme-surface-solid)"
					strokeWidth="2.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</g>
		</>
	);
}

/** Four nodes light up in turn along their links. */
function InfrastructureMini() {
	const nodes = [
		[22, 22],
		[60, 22],
		[60, 60],
		[22, 60],
	] as const;
	return (
		<>
			<path d="M40 31h20M69 40v20M60 69H40M31 60V40" {...line} opacity="0.5" />
			{nodes.map(([x, y], index) => (
				<g key={`${x}-${y}`}>
					<rect x={x} y={y} width="18" height="18" rx="4.5" {...line} />
					<rect
						className="mi-node"
						x={x + 4}
						y={y + 4}
						width="10"
						height="10"
						rx="2.5"
						style={{ animationDelay: `${index * 0.45}s` }}
					/>
				</g>
			))}
		</>
	);
}

/** Pipeline checks go green and the version moves up. */
function ReleaseMini() {
	return (
		<>
			<path d="M28 38h14M58 38h14" {...line} opacity="0.5" />
			{[20, 50, 80].map((cx, index) => (
				<g key={cx}>
					<circle cx={cx} cy="38" r="8" {...line} />
					<g className="mi-pass" style={{ animationDelay: `${0.2 + index * 0.4}s` }}>
						<circle cx={cx} cy="38" r="8" fill="var(--theme-success)" />
						<path
							d={`m${cx - 3.6} 38 2.6 2.6 5-5`}
							fill="none"
							stroke="var(--theme-surface-solid)"
							strokeWidth="2.2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</g>
				</g>
			))}
			<rect x="30" y="58" width="40" height="18" rx="9" {...line} opacity="0.7" />
			<text className="mi-ver mi-ver-old" x="50" y="70.5">
				v1.4
			</text>
			<text className="mi-ver mi-ver-new" x="50" y="70.5">
				v1.5
			</text>
		</>
	);
}

export function LayerMini({ id }: { id: string }) {
	switch (id) {
		case "interface":
			return <InterfaceMini />;
		case "api":
			return <ApiMini />;
		case "data":
			return <DataMini />;
		case "access":
			return <AccessMini />;
		case "infrastructure":
			return <InfrastructureMini />;
		case "release":
			return <ReleaseMini />;
		default:
			return (
				<g {...line}>
					<rect x="22" y="22" width="56" height="56" rx="10" />
					<path d="M34 42h32M34 54h20" opacity="0.55" />
				</g>
			);
	}
}
