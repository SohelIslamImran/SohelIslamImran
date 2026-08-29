import { cn } from "../lib/utils";

interface PortfolioImageProps {
	src?: string | null;
	alt: string;
	width: number;
	height: number;
	className?: string;
	loading?: "eager" | "lazy";
	fetchPriority?: "high" | "low" | "auto";
	sizes?: string;
	srcSet?: string;
}
export function PortfolioImage({
	src,
	alt,
	width,
	height,
	className,
	loading = "lazy",
	fetchPriority,
	sizes,
	srcSet,
}: PortfolioImageProps) {
	if (!src)
		return (
			<div
				className={cn("image-placeholder", className)}
				role="img"
				aria-label={alt}
				style={{ aspectRatio: `${width} / ${height}` }}
			>
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
			fetchPriority={fetchPriority}
			sizes={sizes}
			srcSet={srcSet}
			decoding="async"
		/>
	);
}
