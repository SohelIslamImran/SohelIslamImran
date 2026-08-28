interface PrismImageProps {
	src?: string | null;
	alt: string;
	width: number;
	height: number;
	className?: string;
	loading?: "eager" | "lazy";
}
export function PrismImage({
	src,
	alt,
	width,
	height,
	className,
	loading = "lazy",
}: PrismImageProps) {
	if (!src)
		return (
			<div className={`prism-image-placeholder ${className ?? ""}`} role="img" aria-label={alt}>
				<span aria-hidden="true">SI</span>
			</div>
		);
	return (
		<img
			className={className}
			src={src}
			alt={alt}
			width={width}
			height={height}
			loading={loading}
			decoding="async"
		/>
	);
}
