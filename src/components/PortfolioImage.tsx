import { useState } from "react";
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
	const [failed, setFailed] = useState(false);
	if (!src || failed)
		return (
			<div
				className={cn(
					"grid place-items-center rounded-[18px] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-accent)_16%,white),white_52%,#ffd8cb)] text-4xl font-extrabold text-primary-text",
					className,
				)}
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
			onError={() => setFailed(true)}
			decoding="async"
		/>
	);
}
