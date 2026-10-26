import { useState } from "react";
import { cn } from "../lib/utils";

interface PortfolioImageProps {
	src?: string | null;
	alt?: string | null;
	width?: number | null;
	height?: number | null;
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
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	const source = src?.trim() || undefined;
	const imageAlt = alt?.trim() || "";
	const imageWidth =
		typeof width === "number" && Number.isFinite(width) && width > 0 ? width : 1200;
	const imageHeight =
		typeof height === "number" && Number.isFinite(height) && height > 0 ? height : 800;
	const fallbackAspectRatio = Math.min(Math.max(imageWidth / imageHeight, 0.5), 2);
	const failed = Boolean(source && failedSrc === source);

	if (!source || failed) {
		return (
			<div
				className={cn(
					"grid min-h-0 w-full max-w-full place-items-center overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-accent)_16%,var(--theme-surface-solid)),var(--theme-surface-solid),var(--theme-accent-soft))] p-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-primary-text",
					className,
				)}
				role="img"
				aria-label={imageAlt || "Image unavailable"}
				style={{ aspectRatio: fallbackAspectRatio }}
			>
				<span aria-hidden="true">Image unavailable</span>
			</div>
		);
	}

	return (
		<img
			className={cn("block h-auto max-w-full", className)}
			src={source}
			alt={imageAlt}
			width={imageWidth}
			height={imageHeight}
			loading={loading}
			fetchPriority={fetchPriority}
			sizes={sizes}
			srcSet={srcSet}
			onError={() => setFailedSrc(source)}
			decoding="async"
		/>
	);
}
