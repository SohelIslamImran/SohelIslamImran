/**
 * One media library asset: a thumbnail that opens the published file, a Copy
 * URL action, the default alt text editor, file facts, and where the draft
 * uses it.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "../../../lib/utils";
import { updateMediaAlt } from "../../../server/cms-history.functions";
import type { MediaLibraryItem } from "../../../server/media.server";
import { staggerStyle } from "../analytics/Widgets";
import { controlClass } from "../fields/FieldFrame";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	ExternalArrowIcon,
	MediaLibraryIcon,
} from "../shell/cms-icons";
import { formatBytes, formatUtcTimestamp } from "../shell/time";
import { Button } from "../../ui/button";

function useCopied(durationMs = 1800) {
	const [copied, setCopied] = useState(false);
	const timer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(timer.current), []);
	const flash = () => {
		setCopied(true);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setCopied(false), durationMs);
	};
	return [copied, flash] as const;
}

export function AssetCard({
	asset,
	csrfToken,
	publicOrigin,
	stagger,
	onUpdated,
}: {
	asset: MediaLibraryItem;
	csrfToken: string;
	publicOrigin: string;
	stagger: number;
	onUpdated: (id: string, alt: string, updatedAt: string) => void;
}) {
	const saveAlt = useServerFn(updateMediaAlt);
	const [alt, setAlt] = useState(asset.alt);
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	const [copied, flashCopied] = useCopied();

	useEffect(() => {
		setAlt(asset.alt);
	}, [asset.alt]);

	const isImage = asset.mimeType?.startsWith("image/") ?? false;
	const isPublished = asset.status === "published";
	const dirty = alt.trim() !== asset.alt.trim();
	const name = asset.alt || "this asset";
	const publicUrl = new URL(asset.url, publicOrigin).href;

	const handleSaveAlt = async (event: FormEvent) => {
		event.preventDefault();
		if (isImage && alt.trim().length === 0) {
			setFeedback({ tone: "error", text: "Images need alt text." });
			return;
		}
		setSaving(true);
		setFeedback(null);
		try {
			const result = await saveAlt({
				data: { id: asset.id, alt: alt.trim(), csrfToken },
			});
			if (result.ok) {
				onUpdated(result.id, result.alt, result.updatedAt);
				setFeedback({ tone: "ok", text: "Saved." });
			} else {
				setFeedback({ tone: "error", text: "This asset no longer exists." });
			}
		} catch {
			setFeedback({ tone: "error", text: "Could not save alt text." });
		} finally {
			setSaving(false);
		}
	};

	const copyUrl = async () => {
		try {
			await navigator.clipboard.writeText(publicUrl);
			flashCopied();
		} catch {
			// Clipboard access can be blocked; say so and leave a way to get the link.
			setFeedback({
				tone: "error",
				text: "Couldn’t copy the link. Open the file and copy the address from your browser.",
			});
		}
	};

	const thumbnail =
		isImage && isPublished && failedUrl !== publicUrl ? (
			<img
				src={publicUrl}
				alt=""
				loading="lazy"
				onError={() => setFailedUrl(publicUrl)}
				className="cms-media-thumb h-full w-full object-cover"
			/>
		) : (
			<span className="grid place-items-center gap-1.5 px-4 text-center">
				<MediaLibraryIcon className="size-6 text-muted-foreground" />
				<span className="text-[12px] text-muted-foreground">
					{!isPublished
						? "Not published yet"
						: isImage
							? "Preview unavailable"
							: (asset.mimeType ?? "File")}
				</span>
			</span>
		);

	return (
		<article
			style={staggerStyle(stagger)}
			className="cms-panel cms-enter flex flex-col overflow-hidden"
		>
			<div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)]">
				{isPublished ? (
					<a
						href={publicUrl}
						target="_blank"
						rel="noreferrer"
						aria-label={`Open ${name} in a new tab`}
						className="cms-inset-focus group/thumb flex h-full w-full items-center justify-center"
					>
						{thumbnail}
						<span
							aria-hidden="true"
							className="absolute right-2.5 bottom-2.5 grid size-7 place-items-center rounded-full border border-line-strong bg-surface-solid/90 text-ink-soft opacity-0 shadow-[0_1px_3px_var(--theme-shadow-soft)] backdrop-blur-sm transition-opacity duration-150 group-hover/thumb:opacity-100 group-focus-visible/thumb:opacity-100"
						>
							<ExternalArrowIcon className="size-3.5" />
						</span>
					</a>
				) : (
					<div className="flex h-full w-full items-center justify-center">{thumbnail}</div>
				)}
			</div>

			<div className="flex flex-1 flex-col gap-3.5 p-4">
				<form onSubmit={(event) => void handleSaveAlt(event)} className="grid gap-1.5">
					<label
						htmlFor={`media-alt-${asset.id}`}
						className="flex items-center justify-between text-[12.5px] font-medium text-foreground"
					>
						<span>Default alt text</span>
						<span className="font-mono text-[11px] tabular-nums text-muted-foreground">
							{alt.length}/240
						</span>
					</label>
					<div className="flex items-center gap-2">
						<input
							id={`media-alt-${asset.id}`}
							type="text"
							maxLength={240}
							value={alt}
							onChange={(event) => {
								setAlt(event.target.value);
								if (feedback) setFeedback(null);
							}}
							placeholder="Describe what this shows"
							className={cn(controlClass, "min-h-9 flex-1 py-1.5 text-[13px]")}
						/>
						<Button
							type="submit"
							variant="outline"
							size="sm"
							disabled={!dirty || saving}
							className="shrink-0 pointer-coarse:min-h-11"
						>
							{saving ? "Saving…" : "Save"}
						</Button>
					</div>
					{feedback ? (
						<p
							role="status"
							className={cn(
								"m-0 flex items-center gap-1.5 text-[12.5px]",
								feedback.tone === "ok" ? "text-success" : "text-destructive",
							)}
						>
							{feedback.tone === "ok" ? (
								<CheckCircleIcon className="size-3.5 shrink-0" />
							) : (
								<AlertTriangleIcon className="size-3.5 shrink-0" />
							)}
							<span>{feedback.text}</span>
						</p>
					) : null}
				</form>

				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="m-0 font-mono text-[11.5px] tabular-nums text-muted-foreground">
						{asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
						{formatBytes(asset.bytes)}
						<span className="sr-only"> · uploaded {formatUtcTimestamp(asset.createdAt)}</span>
					</p>
					{isPublished ? (
						<button
							type="button"
							onClick={() => void copyUrl()}
							className="cms-press cms-page-focus inline-flex min-h-8 items-center rounded-full px-2.5 text-[12.5px] font-medium text-primary-text hover:bg-primary-soft pointer-coarse:min-h-11"
						>
							<span aria-live="polite">{copied ? "Copied" : "Copy URL"}</span>
						</button>
					) : null}
				</div>

				<div className="mt-auto grid gap-1.5 border-t border-line pt-3">
					<p className="m-0 text-[12.5px] font-medium text-muted-foreground">
						{asset.usages.length === 0
							? "Not used in the draft"
							: `Used in ${asset.usages.length} ${asset.usages.length === 1 ? "place" : "places"}`}
					</p>
					{asset.usages.length > 0 ? (
						<ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
							{asset.usages.map((usage) => (
								<li key={usage.path}>
									<Link
										to="/cms/content/$section"
										params={{ section: usage.sectionId }}
										search={usage.itemId ? { item: usage.itemId } : {}}
										className="cms-press cms-page-focus group/usage inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-surface-raised px-2.5 text-[12.5px] text-ink-soft no-underline hover:border-primary-line hover:text-primary-text pointer-coarse:min-h-11"
									>
										<span>{usage.label}</span>
										<span
											aria-hidden="true"
											className="text-[11px] transition-[translate] duration-150 group-hover/usage:translate-x-0.5 motion-reduce:group-hover/usage:translate-x-0"
										>
											→
										</span>
									</Link>
								</li>
							))}
						</ul>
					) : null}
				</div>
			</div>
		</article>
	);
}
