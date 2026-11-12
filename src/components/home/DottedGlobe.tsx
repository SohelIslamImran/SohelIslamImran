import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/components/motion";
import { cn } from "@/lib/utils";

const DEG = Math.PI / 180;
/** Dhaka. The view is centred a little south so the pin sits above the middle. */
const PIN = { lat: 23.81, lon: 90.41 };
const VIEW = { lat: 12, lon: 90.41 };
const R = 100;
const C = 110;

interface Dot {
	x: string;
	y: string;
	o: string;
	r: string;
}

function project(lat: number, lon: number, viewLon = VIEW.lon) {
	const phi = lat * DEG;
	const lambda = (lon - viewLon) * DEG;
	const phi0 = VIEW.lat * DEG;
	const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
	const x = Math.cos(phi) * Math.sin(lambda);
	const y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda);
	return { x: C + R * x, y: C - R * y, depth: cosC };
}

const GRID: { lat: number; lon: number }[] = (() => {
	const points: { lat: number; lon: number }[] = [];
	for (let lat = -80; lat <= 80; lat += 8) {
		const ring = Math.max(1, Math.round(44 * Math.cos(lat * DEG)));
		for (let step = 0; step < ring; step += 1) {
			points.push({ lat, lon: (step / ring) * 360 + (lat % 16 === 0 ? 0 : 180 / ring) });
		}
	}
	return points;
})();

/**
 * The still globe, computed once at module load. Pure math with fixed
 * rounding, so the server and the client produce identical markup.
 */
const DOTS: Dot[] = GRID.flatMap(({ lat, lon }) => {
	const point = project(lat, lon);
	if (point.depth <= 0.04) return [];
	return [
		{
			x: point.x.toFixed(2),
			y: point.y.toFixed(2),
			o: (0.18 + point.depth * 0.62).toFixed(2),
			r: (0.7 + point.depth * 0.75).toFixed(2),
		},
	];
});

const PIN_POINT = project(PIN.lat, PIN.lon);

/** Where the sun is overhead right now (a simple model, good to a degree or two). */
export function subsolarPoint(date: Date) {
	const start = Date.UTC(date.getUTCFullYear(), 0, 0);
	const day = (date.getTime() - start) / 86_400_000;
	const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));
	const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
	return { lat: declination, lon: -15 * (hours - 12) };
}

function toVector(lat: number, lon: number) {
	return [
		Math.cos(lat * DEG) * Math.cos(lon * DEG),
		Math.cos(lat * DEG) * Math.sin(lon * DEG),
		Math.sin(lat * DEG),
	] as const;
}

/** True when the sun is above the horizon at the pin (Dhaka). */
export function isDaylightAtPin(date: Date) {
	const sun = subsolarPoint(date);
	const a = toVector(PIN.lat, PIN.lon);
	const b = toVector(sun.lat, sun.lon);
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] > 0;
}

function StaticGlobe() {
	const px = PIN_POINT.x.toFixed(2);
	const py = PIN_POINT.y.toFixed(2);
	return (
		<svg viewBox="0 0 220 220" focusable="false" className="block size-full text-foreground">
			<defs>
				<radialGradient id="globe-shade" cx="42%" cy="36%" r="70%">
					<stop offset="0%" stopColor="var(--theme-surface-solid)" stopOpacity="0" />
					<stop offset="100%" stopColor="var(--theme-ink)" stopOpacity="0.06" />
				</radialGradient>
			</defs>
			<circle
				cx={C}
				cy={C}
				r={R + 0.5}
				fill="url(#globe-shade)"
				stroke="var(--theme-line-strong)"
				strokeWidth="0.75"
			/>
			<g fill="currentColor">
				{DOTS.map((dot, index) => (
					<circle
						key={`${dot.x}-${dot.y}-${index}`}
						cx={dot.x}
						cy={dot.y}
						r={dot.r}
						opacity={dot.o}
					/>
				))}
			</g>
			<circle
				cx={px}
				cy={py}
				r="9"
				fill="none"
				stroke="var(--theme-accent-line)"
				strokeOpacity="0.35"
			/>
			<circle
				cx={px}
				cy={py}
				r="3.6"
				fill="var(--theme-accent-line)"
				stroke="var(--theme-surface-solid)"
				strokeWidth="1.6"
			/>
		</svg>
	);
}

/**
 * Decorative globe with a pin on Dhaka. The server sends a still SVG. After
 * mount, a canvas takes over: the globe turns slowly and the side of the
 * Earth in night (from the real time) dims. It stops when off-screen or
 * when the tab is hidden; under reduced motion it stays still but keeps the
 * day/night shading.
 */
