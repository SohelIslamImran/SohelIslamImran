/**
 * Media library page (`/cms/library`, served at `/library` on the CMS host;
 * `/media/:id` stays the public asset delivery route).
 *
 * Shows D1 `media_assets` records, default alt-text editing, where each asset is
 * referenced in the current draft, upload when R2 (`MEDIA`) is bound, and a
 * clear "Storage not connected" state when R2 is not bound.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { useCmsSession } from "../../components/cms/draft/context";
import { controlClass } from "../../components/cms/fields";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	MediaLibraryIcon,
	UploadIcon,
} from "../../components/cms/shell/cms-icons";
import { formatBytes, formatUtcTimestamp } from "../../components/cms/shell/time";
import { uploadMedia } from "../../server/cms.functions";
import { listMedia, updateMediaAlt } from "../../server/cms-history.functions";
import type { MediaLibraryItem } from "../../server/media.server";

export const Route = createFileRoute("/cms/library")({
	head: () => ({
		meta: [{ title: "Media library · Control plane" }],
	}),
	component: LibraryRoute,
});

function AssetCard({
	asset,
	csrfToken,
	onUpdated,
}: {
	asset: MediaLibraryItem;
	csrfToken: string;
	onUpdated: (id: string, alt: string, updatedAt: string) => void;
}) {
	const saveAlt = useServerFn(updateMediaAlt);
	const [alt, setAlt] = useState(asset.alt);
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

	useEffect(() => {
		setAlt(asset.alt);
	}, [asset.alt]);

	const isImage = asset.mimeType?.startsWith("image/") ?? false;
	const dirty = alt.trim() !== asset.alt.trim();

	const handleSaveAlt = async (event: React.FormEvent) => {
		event.preventDefault();
		if (isImage && alt.trim().length === 0) {
			setFeedback({ tone: "error", text: "Image alt text is required." });
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
				setFeedback({ tone: "ok", text: "Saved default alt." });
			} else {
				setFeedback({ tone: "error", text: "Asset no longer exists." });
			}
		} catch {
			setFeedback({ tone: "error", text: "Could not save alt text." });
		} finally {
			setSaving(false);
		}
	};

	return (
		<article className="cms-panel flex flex-col overflow-hidden">
			{/* Preview header */}
			<div className="relative flex aspect-[16/10] items-center justify-center border-b border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)]">
				{isImage && asset.status === "published" ? (
					<img
						src={asset.url}
						alt={asset.alt || asset.id}
						loading="lazy"
						className="h-full w-full object-cover"
					/>
				) : (
					<div className="grid place-items-center gap-1.5 px-4 text-center">
						<MediaLibraryIcon className="size-6 text-muted-foreground" />
						<span className="font-mono text-[11px] text-muted-foreground">
							{asset.mimeType ?? "binary"}
							{isImage && asset.status === "draft" ? " · unpublished" : ""}
						</span>
					</div>
				)}
				<span
					className={cn(
						"absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10.5px] backdrop-blur-sm",
						asset.status === "published"
							? "border-success/40 bg-surface-solid/90 text-success"
							: "border-line-strong bg-surface-solid/90 text-ink-soft",
					)}
				>
					<span aria-hidden="true">{asset.status === "published" ? "✓" : "○"}</span>
					<span>{asset.status === "published" ? "Published" : "Draft"}</span>
				</span>
			</div>

			<div className="flex flex-1 flex-col gap-3.5 p-4">
				{/* Alt editor */}
				<form onSubmit={(event) => void handleSaveAlt(event)} className="grid gap-1.5">
					<label
						htmlFor={`media-alt-${asset.id}`}
						className="flex items-center justify-between text-[12px] font-medium text-foreground"
					>
						<span>Default alt text</span>
						<span className="font-mono text-[10.5px] text-muted-foreground">{alt.length}/240</span>
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
							placeholder="Describe what this asset shows"
							className={cn(
								controlClass,
								"min-h-9 flex-1 py-1.5 text-[13px] pointer-coarse:min-h-11",
							)}
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
							className={cn(
								"m-0 text-[12px]",
								feedback.tone === "ok" ? "text-success" : "text-destructive",
							)}
						>
							{feedback.text}
						</p>
					) : null}
				</form>

				{/* Metadata */}
				<dl className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
					<div>
						<dt className="sr-only">ID</dt>
						<dd className="m-0 text-ink-soft">{asset.id}</dd>
					</div>
					{asset.width && asset.height ? (
						<div>
							<dt className="sr-only">Dimensions</dt>
							<dd className="m-0">
								{asset.width}×{asset.height}
							</dd>
						</div>
					) : null}
					<div>
						<dt className="sr-only">Size</dt>
						<dd className="m-0">{formatBytes(asset.bytes)}</dd>
					</div>
					<div>
						<dt className="sr-only">Created</dt>
						<dd className="m-0">{formatUtcTimestamp(asset.createdAt)}</dd>
					</div>
				</dl>

				{/* Usage list */}
				<div className="mt-auto border-t border-line pt-3">
					<p className="mono-label m-0 mb-1.5 text-[10px] text-muted-foreground">
						Used in draft ({asset.usages.length})
					</p>
					{asset.usages.length === 0 ? (
						<p className="m-0 text-[12.5px] text-muted-foreground">Not referenced in draft.</p>
					) : (
						<ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
							{asset.usages.map((usage) => (
								<li key={usage.path}>
									<Link
										to="/cms/content/$section"
										params={{ section: usage.sectionId }}
										search={usage.itemId ? { item: usage.itemId } : {}}
										className="inline-flex min-h-7 items-center gap-1 rounded-full border border-line bg-surface-raised px-2.5 text-[12px] text-ink-soft no-underline hover:border-primary-line hover:text-primary-text pointer-coarse:min-h-10"
									>
										<span>{usage.label}</span>
										<span aria-hidden="true" className="font-mono text-[10.5px]">
											→
										</span>
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</article>
	);
}

function LibraryRoute() {
	const { csrfToken, mediaEnabled: sessionMediaEnabled } = useCmsSession();
	const fetchMedia = useServerFn(listMedia);
	const runUpload = useServerFn(uploadMedia);

	const [mediaEnabled, setMediaEnabled] = useState(sessionMediaEnabled);
	const [items, setItems] = useState<MediaLibraryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploadAlt, setUploadAlt] = useState("");
	const [uploading, setUploading] = useState(false);
	const [uploadNotice, setUploadNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(
		null,
	);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await fetchMedia();
			setMediaEnabled(result.mediaEnabled);
			setItems(result.items);
		} catch {
			setError("Could not load media records.");
		} finally {
			setLoading(false);
		}
	}, [fetchMedia]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleUpload = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!selectedFile) return;
		setUploading(true);
		setUploadNotice(null);
		try {
			await runUpload({
				data: {
					file: selectedFile,
					alt: uploadAlt.trim(),
					csrfToken,
				},
			});
			setSelectedFile(null);
			setUploadAlt("");
			if (fileInputRef.current) fileInputRef.current.value = "";
			setUploadNotice({ tone: "ok", text: "Uploaded asset to R2 as a draft media record." });
			await load();
		} catch {
			setUploadNotice({
				tone: "error",
				text: "Upload failed. Check file type (JPEG, PNG, WebP, AVIF, PDF), size (≤ 20 MB), and alt text.",
			});
		} finally {
			setUploading(false);
		}
	};

	const handleUpdated = (id: string, alt: string, updatedAt: string) => {
		setItems((prev) => prev.map((item) => (item.id === id ? { ...item, alt, updatedAt } : item)));
	};

	return (
		<div className="grid max-w-[1120px] gap-6">
			<header className="grid gap-1.5">
				<p className="mono-label m-0 text-primary-text">Assets · /library</p>
				<h1 className="m-0 text-headline">Media library</h1>
				<p className="m-0 max-w-[64ch] text-[14px] text-muted-foreground">
					Manage uploaded images and PDFs. Library alt text acts as the default for new attachments;
					individual embeds edit their own alt in the draft.
				</p>
			</header>

			{/* R2 binding status or Upload panel */}
			{!mediaEnabled ? (
				<section
					data-slot="cms-media-disconnected"
					className="cms-panel flex flex-wrap items-start gap-4 border-dashed border-line-strong p-5"
				>
					<span className="grid size-10 shrink-0 place-items-center rounded-[12px] border border-line-strong bg-muted text-muted-foreground">
						<AlertTriangleIcon className="size-4" />
					</span>
					<div className="grid min-w-0 flex-1 gap-1.5">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="m-0 text-[15px] font-semibold text-foreground">
								Storage not connected
							</h2>
							<span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-muted px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground">
								R2 · unbound
							</span>
						</div>
						<p className="m-0 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">
							The <code className="font-mono text-[12px] text-foreground">MEDIA</code> R2 bucket is
							not bound on this Worker, so file uploads are disabled. Bind an R2 bucket named{" "}
							<code className="font-mono text-[12px] text-foreground">MEDIA</code> in{" "}
							<code className="font-mono text-[12px] text-foreground">wrangler.jsonc</code> to
							enable uploads and public delivery at{" "}
							<code className="font-mono text-[12px] text-foreground">/media/:id</code>.
						</p>
					</div>
				</section>
			) : (
				<section className="cms-panel grid gap-4 p-4 sm:p-5">
					<div className="grid gap-1">
						<h2 className="m-0 text-[15px] font-semibold text-foreground">Upload asset</h2>
						<p className="m-0 text-[13px] text-muted-foreground">
							JPEG, PNG, WebP, AVIF, or PDF up to 20 MB. Images require alt text.
						</p>
					</div>
					<form
						onSubmit={(event) => void handleUpload(event)}
						className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
					>
						<div className="grid gap-1.5">
							<label htmlFor="cms-media-file" className="text-[12.5px] font-medium text-foreground">
								File
							</label>
							<input
								id="cms-media-file"
								ref={fileInputRef}
								type="file"
								accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
								onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
								className={cn(controlClass, "min-h-10 py-1.5 text-[13px]")}
							/>
						</div>
						<div className="grid gap-1.5">
							<label htmlFor="cms-media-alt" className="text-[12.5px] font-medium text-foreground">
								Default alt text
							</label>
							<input
								id="cms-media-alt"
								type="text"
								maxLength={240}
								value={uploadAlt}
								onChange={(event) => setUploadAlt(event.target.value)}
								placeholder="Describe the image for screen readers"
								className={cn(controlClass, "min-h-10 py-2 text-[13px]")}
							/>
						</div>
						<Button
							type="submit"
							variant="default"
							size="sm"
							disabled={!selectedFile || uploading}
							className="min-h-10 pointer-coarse:min-h-11"
						>
							<UploadIcon className="size-3.5" />
							<span>{uploading ? "Uploading…" : "Upload"}</span>
						</Button>
					</form>
					{uploadNotice ? (
						<p
							role="status"
							className={cn(
								"m-0 flex items-center gap-2 text-[13px]",
								uploadNotice.tone === "ok" ? "text-success" : "text-destructive",
							)}
						>
							{uploadNotice.tone === "ok" ? (
								<CheckCircleIcon className="size-4 shrink-0" />
							) : (
								<AlertTriangleIcon className="size-4 shrink-0" />
							)}
							<span>{uploadNotice.text}</span>
						</p>
					) : null}
				</section>
			)}

			{/* Asset grid */}
			{error ? (
				<div className="cms-panel p-5 text-[13.5px] text-destructive">{error}</div>
			) : loading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[0, 1, 2].map((slot) => (
						<div key={slot} className="skeleton h-64 rounded-[18px]" />
					))}
				</div>
			) : items.length === 0 ? (
				<div className="cms-panel grid place-items-center gap-2 px-6 py-12 text-center">
					<span className="grid size-10 place-items-center rounded-full border border-line bg-muted text-muted-foreground">
						<MediaLibraryIcon className="size-4" />
					</span>
					<p className="m-0 text-[14.5px] font-medium text-foreground">No media records yet</p>
					<p className="m-0 max-w-[44ch] text-[13px] text-muted-foreground">
						{mediaEnabled
							? "Upload an image or PDF above to start building the media library."
							: "Once R2 storage is connected and assets are uploaded, they will appear here with alt text and draft usage links."}
					</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((asset) => (
						<AssetCard
							key={asset.id}
							asset={asset}
							csrfToken={csrfToken}
							onUpdated={handleUpdated}
						/>
					))}
				</div>
			)}
		</div>
	);
}
