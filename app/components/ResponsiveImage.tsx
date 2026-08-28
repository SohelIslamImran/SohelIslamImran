import type { ImgHTMLAttributes } from 'react';

type ResponsiveAsset = {
	webp: readonly [string, number][];
	avif: readonly [string, number][];
};

const LOCAL_ASSETS: Record<string, ResponsiveAsset> = {
	'/images/sohel-linkedin.png': {
		webp: [
			['/images/sohel-linkedin-400.webp', 400],
			['/images/sohel-linkedin-800.webp', 800],
		],
		avif: [
			['/images/sohel-linkedin-400.avif', 400],
			['/images/sohel-linkedin-800.avif', 800],
		],
	},
	'/images/kuno-systems-placeholder.png': {
		webp: [
			['/images/kuno-systems-724.webp', 724],
			['/images/kuno-systems-1448.webp', 1448],
		],
		avif: [
			['/images/kuno-systems-724.avif', 724],
			['/images/kuno-systems-1448.avif', 1448],
		],
	},
	'/images/travel-placeholder.png': {
		webp: [
			['/images/travel-placeholder-561.webp', 561],
			['/images/travel-placeholder-1122.webp', 1122],
		],
		avif: [
			['/images/travel-placeholder-561.avif', 561],
			['/images/travel-placeholder-1122.avif', 1122],
		],
	},
};

function srcSet(entries: readonly [string, number][]) {
	return entries.map(([src, width]) => `${src} ${width}w`).join(', ');
}

export function ResponsiveImage({ sizes = '100vw', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
	const asset = typeof props.src === 'string' ? LOCAL_ASSETS[props.src] : undefined;

	return (
		<picture className="responsive-image">
			{asset ? <source type="image/avif" srcSet={srcSet(asset.avif)} sizes={sizes} /> : null}
			{asset ? <source type="image/webp" srcSet={srcSet(asset.webp)} sizes={sizes} /> : null}
			<img {...props} sizes={sizes} />
		</picture>
	);
}