export function DottedGlobe({ className }: { className?: string }) {
	const wrapRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const reduceMotion = usePrefersReducedMotion();
	const [live, setLive] = useState(false);

	useEffect(() => {
		const canvas = canvasRef.current;
		const wrap = wrapRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !wrap || !context) return;
		setLive(true);

		let size = 0;
		let ratio = 1;
		const resize = () => {
			ratio = Math.min(2, window.devicePixelRatio || 1);
			size = wrap.clientWidth;
			canvas.width = Math.round(size * ratio);
			canvas.height = Math.round(size * ratio);
		};
		resize();
		const resizeObserver = new ResizeObserver(() => {
			resize();
			if (!running) draw(performance.now());
		});
		resizeObserver.observe(wrap);

		let ink = "rgb(0 0 0)";
		let accent = "rgb(0 100 255)";
		let surface = "rgb(255 255 255)";
		const readColors = () => {
			const style = getComputedStyle(wrap);
			ink = style.color;
			accent = style.getPropertyValue("--theme-accent-line").trim() || accent;
			surface = style.getPropertyValue("--theme-surface-solid").trim() || surface;
		};
		readColors();
		const themeObserver = new MutationObserver(() => {
			readColors();
			if (!running) draw(performance.now());
		});
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-theme", "data-accent", "style"],
		});

		let sun = toVector(0, 0);
		const updateSun = () => {
			const point = subsolarPoint(new Date());
			sun = toVector(point.lat, point.lon);
		};
		updateSun();
		const sunTimer = window.setInterval(updateSun, 60_000);

		let viewLon = VIEW.lon;
		let raf = 0;
		let running = false;
		const start = performance.now();

		const draw = (now: number) => {
			const scale = (size * ratio) / 220;
			context.setTransform(scale, 0, 0, scale, 0, 0);
			context.clearRect(0, 0, 220, 220);
			context.beginPath();
			context.arc(C, C, R + 0.5, 0, Math.PI * 2);
			context.strokeStyle = ink;
			context.globalAlpha = 0.16;
			context.lineWidth = 0.75;
			context.stroke();
			context.fillStyle = ink;
			for (const point of GRID) {
				const projected = project(point.lat, point.lon, viewLon);
				if (projected.depth <= 0.04) continue;
				const vector = toVector(point.lat, point.lon);
				const light = vector[0] * sun[0] + vector[1] * sun[1] + vector[2] * sun[2];
				const day = Math.min(1, Math.max(0.28, 0.6 + light * 1.4));
				context.globalAlpha = (0.14 + projected.depth * 0.66) * day;
				context.beginPath();
				context.arc(projected.x, projected.y, 0.7 + projected.depth * 0.75, 0, Math.PI * 2);
				context.fill();
			}
			const pin = project(PIN.lat, PIN.lon, viewLon);
			if (pin.depth > 0) {
				const fade = Math.min(1, pin.depth * 3);
				const pulse = reduceMotion ? 0 : ((now - start) / 1600) % 1;
				context.globalAlpha = fade * 0.35 * (1 - pulse);
				context.beginPath();
				context.arc(pin.x, pin.y, 5 + pulse * 10, 0, Math.PI * 2);
				context.fillStyle = accent;
				context.fill();
				context.globalAlpha = fade * 0.4;
				context.beginPath();
				context.arc(pin.x, pin.y, 9, 0, Math.PI * 2);
				context.strokeStyle = accent;
				context.lineWidth = 0.9;
				context.stroke();
				context.globalAlpha = fade;
				context.beginPath();
				context.arc(pin.x, pin.y, 3.6, 0, Math.PI * 2);
				context.fillStyle = accent;
				context.fill();
				context.lineWidth = 1.6;
				context.strokeStyle = surface;
				context.stroke();
			}
			context.globalAlpha = 1;
		};

		const tick = (now: number) => {
			// A slow sway around Dhaka, so the pin never leaves the front.
			viewLon = VIEW.lon + Math.sin((now - start) / 9000) * 38;
			draw(now);
			raf = requestAnimationFrame(tick);
		};

		const play = () => {
			if (running || reduceMotion) return;
			running = true;
			raf = requestAnimationFrame(tick);
		};
		const pause = () => {
			running = false;
			cancelAnimationFrame(raf);
		};

		draw(start);
		let visible = false;
		const sync = () => (visible && document.visibilityState === "visible" ? play() : pause());
		const intersection = new IntersectionObserver(([entry]) => {
			visible = entry?.isIntersecting ?? false;
			sync();
		});
		intersection.observe(wrap);
		document.addEventListener("visibilitychange", sync);
		const redrawStill = () => {
			if (!running) draw(performance.now());
		};
		const stillTimer = window.setInterval(redrawStill, 60_000);

		return () => {
			pause();
			intersection.disconnect();
			resizeObserver.disconnect();
			themeObserver.disconnect();
			document.removeEventListener("visibilitychange", sync);
			window.clearInterval(sunTimer);
			window.clearInterval(stillTimer);
		};
	}, [reduceMotion]);

	return (
		<div
			ref={wrapRef}
			aria-hidden="true"
			className={cn("relative aspect-square text-foreground", className)}
		>
			<div className={cn("absolute inset-0", live && "invisible")}>
				<StaticGlobe />
			</div>
			<canvas ref={canvasRef} className="absolute inset-0 size-full" />
		</div>
	);
}
