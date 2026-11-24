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
import { CheckIcon } from "../fields/field-icons";
import { AlertTriangleIcon, CheckCircleIcon, ExternalArrowIcon } from "../shell/cms-icons";
import { formatBytes, formatUtcTimestamp } from "../shell/time";
import { Button } from "../../ui/button";
import { MediaFrame } from "./MediaFrame";
import { isForbiddenError, useCsrfRetry } from "./UploadPanel";

function useCopied(durationMs = 1600) {
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
	const { tokenRef, refreshToken } = useCsrfRetry(csrfToken);
	const [alt, setAlt] = useState(asset.alt);
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
	const [copyFailed, setCopyFailed] = useState(false);
	const [copied, flashCopied] = useCopied();
	const savedTimer = useRef<number | undefined>(undefined);

	useEffect(() => () => window.clearTimeout(savedTimer.current), []);

	useEffect(() => {
		setAlt(asset.alt);
	}, [asset.alt]);

	const isImage = asset.mimeType?.startsWith("image/") ?? false;
	const isPublished = asset.status === "published";
	const dirty = alt.trim() !== asset.alt.trim();
	const name = asset.alt || "this asset";
	const publicUrl = new URL(asset.url, publicOrigin).href;
	const altId = `media-alt-${asset.id}`;
	const feedbackId = `${altId}-feedback`;
	const altInvalid = feedback?.tone === "error";

	const handleSaveAlt = async (event: FormEvent) => {
		event.preventDefault();
		window.clearTimeout(savedTimer.current);
		if (isImage && alt.trim().length === 0) {
			setFeedback({ tone: "error", text: "Images need alt text." });
			return;
		}
		setSaving(true);
		setFeedback(null);
		const trimmed = alt.trim();
		try {
			let result: Awaited<ReturnType<typeof saveAlt>>;
			try {
				result = await saveAlt({
					data: { id: asset.id, alt: trimmed, csrfToken: tokenRef.current },
				});
			} catch (error) {
				if (!isForbiddenError(error)) throw error;
				const nextToken = await refreshToken();
				if (!nextToken) throw error;
				result = await saveAlt({
					data: { id: asset.id, alt: trimmed, csrfToken: nextToken },
				});
			}
			if (result.ok) {
				onUpdated(result.id, result.alt, result.updatedAt);
				setFeedback({ tone: "ok", text: "Saved" });
				savedTimer.current = window.setTimeout(() => setFeedback(null), 2000);
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
			setCopyFailed(false);
			flashCopied();
		} catch {
			// Clipboard access can be blocked; say so and leave a way to get the link.
			setCopyFailed(true);
		}
	};

	const thumbnail = (
		<MediaFrame
			assetId={asset.id}
			mimeType={asset.mimeType}
			width={asset.width}
			height={asset.height}
			chip={asset.status}
			className="cms-media-thumb h-full w-full"
		/>
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
							className="absolute right-2.5 bottom-2.5 z-10 grid size-7 place-items-center rounded-full border border-line-strong bg-surface-solid text-ink-soft opacity-0 shadow-[0_1px_3px_var(--theme-shadow-soft)] transition-opacity duration-150 group-hover/thumb:opacity-100 group-focus-visible/thumb:opacity-100"
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
						htmlFor={altId}
						className="flex items-center justify-between text-[12.5px] font-medium text-foreground"
					>
						<span>Default alt text</span>
						<span className="font-mono text-[11px] tabular-nums text-muted-foreground">
							{alt.length}/240
						</span>
					</label>
					<div className="flex items-center gap-2">
						<input
							id={altId}
							type="text"
							maxLength={240}
							value={alt}
							aria-invalid={altInvalid || undefined}
							aria-describedby={altInvalid ? feedbackId : undefined}
							onChange={(event) => {
								setAlt(event.target.value);
								window.clearTimeout(savedTimer.current);
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
							id={feedbackId}
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

				<div className="flex min-h-8 flex-wrap items-center justify-between gap-2 pointer-coarse:min-h-11">
					<p className="m-0 font-mono text-[11.5px] tabular-nums text-muted-foreground">
						{asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
						{formatBytes(asset.bytes)}
						<span className="sr-only"> · uploaded {formatUtcTimestamp(asset.createdAt)}</span>
					</p>
					{isPublished ? (
						<button
							type="button"
							onClick={() => void copyUrl()}
							className="cms-press cms-page-focus inline-flex min-h-8 min-w-[5.75rem] items-center justify-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-primary-text hover:bg-primary-soft pointer-coarse:min-h-11"
						>
							{copied ? <CheckIcon className="cms-copy-check size-3.5 stroke-[2.2]" /> : null}
							<span aria-live="polite">{copied ? "Copied" : "Copy URL"}</span>
						</button>
					) : null}
				</div>

				{copyFailed ? (
					<p role="status" className="m-0 text-[12.5px] text-destructive">
						Couldn’t copy the link. Open the file and copy the address from your browser.
					</p>
				) : null}

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
