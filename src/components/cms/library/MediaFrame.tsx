/**
 * Owner-only media preview frame for CMS fields, pickers, and library cards.
 * Always loads images through `/draft-media/:id` (via `ownerMediaPreviewSrc`),
 * reserves space from intrinsic dimensions, shows a skeleton until load, fades
 * and settles the image in, and falls back cleanly for PDFs or broken assets.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import { CheckIcon } from "../fields/field-icons";
import { MediaLibraryIcon } from "../shell/cms-icons";
import { ownerMediaPreviewSrc } from "./owner-media";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const NON_IMAGE_LABELS: Record<string, string> = {
	"application/pdf": "PDF",
};

function nonImageTypeLabel(mimeType: string): string {
	const known = NON_IMAGE_LABELS[mimeType.toLowerCase()];
	if (known) return known;
	const subtype = mimeType.split("/")[1]?.trim();
	return subtype ? subtype.toUpperCase() : "File";
}

export interface MediaFrameProps {
	assetId: string | null | undefined;
	mimeType?: string | null;
	width?: number | null;
	height?: number | null;
	alt?: string;
	chip?: "draft" | "published";
	className?: string;
}

export function MediaFrame({
	assetId,
	mimeType,
	width,
	height,
	alt = "",
	chip,
	className,
}: MediaFrameProps) {
	const isKnownNonImage = Boolean(mimeType && !mimeType.startsWith("image/"));
	const src = isKnownNonImage ? null : ownerMediaPreviewSrc(assetId);
	const imgRef = useRef<HTMLImageElement>(null);
	const [loadState, setLoadState] = useState<{
		src: string | null;
		status: "loading" | "loaded" | "error";
	}>({ src, status: "loading" });

	const status =
		isKnownNonImage || !assetId
			? "fallback"
			: !src
				? "error"
				: loadState.src === src
					? loadState.status
					: "loading";

	useIsomorphicLayoutEffect(() => {
		const img = imgRef.current;
		if (src && img && img.complete && img.naturalWidth > 0) {
			setLoadState({ src, status: "loaded" });
		}
	}, [src]);

	const hasDimensions =
		typeof width === "number" &&
		typeof height === "number" &&
		Number.isFinite(width) &&
		Number.isFinite(height) &&
		width > 0 &&
		height > 0;

	return (
		<span
			data-slot="cms-media-frame"
			data-state={status}
			style={hasDimensions ? { aspectRatio: `${width} / ${height}` } : undefined}
			className={cn("cms-media-frame", className)}
		>
			{status === "loading" ? (
				<span aria-hidden="true" className="cms-skeleton cms-media-frame-skeleton" />
			) : null}

			{src && status !== "error" ? (
				<img
					ref={imgRef}
					src={src}
					alt={alt}
					width={hasDimensions ? width : undefined}
					height={hasDimensions ? height : undefined}
					loading="lazy"
					decoding="async"
					onLoad={() => setLoadState({ src, status: "loaded" })}
					onError={() => setLoadState({ src, status: "error" })}
					className="cms-media-frame-img"
				/>
			) : (
				<span className="cms-media-frame-fallback">
					<MediaLibraryIcon className="cms-media-frame-fallback-icon" />
					{isKnownNonImage && mimeType ? (
						<span className="cms-media-frame-type">{nonImageTypeLabel(mimeType)}</span>
					) : assetId ? (
						<span className="cms-media-frame-unavailable">Preview unavailable</span>
					) : null}
				</span>
			)}

			{chip ? (
				<span className="cms-media-chip" data-status={chip}>
					{chip === "draft" ? (
						<>
							<span aria-hidden="true">Δ</span>
							<span>Draft</span>
						</>
					) : (
						<>
							<CheckIcon aria-hidden="true" className="size-3 stroke-[2.2]" />
							<span>Published</span>
						</>
					)}
				</span>
			) : null}
		</span>
	);
}
