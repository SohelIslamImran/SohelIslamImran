/** Fallback length of one request hop, ms; the component sets --step. */
const STEP_MS = 760;

/*
 * Styles for the Stack Trace. Plain CSS because the 3D geometry is shared
 * custom-property math, and because it ships in the server HTML so the
 * composition is complete without JS.
 *
 * Geometry (container-query units of `.st`): planes are --P squares in a
 * rig turned to isometric (rotateX --rx, rotateZ -45deg). Plane i sits at
 *   z(i) = (--mid - i) * --g + --up * --L / 2
 * where --up is 1 for the selected layer and everything above it (so a gap
 * opens under the selection) and -1 below. Shadows, the trace wire, the
 * pulse, and the label tabs all use the same formula, so they stay in step
 * when the stack pulls apart (--g) or the selection moves.
 */
export const STACK_CSS = `
.st {
	container: st / inline-size;
	--ease: cubic-bezier(0.22, 1, 0.36, 1);
	--glide: cubic-bezier(0.32, 0.9, 0.3, 1.02);
}
.st-body { --P: 31cqw; --g: 8.4; --L: 5; --rx: 57; --sin: 0.839; }
.st[data-open] .st-body { --g: 11.6; }
/* Pinned apart: a clearly wider spread than hover, on slightly smaller planes (--s) so it stays inside the scene. */
.st[data-pinned] .st-body { --g: 14; --L: 3; --s: 0.76; }
.st-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; min-width: 0; }
.st-actions { display: flex; flex: none; align-items: center; gap: 8px; }
.st-pull {
	display: inline-flex; flex: none; align-items: center; gap: 7px; min-height: 40px; padding: 0 14px 0 12px;
	border: 1px solid var(--theme-line); border-radius: 999px; background: transparent; color: var(--theme-muted);
	font-size: 13px; font-weight: 540; cursor: pointer;
	transition: color 220ms var(--ease), border-color 220ms var(--ease), background-color 220ms var(--ease), scale 220ms var(--ease);
}
.st-pull > svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linejoin: round; stroke-linecap: round; }
.st-pull:active { scale: 0.96; }
.st-send { color: var(--theme-accent-text); border-color: color-mix(in srgb, var(--theme-accent) 38%, transparent); }
.st-send[data-busy] { background: var(--theme-accent-soft); }
@media (hover: hover) and (pointer: fine) { .st-send:hover { color: var(--theme-accent-text); border-color: color-mix(in srgb, var(--theme-accent) 62%, transparent); } }
.st-pull[aria-pressed="true"] { color: var(--theme-accent-text); border-color: color-mix(in srgb, var(--theme-accent) 45%, transparent); background: var(--theme-accent-soft); }
@media (hover: hover) and (pointer: fine) { .st-pull:hover { color: var(--theme-ink); border-color: var(--theme-line-strong); } }

.st-body { position: relative; display: grid; grid-template-columns: 60cqw minmax(0, 1fr); height: 80cqw; margin-top: 4px; }
.st-scene {
	position: relative; height: 100%; perspective: 420cqw; perspective-origin: 50% 40%;
	touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent;
}
.st-glow {
	position: absolute; inset: -4% -14% -4% -10%; pointer-events: none;
	background:
		radial-gradient(38% 40% at 50% 50%, color-mix(in srgb, var(--theme-accent) 9%, transparent), transparent 75%),
		radial-gradient(circle at 1px 1px, var(--theme-line-strong) 1px, transparent 1.3px) 0 0 / 18px 18px;
	-webkit-mask-image: radial-gradient(closest-side, #000 35%, transparent);
	mask-image: radial-gradient(closest-side, #000 35%, transparent);
	opacity: 0.6; transition: opacity 600ms var(--ease);
}
.st[data-open] .st-glow { opacity: 1; }
.st-rig {
	position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d;
	transform: rotateX(calc(var(--rx) * 1deg + var(--tilt-x, 0deg))) rotateZ(calc(-45deg + var(--tilt-z, 0deg) + var(--spin, 0deg)));
	transition: transform 700ms var(--ease);
}
.st-rig[data-dragging] { transition-duration: 140ms; }

/* Planes, their cast shadows, the wire, the pulse */
.st-plane, .st-shadow { --up: -1; }
.st-plane[data-lit], .st-plane[data-active], .st-shadow[data-active] { --up: 1; }
.st-plane {
	position: absolute; left: calc(var(--P) / -2); top: calc(var(--P) / -2); width: var(--P); height: var(--P);
	border-radius: calc(var(--P) * 0.16); border: 1px solid var(--theme-line-strong); cursor: pointer;
	background: linear-gradient(135deg, color-mix(in srgb, var(--theme-surface-solid) 94%, transparent), color-mix(in srgb, var(--theme-surface-solid) 66%, transparent));
	box-shadow: inset 0 1px 0 var(--theme-highlight);
	color: var(--theme-muted); opacity: 0.66;
	translate: 0 0 calc(((var(--mid) - var(--i)) * var(--g) + var(--up) * var(--L) * 0.5) * 1cqw);
	scale: var(--s, 1);
	transition:
		translate 720ms var(--glide), scale 720ms var(--glide), opacity 420ms var(--ease), color 320ms var(--ease),
		border-color 320ms var(--ease), background-color 320ms var(--ease), box-shadow 320ms var(--ease);
}
/* Light paper washes the glass out: rest the planes ~1.5x stronger so all six read at once. */
html:not([data-theme-resolved="dark"]) .st-plane:not([data-active]) {
	opacity: 0.97; color: color-mix(in srgb, var(--theme-muted) 82%, var(--theme-ink));
	border-color: color-mix(in srgb, var(--theme-ink) 24%, transparent);
	background: linear-gradient(135deg, color-mix(in srgb, var(--theme-surface-solid) 96%, transparent), color-mix(in srgb, var(--theme-ink) 4%, var(--theme-surface-solid) 84%));
	box-shadow: inset 0 1px 0 var(--theme-highlight), 0 1px 0 color-mix(in srgb, var(--theme-ink) 6%, transparent);
}
html:not([data-theme-resolved="dark"]) .st-shadow { opacity: 1; }
.st-plane[data-lit] { opacity: 0.85; color: var(--theme-ink-soft); border-color: color-mix(in srgb, var(--theme-accent) 30%, var(--theme-line-strong)); }
.st-plane[data-active] {
	opacity: 1; color: var(--theme-accent-text);
	border-color: color-mix(in srgb, var(--theme-accent) 62%, transparent);
	background: linear-gradient(135deg, color-mix(in srgb, var(--theme-accent-soft) 97%, transparent), color-mix(in srgb, var(--theme-surface-solid) 76%, transparent));
	box-shadow:
		inset 0 1px 0 var(--theme-highlight), 0 0 0 calc(var(--P) * 0.025) color-mix(in srgb, var(--theme-accent) 10%, transparent),
		0 0 calc(var(--P) * 0.22) color-mix(in srgb, var(--theme-accent) 22%, transparent);
}
@media (hover: hover) and (pointer: fine) {
	.st-plane:not([data-active]):hover { opacity: 1; border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent); }
}
.st-plane-index {
	position: absolute; top: 9%; left: 10%; font-family: var(--font-mono); font-size: calc(var(--P) * 0.075);
	letter-spacing: 0.08em; font-variant-numeric: tabular-nums;
}
.st-mini { position: absolute; left: 21%; top: 21%; width: 58%; height: 58%; overflow: visible; }
/* Pinned only: the layer's name on the plane's near edge, like the other tilted stacks on the site. */
.st-plane-name {
	position: absolute; left: 9%; bottom: 8%; max-width: 84%; overflow: hidden;
	font-family: var(--font-mono); font-size: calc(var(--P) * 0.078); line-height: 1.2; letter-spacing: 0.06em;
	text-transform: uppercase; white-space: nowrap; text-overflow: ellipsis;
	opacity: 0; transition: opacity 360ms var(--ease);
}
.st[data-pinned] .st-plane-name { opacity: 1; transition-delay: 220ms; }

.st-shadow {
	position: absolute; left: calc(var(--P) * -0.46); top: calc(var(--P) * -0.46); width: calc(var(--P) * 0.92); height: calc(var(--P) * 0.92);
	border-radius: calc(var(--P) * 0.2); pointer-events: none;
	background: radial-gradient(closest-side, color-mix(in srgb, var(--theme-shadow-strong) 85%, transparent), transparent);
	translate: 0 0 calc(((var(--mid) - var(--i)) * var(--g) + var(--up) * var(--L) * 0.5 - var(--g) * 0.5) * 1cqw);
	scale: var(--s, 1); opacity: 0.75; transition: translate 720ms var(--glide), scale 720ms var(--glide);
}
.st-shadow[data-floor] { scale: calc(var(--s, 1) * 1.25); opacity: 1; }

.st-wire {
	position: absolute; left: -0.75px; top: 0; width: 1.5px; height: 1cqw; transform-origin: 50% 0; pointer-events: none;
	background: var(--theme-line-strong);
	transform:
		translateZ(calc((var(--mid) * var(--g) + var(--L) * 0.5) * 1cqw)) rotateX(-90deg)
		scaleY(calc(2 * var(--mid) * var(--g) + var(--L)));
	transition: transform 720ms var(--glide);
}
.st-wire-lit {
	background: var(--theme-accent-line);
	transform:
		translateZ(calc((var(--mid) * var(--g) + var(--L) * 0.5) * 1cqw)) rotateX(-90deg)
		scaleY(max(0.001, calc(var(--active) * var(--g))));
}

.st-dot, .st-land {
	position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none;
	translate: 0 0 calc(((var(--mid) - var(--active)) * var(--g) + var(--L) * 0.5 + 0.8) * 1cqw);
	transition: translate 720ms var(--glide);
}
.st-dot-core {
	position: absolute; left: calc(var(--P) * -0.05); top: calc(var(--P) * -0.05); width: calc(var(--P) * 0.1); height: calc(var(--P) * 0.1);
	border-radius: 50%; background: var(--theme-accent-line);
	box-shadow: 0 0 0 calc(var(--P) * 0.025) color-mix(in srgb, var(--theme-accent-line) 22%, transparent), 0 0 calc(var(--P) * 0.12) calc(var(--P) * 0.02) color-mix(in srgb, var(--theme-accent-line) 55%, transparent);
}
.st-land {
	&::before {
		content: ""; position: absolute; left: calc(var(--P) * -0.2); top: calc(var(--P) * -0.2);
		width: calc(var(--P) * 0.4); height: calc(var(--P) * 0.4); border-radius: 50%;
		border: 1.5px solid var(--theme-accent-line); opacity: 0;
	}
}

/* Labels: real tabs, positioned with the planes' formula */
.st-tabs { position: relative; height: 100%; }
.st-tab { --up: -1; }
.st-tab[data-lit], .st-tab[data-active] { --up: 1; }
.st-tab {
	position: absolute; top: 50%; left: 0; display: grid; grid-template-columns: 24px 2.1rem auto; align-items: center;
	max-width: 100%; min-height: 40px; padding: 0 12px 0 0; border: 0; border-radius: 12px; background: transparent;
	color: var(--theme-muted); font-size: 1.0625rem; font-weight: 520; letter-spacing: -0.012em; text-align: left; cursor: pointer;
	transition: translate 720ms var(--glide), color 220ms var(--ease), scale 220ms var(--ease);
}
/* Position is layout here, not motion: out-rank the global focus/touch "no drift" guard. */
.st-tabs > .st-tab {
	translate: 0 calc(-50% - ((var(--mid) - var(--i)) * var(--g) + var(--up) * var(--L) * 0.5) * var(--sin) * 1cqw);
}
.st-tab:active { scale: 0.97; }
.st-tab:focus-visible { outline: 2px solid var(--theme-focus); outline-offset: 2px; }
@media (hover: hover) and (pointer: fine) { .st-tab:hover { color: var(--theme-ink); } }
.st-tab[data-hover]:not([data-active]) .st-tab-lead { background: color-mix(in srgb, var(--theme-accent-line) 60%, var(--theme-line-strong)); scale: 1.1 1; }
.st-plane[data-hover]:not([data-active]) { opacity: 1; border-color: color-mix(in srgb, var(--theme-accent) 50%, transparent); }
.st-tab[data-active] { color: var(--theme-ink); font-weight: 620; }
.st-tab-lead { width: 22px; height: 1px; background: var(--theme-line-strong); transform-origin: left; transition: background-color 260ms var(--ease), scale 360ms var(--ease); }
.st-tab[data-lit] .st-tab-lead { background: color-mix(in srgb, var(--theme-accent-line) 45%, var(--theme-line-strong)); }
.st-tab[data-active] .st-tab-lead { background: var(--theme-accent-line); scale: 1.2 1; }
.st-tab-index { padding-left: 6px; font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.08em; font-variant-numeric: tabular-nums; }
.st-tab[data-active] .st-tab-index { color: var(--theme-accent-text); }
.st-tab-name { min-width: 0; white-space: nowrap; }

/* Detail card */
.st-card {
	margin-top: 10px; padding: 18px 22px 22px; border-radius: var(--radius-card); border: 1px solid var(--theme-line);
	background: var(--theme-surface-solid); box-shadow: var(--shadow-raised);
}
.st-card-head { display: flex; align-items: center; gap: 16px; min-height: 32px; }
/* Counter: a strip of numbers that rolls to the selection. */
.st-count { display: inline-flex; align-items: center; gap: 0.5em; line-height: 1.25; white-space: nowrap; }
.st-odo { display: inline-block; height: 1.25em; overflow: hidden; }
.st-odo-strip { display: flex; flex-direction: column; translate: 0 calc(var(--active) * -1.25em); transition: translate 560ms var(--glide); }
.st-odo-strip > span { height: 1.25em; }
/* Depth rail: one segment per layer, a thumb that glides to the selection. */
.st-rail { position: relative; flex: 1; display: grid; grid-template-columns: repeat(var(--count), minmax(0, 1fr)); gap: 5px; align-items: center; height: 8px; min-width: 0; }
.st-rail-seg { height: 2px; border-radius: 999px; background: var(--theme-line-strong); transition: background-color 480ms var(--ease); }
.st-rail-seg[data-lit] { background: color-mix(in srgb, var(--theme-accent-line) 42%, var(--theme-line-strong)); }
.st-rail-thumb {
	position: absolute; left: 0; top: 50%; height: 6px; border-radius: 999px;
	width: calc((100% - (var(--count) - 1) * 5px) / var(--count));
	translate: calc(var(--active) * (100% + 5px)) -50%;
	background: var(--theme-accent-line);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-accent-line) 14%, transparent), 0 0 14px color-mix(in srgb, var(--theme-accent-line) 45%, transparent);
	transition: translate 620ms var(--glide);
}
.st[data-sending] .st-rail-thumb { transition-duration: 520ms; }
/* Touring: the thumb is a timer. Its fill grows while a layer is shown. */
.st[data-touring] .st-rail-thumb { background: color-mix(in srgb, var(--theme-accent-line) 30%, transparent); box-shadow: none; }
.st-rail-fill {
	position: absolute; inset: 0; border-radius: inherit; background: var(--theme-accent-line); transform-origin: left; scale: 0 1;
	box-shadow: 0 0 12px color-mix(in srgb, var(--theme-accent-line) 45%, transparent);
}
.st-play {
	display: grid; flex: none; place-items: center; width: 32px; height: 32px; margin: 0 -8px 0 -4px; border: 0; border-radius: 999px;
	background: transparent; color: var(--theme-muted); cursor: pointer;
	transition: color 200ms var(--ease), background-color 200ms var(--ease), scale 200ms var(--ease);
}
.st-play > svg { width: 12px; height: 12px; }
.st-play:disabled { opacity: 0.4; cursor: default; }
.st-play:not(:disabled):active { scale: 0.92; }
.st-play:focus-visible { outline: 2px solid var(--theme-focus); outline-offset: 2px; }
@media (hover: hover) and (pointer: fine) { .st-play:not(:disabled):hover { color: var(--theme-ink); background: color-mix(in srgb, var(--theme-ink) 6%, transparent); } }
@media (pointer: coarse) { .st-play { width: 44px; height: 44px; margin: -6px -12px -6px -6px; } }
/* Panels share one cell, so the card never changes height. The new layer's
   copy fades in as one block with a short rise; the old one leaves at once. */
.st-panels { display: grid; margin-top: 10px; }
.st-panel {
	grid-area: 1 / 1; min-width: 0; border-radius: 12px; visibility: hidden; opacity: 0; translate: 0 var(--off, 8px);
	transition: opacity 280ms var(--ease), translate 420ms var(--ease), visibility 0s linear 420ms;
}
.st-panel[data-pos="before"] { --off: -8px; }
.st-panel[data-pos="after"] { --off: 8px; }
.st-panel[data-active] {
	visibility: visible; opacity: 1; translate: 0 0;
	transition: opacity 420ms var(--ease) 90ms, translate 620ms var(--glide) 60ms, visibility 0s;
}
.st-panel > * { margin: 0; }
.st-panel:focus-visible { outline: 2px solid var(--theme-focus); outline-offset: 6px; }
.st-panel-title { font-size: clamp(1.375rem, 2vw, 1.625rem); font-weight: 620; letter-spacing: -0.025em; line-height: 1.15; color: var(--theme-ink); }
.st-panel-copy { margin-top: 8px; max-width: 48ch; font-size: 1.0625rem; line-height: 1.5; color: var(--theme-ink-soft); }
.st-panel-tools { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; padding: 0; list-style: none; }

/* Request trace: all six lines are always there. The lines the request has
   reached are lit, and one highlight glides to the selected layer. */
.st-log {
	position: relative; display: grid; grid-template-rows: repeat(3, 22px); grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 2px 18px;
	margin: 16px 0 0; padding: 12px 0 0; border-top: 1px dashed var(--theme-line-strong); list-style: none;
	font-family: var(--font-mono); font-size: 12px; line-height: 22px; font-variant-numeric: tabular-nums;
}
.st-log::before {
	content: ""; position: absolute; left: 0; top: 12px; height: 22px; width: calc((100% - 18px) / 2); border-radius: 7px;
	background: color-mix(in srgb, var(--theme-accent) 9%, transparent);
	box-shadow: 0 0 0 4px color-mix(in srgb, var(--theme-accent) 9%, transparent);
	translate: calc(var(--col) * (100% + 18px)) calc(var(--row) * 24px);
	transition: translate 560ms var(--glide);
	pointer-events: none;
}
.st-log-line {
	position: relative; display: grid; grid-template-columns: 2.1em 4.6em minmax(0, 1fr); min-width: 0; height: 22px; white-space: nowrap;
	color: var(--theme-muted); transition: color 420ms var(--ease);
}
.st-log-line[data-lit] { color: var(--theme-ink-soft); }
.st-log-i { color: var(--theme-muted); }
.st-log-k { color: inherit; transition: color 420ms var(--ease); }
.st-log-line[data-lit] .st-log-k { color: var(--theme-accent-text); }
.st-log-d { overflow: hidden; text-overflow: ellipsis; }
.st-log-line[data-active] .st-log-d { color: var(--theme-ink); }

/* Narrow: the stack takes the full width; labels become a two-column grid */
@container st (max-width: 480px) {
	.st-body { grid-template-columns: minmax(0, 1fr); height: auto; }
	.st-scene { height: 84cqw; }
	.st-body { --P: 46cqw; --g: 8.6; --L: 5.5; }
	.st[data-open] .st-body { --g: 10.8; }
	.st[data-pinned] .st-body { --g: 12.8; --L: 3; --s: 0.76; }
	/* The planes sit closer here, so each name would cross the drawing below it. */
	.st-mini { transition: opacity 260ms var(--theme-ease); }
	.st[data-pinned] .st-plane:not([data-active]) .st-mini { opacity: 0.22; }
	/* The plane just above the active one would write its name across the lit drawing. */
	.st[data-pinned] .st-plane:has(+ .st-plane[data-active]) .st-plane-name { opacity: 0.3; }
	.st-head-sub { display: none; }
	.st-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 6px; height: auto; margin-top: 4px; }
	.st-tab {
		position: relative; top: auto; min-height: 44px; grid-template-columns: 2rem minmax(0, 1fr);
		padding: 0 10px; border-radius: 999px; font-size: 1rem;
	}
	.st-tabs > .st-tab { translate: none; }
	.st-tab[data-active] { background: color-mix(in srgb, var(--theme-ink) 5%, transparent); }
	.st-tab-lead { display: none; }
	.st-tab-index { padding-left: 0; }
	.st-tab-name { overflow: hidden; text-overflow: ellipsis; }
	.st-log { grid-template-rows: none; grid-auto-flow: row; }
	.st-log::before { width: 100%; translate: 0 calc(var(--active) * 24px); }
}

/* Motion: only with no reduced-motion preference */
.mi-press, .mi-srv, .mi-req, .mi-res, .mi-write-bg, .mi-node { fill: var(--theme-accent-line); }
.mi-press, .mi-srv, .mi-req, .mi-res, .mi-write-bg, .mi-node, .mi-check, .mi-pass, .mi-cursor, .mi-ver-new { opacity: 0; }
.mi-write { fill: currentColor; opacity: 0.4; transform-box: fill-box; transform-origin: 0 50%; }
.mi-check, .mi-pass { transform-box: fill-box; transform-origin: 50% 50%; }
.mi-ver { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.02em; text-anchor: middle; fill: currentColor; }
.mi-cursor { transform: translate(64px, 84px); }

@media (prefers-reduced-motion: no-preference) {
	.st[data-moving] .st-dot { animation: st-hop var(--step, ${STEP_MS}ms) cubic-bezier(0.65, 0, 0.35, 1) both; }
	.st[data-moving][data-landing] .st-dot { animation: st-dwell var(--step, ${STEP_MS}ms) linear both; }
	.st[data-touring] .st-rail-fill { animation: st-fill var(--step, ${STEP_MS}ms) linear forwards; }
	.st-log-line[data-now] { animation: st-print 360ms var(--ease) both; }
	.st[data-sending][data-landing] .st-land::before { animation: st-ring 1400ms var(--ease) 250ms both; }
	.st[data-moving][data-first] .st-dot-core { animation: st-dot-in 360ms var(--ease) both; }
	.st:is([data-paused], [data-hold]) :is(.st-dot, .st-dot-core, .st-rail-fill),
	.st:is([data-paused], [data-hold]) .st-land::before { animation-play-state: paused; }

	.st-plane[data-active] .mi-cursor { animation: mi-cursor 2.8s var(--ease) infinite; }
	.st-plane[data-active] .mi-press { animation: mi-press 2.8s var(--ease) infinite; }
	.st-plane[data-active] .mi-req { animation: mi-req 2.4s var(--ease) infinite; }
	.st-plane[data-active] .mi-srv { animation: mi-srv 2.4s var(--ease) infinite; }
	.st-plane[data-active] .mi-res { animation: mi-res 2.4s var(--ease) infinite; }
	.st-plane[data-active] .mi-write { animation: mi-write 2.8s var(--ease) infinite; }
	.st-plane[data-active] .mi-write-late { animation-delay: 0.25s; }
	.st-plane[data-active] .mi-write-bg { animation: mi-flash 2.8s var(--ease) infinite; }
	.st-plane[data-active] .mi-shackle { animation: mi-shackle 2.8s var(--ease) infinite; }
	.st-plane[data-active] .mi-check { animation: mi-pop 2.8s var(--ease) infinite; }
	.st-plane[data-active] .mi-node { animation: mi-node 1.8s var(--ease) infinite; }
	.st-plane[data-active] .mi-pass { animation: mi-pass 2.8s var(--ease) infinite; }
	.st-plane[data-active] .mi-ver-old { animation: mi-ver-old 2.8s var(--ease) infinite; }
	.st-plane[data-active] .mi-ver-new { animation: mi-ver-new 2.8s var(--ease) infinite; }
	.st[data-paused] .st-plane [class^="mi-"] { animation-play-state: paused; }
}
@media (prefers-reduced-motion: reduce) {
	.st-rig { transform: rotateX(calc(var(--rx) * 1deg)) rotateZ(-45deg); }
	.st-odo-strip, .st-rail-thumb, .st-rail-seg, .st-log::before, .st-log-line, .st-panel { transition: none !important; }
	.st-panel { translate: none; }
}

@keyframes st-fill { to { scale: 1 1; } }
@keyframes st-hop {
	0%, 58% { translate: 0 0 calc(((var(--mid) - var(--active)) * var(--g) + var(--L) * 0.5 + 0.8) * 1cqw); }
	100% { translate: 0 0 calc(((var(--mid) - var(--to)) * var(--g) + var(--L) * 0.5 + 0.8) * 1cqw); }
}
@keyframes st-dwell {
	0%, 82% { opacity: 1; }
	100% { opacity: 0; }
}
@keyframes st-ring {
	from { opacity: 0.9; scale: 0.4; }
	to { opacity: 0; scale: 1.8; }
}
@keyframes st-print { from { opacity: 0; translate: -6px 0; } }
@keyframes st-dot-in { from { opacity: 0; scale: 0.4; } }

@keyframes mi-cursor {
	0% { transform: translate(64px, 84px); opacity: 0; }
	15% { opacity: 1; }
	42%, 62% { transform: translate(40px, 66px); opacity: 1; }
	50% { transform: translate(40px, 66px) scale(0.86); }
	88% { transform: translate(64px, 84px); opacity: 0; }
	100% { transform: translate(64px, 84px); opacity: 0; }
}
@keyframes mi-press { 0%, 46% { opacity: 0; } 54%, 76% { opacity: 1; } 92%, 100% { opacity: 0; } }
@keyframes mi-req {
	0%, 6% { transform: translateX(0); opacity: 0; }
	12% { opacity: 1; }
	40% { transform: translateX(28px); opacity: 1; }
	46%, 100% { transform: translateX(28px); opacity: 0; }
}
@keyframes mi-srv { 0%, 38% { opacity: 0; } 46% { opacity: 0.35; } 62%, 100% { opacity: 0; } }
@keyframes mi-res {
	0%, 48% { transform: translateX(0); opacity: 0; }
	54% { opacity: 1; }
	82% { transform: translateX(-28px); opacity: 1; }
	90%, 100% { transform: translateX(-28px); opacity: 0; }
}
@keyframes mi-write {
	0%, 4% { transform: scaleX(1); opacity: 0.4; }
	8% { transform: scaleX(0); opacity: 0.9; }
	34% { transform: scaleX(1); opacity: 0.9; }
	70%, 100% { transform: scaleX(1); opacity: 0.4; }
}
@keyframes mi-flash { 0%, 30% { opacity: 0; } 40% { opacity: 0.22; } 75%, 100% { opacity: 0; } }
@keyframes mi-shackle {
	0%, 6% { transform: translateY(0); }
	16%, 30% { transform: translateY(-6px); }
	40%, 100% { transform: translateY(0); }
}
@keyframes mi-pop {
	0%, 40% { transform: scale(0.3); opacity: 0; }
	50% { transform: scale(1.08); opacity: 1; }
	56%, 84% { transform: scale(1); opacity: 1; }
	94%, 100% { transform: scale(0.6); opacity: 0; }
}
@keyframes mi-node { 0% { opacity: 0; } 18% { opacity: 1; } 55%, 100% { opacity: 0; } }
@keyframes mi-pass {
	0% { transform: scale(0.4); opacity: 0; }
	8% { transform: scale(1.1); opacity: 1; }
	14%, 74% { transform: scale(1); opacity: 1; }
	86%, 100% { transform: scale(1); opacity: 0; }
}
@keyframes mi-ver-old {
	0%, 52% { transform: translateY(0); opacity: 1; }
	60% { transform: translateY(-5px); opacity: 0; }
	92% { transform: translateY(5px); opacity: 0; }
	100% { transform: translateY(0); opacity: 1; }
}
@keyframes mi-ver-new {
	0%, 52% { transform: translateY(5px); opacity: 0; }
	60%, 86% { transform: translateY(0); opacity: 1; }
	94%, 100% { transform: translateY(-5px); opacity: 0; }
}
`;
