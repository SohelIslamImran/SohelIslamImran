import { useRef, type PointerEvent } from 'react';
import { ResponsiveImage } from './ResponsiveImage';

interface WorldlineHeroProps {
	src?: string;
	alt?: string;
}

export function WorldlineHero({ src = '/images/sohel-linkedin.png', alt = 'Sohel Islam Imran' }: WorldlineHeroProps) {
	const sceneRef = useRef<HTMLDivElement>(null);
	const boundsRef = useRef<DOMRect | null>(null);
	const pendingRef = useRef<{ x: number; y: number } | null>(null);
	const frameRef = useRef<number | null>(null);

	const moveScene = (event: PointerEvent<HTMLDivElement>) => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (!boundsRef.current) boundsRef.current = event.currentTarget.getBoundingClientRect();
		const rect = boundsRef.current;
		const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
		const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
		pendingRef.current = { x, y };
		if (frameRef.current !== null) return;
		frameRef.current = window.requestAnimationFrame(() => {
			const pending = pendingRef.current;
			if (pending && sceneRef.current) {
				sceneRef.current.style.setProperty('--pointer-x', pending.x.toFixed(3));
				sceneRef.current.style.setProperty('--pointer-y', pending.y.toFixed(3));
			}
			frameRef.current = null;
		});
	};

	const resetScene = () => {
		boundsRef.current = null;
		pendingRef.current = null;
		if (frameRef.current !== null) {
			window.cancelAnimationFrame(frameRef.current);
			frameRef.current = null;
		}
		sceneRef.current?.style.setProperty('--pointer-x', '0');
		sceneRef.current?.style.setProperty('--pointer-y', '0');
	};

	return (
		<div
			ref={sceneRef}
			className="worldline-portrait"
			role="img"
			onPointerMove={moveScene}
			onPointerLeave={resetScene}
			aria-label="Portrait of Sohel Islam Imran with an interactive career route"
		>
			<div className="worldline-portrait__halo" aria-hidden="true" />
			<div className="worldline-portrait__lens">
				<ResponsiveImage src={src} alt={alt} width="800" height="800" fetchPriority="high" sizes="(max-width: 900px) 70vw, 34vw" />
				<span className="worldline-portrait__glint" aria-hidden="true" />
			</div>
			<svg className="worldline-portrait__route" viewBox="0 0 760 500" aria-hidden="true">
				<path d="M10 430C150 420 188 360 286 360s126 32 196-12c71-45 83-151 267-244" />
				<circle cx="286" cy="360" r="8" />
				<circle cx="486" cy="345" r="5" />
				<circle cx="671" cy="161" r="5" />
			</svg>
			<div className="worldline-portrait__node worldline-portrait__node--kuno">
				<strong>Kuno</strong>
				<span>Lead Full Stack Engineer</span>
			</div>
			<div className="worldline-portrait__node worldline-portrait__node--tilleli">
				<strong>Tilleli</strong>
				<span>React Native</span>
			</div>
			<div className="worldline-portrait__node worldline-portrait__node--origin">
				<strong>Dhaka</strong>
				<span>Origin</span>
			</div>
		</div>
	);
}
