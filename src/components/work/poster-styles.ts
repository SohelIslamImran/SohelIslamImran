/*
 * Styles for the generated project posters. Rendered once through React 19's
 * hoisted <style href precedence>, so the server sends it in <head> and every
 * poster shares one copy.
 *
 * Rules of the road:
 * - Colours come only from the theme tokens, so posters follow light/dark and
 *   all six accents.
 * - The un-animated state of every element is a finished composition. Loops
 *   only run with `prefers-reduced-motion: no-preference`, so reduced motion
 *   shows a calm still.
 * - Loops pause while the poster is off-screen (`data-paused`, set by
 *   useOffscreenPause). `.wp-h` elements only play while the card that hosts
 *   the poster is hovered or focused, which is how the art "wakes up".
 * - Motion is transform/opacity, plus stroke-dashoffset on small paths.
 */
export const posterStyles = String.raw`
[data-poster] {
	--wp-ink-1: color-mix(in srgb, var(--theme-ink) 5%, transparent);
	--wp-ink-2: color-mix(in srgb, var(--theme-ink) 10%, transparent);
	--wp-ink-3: color-mix(in srgb, var(--theme-ink) 18%, transparent);
	--wp-ink-4: color-mix(in srgb, var(--theme-ink) 34%, transparent);
	--wp-accent-1: color-mix(in srgb, var(--theme-accent) 12%, transparent);
	--wp-accent-2: color-mix(in srgb, var(--theme-accent) 24%, transparent);
	--wp-ease: cubic-bezier(0.22, 1, 0.36, 1);
	--wp-soft: cubic-bezier(0.65, 0, 0.35, 1);
	position: relative;
	isolation: isolate;
	overflow: hidden;
	background-color: color-mix(in srgb, var(--theme-ink) 2.5%, var(--theme-surface-solid));
	background-image:
		radial-gradient(var(--wp-glow-size, 70%) 80% at var(--wp-glow-x, 82%) var(--wp-glow-y, 8%), color-mix(in srgb, var(--theme-accent) 13%, transparent), transparent 70%),
		radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--theme-ink) 9%, transparent) 1px, transparent 1.2px);
	background-size: 100% 100%, 18px 18px;
	background-position: 0 0, 9px 9px;
	box-shadow: inset 0 0 0 1px var(--theme-line);
}
html[data-theme-resolved="dark"] [data-poster] {
	background-color: color-mix(in srgb, var(--theme-ink) 3.5%, var(--theme-surface-solid));
}
/*
 * Depth. The stage rotates with --wp-rx/--wp-ry (set by useDepthTilt); each
 * plane sits at its own Z, scaled by --wp-sep. At rest the planes line up into
 * one picture; hover, focus, or tilt pulls them apart.
 */
[data-poster] {
	--wp-sep: 5px;
	--wp-sep-open: 26px;
	perspective: 1100px;
}
[data-poster][data-depth="hero"] {
	--wp-sep: 10px;
	--wp-sep-open: 44px;
	perspective: 1500px;
}
[data-poster] [data-poster-stage] {
	position: absolute;
	inset: 0;
	transform-style: preserve-3d;
	transform: rotateX(var(--wp-rx, 0deg)) rotateY(var(--wp-ry, 0deg));
	transition: transform 800ms var(--wp-ease), scale 700ms var(--wp-ease);
}
[data-poster][data-tilt] [data-poster-stage] { transition-duration: 240ms, 700ms; }
[data-poster] [data-plane] {
	position: absolute;
	inset: 0;
	display: block;
	width: 100%;
	height: 100%;
	overflow: visible;
	transform: translateZ(calc(var(--wp-z) * var(--wp-sep)));
	transition: transform 800ms var(--wp-ease);
}
[data-poster] [data-plane="back"] { --wp-z: -1; }
[data-poster] [data-plane="mid"] { --wp-z: 0; }
[data-poster] [data-plane="front"] { --wp-z: 1; }
[data-poster][data-depth="flat"] [data-poster-stage],
[data-poster][data-depth="flat"] [data-plane] { transform: none; }
[data-poster][data-tilt]:not([data-depth="flat"]) { --wp-sep: var(--wp-sep-open); }

/* A soft light that follows the pointer (or the device) across the planes. */
[data-poster] [data-poster-light] {
	position: absolute;
	inset: 0;
	z-index: 1;
	pointer-events: none;
	opacity: 0;
	background: radial-gradient(55% 75% at var(--wp-lx, 50%) var(--wp-ly, 0%), color-mix(in srgb, #fff 55%, transparent), transparent 70%);
	mix-blend-mode: soft-light;
	transition: opacity 600ms var(--wp-ease);
}
html[data-theme-resolved="dark"] [data-poster] [data-poster-light] {
	background: radial-gradient(55% 75% at var(--wp-lx, 50%) var(--wp-ly, 0%), color-mix(in srgb, #fff 16%, transparent), transparent 70%);
	mix-blend-mode: screen;
}
[data-poster][data-tilt] [data-poster-light] { opacity: 1; }
[data-poster][data-depth="flat"] [data-poster-light] { display: none; }
/* Only animated pieces get a local origin, so plain transform attributes stay exact. */
.wp-o, .wp-ping, .wp-sway, .wp-spin, .wp-spin-rev, .wp-upd-arrow, .wp-upd-check, .wp-pin-shadow,
.wp-hydrate, .wp-confirm, .wp-original, .wp-kuno-wave-a, .wp-kuno-wave-b, .wp-kuno-spark, .wp-kuno-check {
	transform-box: fill-box;
	transform-origin: center;
}
.wp-stream, .wp-upd-bar {
	transform-box: fill-box;
	transform-origin: left center;
}
[data-poster] text {
	font-family: var(--font-mono);
	font-variant-numeric: tabular-nums;
}
[data-poster] text.wp-kuno-question {
	font-family: var(--font-sans);
}

/* Paint */
.wp-surface { fill: var(--theme-surface-solid); stroke: var(--theme-line-strong); stroke-width: 1; }
.wp-raised { fill: color-mix(in srgb, var(--theme-ink) 3%, var(--theme-surface-solid)); stroke: var(--theme-line-strong); stroke-width: 1; }
.wp-paper { fill: var(--theme-paper); }
.wp-k1 { fill: var(--wp-ink-1); }
.wp-k2 { fill: var(--wp-ink-2); }
.wp-k3 { fill: var(--wp-ink-3); }
.wp-k4 { fill: var(--wp-ink-4); }
.wp-k5 { fill: color-mix(in srgb, var(--theme-ink) 62%, transparent); }
.wp-ink { fill: var(--theme-ink); }
.wp-muted { fill: var(--theme-muted); }
.wp-a { fill: var(--theme-accent); }
.wp-a1 { fill: var(--wp-accent-1); }
.wp-a2 { fill: var(--wp-accent-2); }
.wp-at { fill: var(--theme-accent-text); }
.wp-on-a { fill: var(--theme-accent-foreground); }
.wp-signal { fill: var(--theme-signal); }
.wp-success { fill: var(--theme-success); }
.wp-ln { fill: none; stroke: var(--theme-line-strong); stroke-width: 1; }
.wp-ln2 { fill: none; stroke: var(--wp-ink-3); stroke-width: 1.5; }
.wp-ln3 { fill: none; stroke: var(--wp-ink-2); }
.wp-as { fill: none; stroke: var(--theme-accent-line); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.wp-as-soft { fill: none; stroke: color-mix(in srgb, var(--theme-accent-line) 26%, transparent); stroke-linecap: round; }
.wp-on-a-s { fill: none; stroke: var(--theme-accent-foreground); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.wp-dash { stroke-dasharray: 3 5; }
.wp-paper-s { fill: none; stroke: var(--theme-paper); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.wp-road { fill: none; stroke: var(--wp-ink-1); stroke-linecap: round; }
.wp-drop { filter: drop-shadow(0 1px 1.5px var(--theme-shadow-soft)) drop-shadow(0 10px 22px var(--theme-shadow)); }
.wp-drop-lg { filter: drop-shadow(0 2px 3px var(--theme-shadow-soft)) drop-shadow(0 18px 34px var(--theme-shadow-strong)); }
.wp-glow { opacity: 0.55; transition: opacity 600ms var(--wp-ease); }
.wp-h-show { opacity: 0; transition: opacity 500ms var(--wp-ease); }

@media (hover: hover) and (pointer: fine) {
	[data-poster-host]:hover [data-poster] [data-poster-stage] { scale: 1.03; }
	[data-poster-host]:hover [data-poster]:not([data-depth="flat"]) { --wp-sep: var(--wp-sep-open); }
	[data-poster-host]:hover [data-poster] .wp-glow { opacity: 1; }
	[data-poster-host]:hover [data-poster] .wp-h-show { opacity: 1; }
}
/* Keyboard: focusing the card opens the layers at a fixed angle, the same view a pointer gets. */
[data-poster-host]:has(:focus-visible) [data-poster]:not([data-tilt]):not([data-depth="flat"]) {
	--wp-sep: var(--wp-sep-open);
	--wp-rx: 5deg;
	--wp-ry: -8deg;
	--wp-lx: 25%;
	--wp-ly: 10%;
}
[data-poster-host]:has(:focus-visible) [data-poster] [data-poster-light] { opacity: 1; }
[data-poster-host]:focus-within [data-poster] .wp-glow { opacity: 1; }
[data-poster-host]:focus-within [data-poster] .wp-h-show { opacity: 1; }

@media (prefers-reduced-motion: no-preference) {
	/* Travelling lit segment on a path with pathLength="100". */
	.wp-run { stroke-dasharray: 12 120; animation: wp-run var(--wp-d, 3.6s) var(--wp-soft) infinite; }
	.wp-march { animation: wp-march 1.6s linear infinite; }
	.wp-ping { animation: wp-ping 2.6s var(--wp-ease) infinite; }
	.wp-bob { animation: wp-bob 4.8s var(--wp-soft) infinite; }
	.wp-sway { animation: wp-sway 7s var(--wp-soft) infinite; }
	.wp-blink { animation: wp-blink 1.1s steps(1, end) infinite; }
	.wp-pulse { animation: wp-pulse 2.8s var(--wp-soft) infinite; }
	.wp-spin { animation: wp-spin 18s linear infinite; }
	.wp-spin-rev { animation: wp-spin 26s linear infinite reverse; }

	/* kuno: peers take turns speaking while the guided prompt and reflection respond */
	.wp-kuno-ring-a { animation: wp-kuno-ring-a 8s var(--wp-ease) infinite; }
	.wp-kuno-ring-b { animation: wp-kuno-ring-b 8s var(--wp-ease) infinite; }
	.wp-kuno-wave-a { animation: wp-kuno-wave-a 8s var(--wp-soft) infinite; }
	.wp-kuno-wave-b { animation: wp-kuno-wave-b 8s var(--wp-soft) infinite; }
	.wp-kuno-spark { animation: wp-kuno-spark 4s var(--wp-soft) infinite; }
	.wp-kuno-check { animation: wp-kuno-check 8s var(--wp-ease) infinite; }
	.wp-kuno-pip { animation: wp-kuno-pip 8s var(--wp-ease) infinite; }

	/* expo-in-app-updates: sheet rises, ring fills, check lands, sheet leaves */
	.wp-upd-sheet { animation: wp-upd-sheet 6.4s var(--wp-ease) infinite; }
	.wp-upd-ring { animation: wp-upd-ring 6.4s var(--wp-soft) infinite; }
	.wp-upd-arrow { animation: wp-upd-arrow 6.4s var(--wp-ease) infinite; }
	.wp-upd-check { animation: wp-upd-check 6.4s var(--wp-ease) infinite; }
	.wp-upd-bar { animation: wp-upd-bar 3.2s var(--wp-soft) infinite; }

	/* tilleli */
	.wp-pin { animation: wp-pin 3.2s var(--wp-ease) infinite; }
	.wp-pin-shadow { animation: wp-pin-shadow 3.2s var(--wp-ease) infinite; }

	/* portfolio: SSR chunks stream in, then the page hydrates */
	.wp-stream { animation: wp-stream 7s var(--wp-ease) calc(var(--i, 0) * 0.16s) infinite backwards; }
	.wp-hydrate { animation: wp-hydrate 7s var(--wp-ease) infinite; }
	.wp-packet { animation: wp-packet 1.75s var(--wp-soft) infinite; }

	/* ghosttime: ANSI shimmer rolls through the ghost */
	.wp-shimmer { animation: wp-shimmer 2.8s var(--wp-soft) infinite; }

	/* tailsync: files hop to each peer, both confirm, the original is cleared */
	.wp-hop { animation: wp-hop 6s var(--wp-ease) infinite; }
	.wp-confirm { animation: wp-confirm 6s var(--wp-ease) infinite; }
	.wp-original { animation: wp-original 6s var(--wp-ease) infinite; }

	/* android-mac-display: the cursor moves on the Mac and on the phone */
	.wp-cursor { animation: wp-cursor 6s var(--wp-soft) infinite; }
	.wp-rec { animation: wp-pulse 1.6s var(--wp-soft) infinite; }

	/* expo-import-cost: a scan line passes; sizes appear beside each import */
	.wp-scan { animation: wp-scan 6s var(--wp-soft) infinite; }
	.wp-cost { animation: wp-cost 6s var(--wp-ease) calc(var(--i, 0) * 0.55s) infinite backwards; }

	/* Hover-only motion waits paused until its card is hovered or focused. */
	.wp-h { animation-play-state: paused; }
	@media (hover: hover) and (pointer: fine) {
		[data-poster-host]:hover .wp-h { animation-play-state: running; }
	}
	[data-poster-host]:focus-within .wp-h { animation-play-state: running; }
}

[data-poster][data-paused] *,
[data-poster][data-paused] *::before,
[data-poster][data-paused] *::after {
	animation-play-state: paused !important;
}

@media (prefers-reduced-motion: reduce) {
	[data-poster] *,
	[data-poster] *::before,
	[data-poster] *::after {
		animation: none !important;
	}
	[data-poster] [data-poster-stage],
	[data-poster] [data-plane] { transition: none; transform: none !important; }
	[data-poster-host]:hover [data-poster] [data-poster-stage] { scale: none; }
	[data-poster] [data-poster-light] { display: none; }
}

@keyframes wp-run {
	from { stroke-dashoffset: 12; }
	to { stroke-dashoffset: -100; }
}
@keyframes wp-march {
	to { stroke-dashoffset: -16; }
}
@keyframes wp-ping {
	0% { scale: 1; opacity: 0.7; }
	70%, 100% { scale: 2.4; opacity: 0; }
}
@keyframes wp-bob {
	0%, 100% { translate: 0 0; }
	50% { translate: 0 -6px; }
}
@keyframes wp-sway {
	0%, 100% { rotate: 0deg; translate: 0 0; }
	50% { rotate: 1.4deg; translate: 0 -4px; }
}
@keyframes wp-blink {
	0%, 50% { opacity: 1; }
	50.01%, 100% { opacity: 0; }
}
@keyframes wp-pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.35; }
}
@keyframes wp-spin {
	to { rotate: 360deg; }
}
@keyframes wp-kuno-ring-a {
	0%, 42% { opacity: 1; }
	48%, 92% { opacity: 0; }
	98%, 100% { opacity: 1; }
}
@keyframes wp-kuno-ring-b {
	0%, 44% { opacity: 0; }
	50%, 88% { opacity: 1; }
	94%, 100% { opacity: 0; }
}
@keyframes wp-kuno-wave-a {
	0%, 48%, 94%, 100% { scale: 1 0.55; opacity: 0.45; }
	8%, 22%, 36% { scale: 1 1.25; opacity: 1; }
	15%, 29%, 42% { scale: 1 0.7; opacity: 0.8; }
}
@keyframes wp-kuno-wave-b {
	0%, 46%, 94%, 100% { scale: 1 0.55; opacity: 0.45; }
	54%, 68%, 82% { scale: 1 1.25; opacity: 1; }
	61%, 75%, 88% { scale: 1 0.7; opacity: 0.8; }
}
@keyframes wp-kuno-spark {
	0%, 100% { scale: 1; opacity: 0.85; }
	50% { scale: 1.14; opacity: 1; }
}
@keyframes wp-kuno-check {
	0%, 72%, 100% { scale: 1; opacity: 0.9; }
	80% { scale: 1.16; opacity: 1; }
	88% { scale: 1; opacity: 1; }
}
@keyframes wp-kuno-pip {
	0%, 70% { opacity: 0.28; }
	78%, 92% { opacity: 1; }
	100% { opacity: 0.28; }
}
@keyframes wp-upd-sheet {
	0% { translate: 0 120px; }
	10%, 86% { translate: 0 0; }
	96%, 100% { translate: 0 120px; }
}
@keyframes wp-upd-ring {
	0%, 14% { stroke-dashoffset: 100; }
	66%, 100% { stroke-dashoffset: 0; }
}
@keyframes wp-upd-arrow {
	0%, 64% { opacity: 1; scale: 1; }
	70%, 100% { opacity: 0; scale: 0.6; }
}
@keyframes wp-upd-check {
	0%, 66% { opacity: 0; scale: 0.6; }
	72%, 100% { opacity: 1; scale: 1; }
}
@keyframes wp-upd-bar {
	0% { scale: 0 1; }
	80%, 100% { scale: 1 1; }
}
@keyframes wp-pin {
	0%, 100% { translate: 0 0; }
	18% { translate: 0 -12px; }
	32% { translate: 0 0; }
	40% { translate: 0 -3px; }
	48% { translate: 0 0; }
}
@keyframes wp-pin-shadow {
	0%, 100% { scale: 1; opacity: 1; }
	18% { scale: 0.62; opacity: 0.5; }
	32% { scale: 1; opacity: 1; }
}
@keyframes wp-stream {
	0% { scale: 0 1; opacity: 0; }
	9%, 80% { scale: 1 1; opacity: 1; }
	88%, 100% { scale: 1 1; opacity: 0; }
}
@keyframes wp-hydrate {
	0%, 46% { opacity: 0; scale: 0.8; }
	54% { opacity: 1; scale: 1.15; }
	62%, 86% { opacity: 1; scale: 1; }
	94%, 100% { opacity: 0; scale: 1; }
}
@keyframes wp-packet {
	0% { translate: 0 0; opacity: 0; }
	15% { opacity: 1; }
	85% { opacity: 1; }
	100% { translate: var(--wp-dx, -40px) var(--wp-dy, 0px); opacity: 0; }
}
@keyframes wp-shimmer {
	0%, 100% { opacity: 0; }
	22% { opacity: 1; }
	48% { opacity: 0; }
}
@keyframes wp-hop {
	0%, 8% { translate: 0 0; opacity: 0; }
	12% { opacity: 1; }
	36% { translate: var(--wp-dx) var(--wp-dy); opacity: 1; }
	42%, 100% { translate: var(--wp-dx) var(--wp-dy); opacity: 0; }
}
@keyframes wp-confirm {
	0%, 38% { opacity: 0; scale: 0.4; }
	46%, 90% { opacity: 1; scale: 1; }
	98%, 100% { opacity: 0; scale: 0.9; }
}
@keyframes wp-original {
	0%, 54% { opacity: 1; scale: 1; }
	62%, 90% { opacity: 0.12; scale: 0.82; }
	98%, 100% { opacity: 1; scale: 1; }
}
@keyframes wp-cursor {
	0%, 100% { translate: 0 0; }
	25% { translate: 54px 22px; }
	50% { translate: 96px -8px; }
	75% { translate: 30px 40px; }
}
@keyframes wp-scan {
	0% { translate: 0 0; opacity: 0; }
	6% { opacity: 1; }
	60% { translate: 0 var(--wp-scan, 100px); opacity: 1; }
	70%, 100% { translate: 0 var(--wp-scan, 100px); opacity: 0; }
}
@keyframes wp-cost {
	0%, 12% { opacity: 0; translate: -6px 0; }
	20%, 78% { opacity: 1; translate: 0 0; }
	88%, 100% { opacity: 0; translate: 0 0; }
}
`;
