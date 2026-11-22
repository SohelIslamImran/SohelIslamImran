/**
 * Media library page (`/cms/library`, served at `/library` on the CMS host;
 * `/media/:id` stays the public asset delivery route).
 *
 * Shows D1 `media_assets` records in an interactive thumbnail grid with hover
 * lift, selection state, default alt-text editing, draft usage info, drag-and-drop
 * upload when R2 (`MEDIA`) is bound, and a crafted "Storage not connected" state
 * when R2 is unbound.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
	EmptyState,
	PageHeader,
	controlClass as pillControlClass,
	staggerStyle,
} from "../../components/cms/analytics/Widgets";
import { useCmsSession } from "../../components/cms/draft/context";
import { controlClass } from "../../components/cms/fields";
import { REDUCED, SPRING_SNAPPY } from "../../components/cms/motion";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	MediaLibraryIcon,
	UploadIcon,
} from "../../components/cms/shell/cms-icons";
import { formatBytes, formatUtcTimestamp } from "../../components/cms/shell/time";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { uploadMedia } from "../../server/cms.functions";
import { listMedia, updateMediaAlt } from "../../server/cms-history.functions";
import type { MediaLibraryItem } from "../../server/media.server";

export const Route = createFileRoute("/cms/library")({
	head: () => ({
		meta: [{ title: "Media library · Control plane" }],
	}),
	component: LibraryRoute,
});

function StorageDisconnectedCard({ compact = false }: { compact?: boolean }) {
	return (
		<section
			data-slot="cms-media-disconnected"
			style={staggerStyle(0)}
			className="cms-panel cms-enter overflow-hidden"
		>
			<div className="grid gap-5 p-5 sm:p-6">
				<div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 sm:items-start sm:gap-x-4 sm:gap-y-1.5">
					<span
						aria-hidden="true"
						className="grid size-11 shrink-0 place-items-center rounded-[13px] border border-line-strong bg-surface-raised text-foreground shadow-[0_1px_2px_var(--theme-shadow-soft),inset_0_1px_var(--theme-highlight)] sm:row-span-2"
					>
						<svg
							viewBox="0 0 20 20"
							className="size-5 fill-none stroke-current stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]"
						>
							<ellipse cx="10" cy="5.5" rx="6" ry="2.5" />
							<path d="M4 5.5v4.5c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V5.5" />
							<path d="M4 10v4.5c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V10" />
						</svg>
					</span>
					<div className="flex min-w-0 flex-wrap items-center gap-2">
						<h2 className="m-0 text-[16px] font-semibold tracking-[-0.015em] text-foreground">
							Storage not connected
						</h2>
						<span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-muted px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-muted-foreground">
							<span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/60" />
							<span>R2 · Unbound</span>
						</span>
					</div>
					<p className="col-span-full m-0 max-w-[64ch] text-[13.5px] leading-relaxed text-muted-foreground sm:col-span-1">
						The <code className="font-mono text-[12px] text-foreground">MEDIA</code> R2 bucket is
						not bound on this Worker, so drag-and-drop uploads are paused in this environment.
						Public media assets serve from{" "}
						<code className="font-mono text-[12px] text-foreground">/media/:id</code> once
						connected.
					</p>
				</div>

				{!compact ? (
					<div className="grid gap-3 rounded-[13px] border border-line bg-[color-mix(in_srgb,var(--theme-ink)_2%,transparent)] p-4 sm:grid-cols-3">
						<div className="grid gap-1">
							<span className="mono-label text-[10px] text-primary-text">01 · Binding</span>
							<p className="m-0 text-[12.5px] text-muted-foreground">
								Add an R2 binding named{" "}
								<code className="font-mono text-[11.5px] text-foreground">MEDIA</code> in{" "}
								<code className="font-mono text-[11.5px] text-foreground">wrangler.jsonc</code>.
							</p>
						</div>
						<div className="grid gap-1">
							<span className="mono-label text-[10px] text-primary-text">02 · Upload</span>
							<p className="m-0 text-[12.5px] text-muted-foreground">
								Drop JPEG, PNG, WebP, AVIF, or PDF files up to 20 MB with default alt text.
							</p>
						</div>
						<div className="grid gap-1">
							<span className="mono-label text-[10px] text-primary-text">03 · Delivery</span>
							<p className="m-0 text-[12.5px] text-muted-foreground">
								Attach assets inside any section and track draft usage right from this library.
							</p>
						</div>
					</div>
				) : null}
			</div>
		</section>
	);
}

function AssetCard({
	asset,
	csrfToken,
	selected,
	stagger,
	onToggleSelect,
	onUpdated,
}: {
	asset: MediaLibraryItem;
	csrfToken: string;
	selected: boolean;
	stagger: number;
	onToggleSelect: () => void;
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
		<article
			data-selected={selected ? "true" : "false"}
			style={staggerStyle(stagger)}
			className="cms-panel cms-media-card cms-enter flex flex-col overflow-hidden"
		>
			{/* Interactive thumbnail header (click to select) */}
			<div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)]">
				<button
					type="button"
					aria-pressed={selected}
					aria-label={
						selected ? `Deselect ${asset.alt || asset.id}` : `Select ${asset.alt || asset.id}`
					}
					onClick={onToggleSelect}
					className="cms-page-focus flex h-full w-full cursor-pointer items-center justify-center p-0"
				>
					{isImage && asset.status === "published" ? (
						<img
							src={asset.url}
							alt={asset.alt || asset.id}
							loading="lazy"
							className="cms-media-thumb h-full w-full object-cover"
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
				</button>

				{/* Selection check indicator (icon + shape, never hue alone) */}
				<span
					aria-hidden="true"
					className={cn(
						"pointer-events-none absolute top-2.5 left-2.5 grid size-6 place-items-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-150",
						selected
							? "border-primary bg-primary text-primary-foreground shadow-[0_2px_8px_var(--theme-accent-shadow)]"
							: "border-line-strong bg-surface-solid/85 text-transparent backdrop-blur-sm",
					)}
				>
					<svg
						viewBox="0 0 14 14"
						className="size-3.5 fill-none stroke-current stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round]"
					>
						<path d="m3 7.3 2.6 2.6L11 4.2" />
					</svg>
				</span>

				{/* Published / Draft pill */}
				<span
					className={cn(
						"pointer-events-none absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10.5px] backdrop-blur-sm",
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
						<span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
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
							role="status"
							className={cn(
								"m-0 flex items-center gap-1.5 text-[12px]",
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

				{/* Metadata */}
				<dl className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums text-muted-foreground">
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

				{/* Usage info */}
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
										className="cms-press cms-page-focus group/usage inline-flex min-h-7 items-center gap-1 rounded-full border border-line bg-surface-raised px-2.5 text-[12px] text-ink-soft no-underline hover:border-primary-line hover:text-primary-text pointer-coarse:min-h-10"
									>
										<span>{usage.label}</span>
										<span
											aria-hidden="true"
											className="font-mono text-[10.5px] transition-transform duration-150 group-hover/usage:translate-x-0.5"
										>
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
	const reduced = useReducedMotion();
	const { csrfToken, mediaEnabled: sessionMediaEnabled } = useCmsSession();
	const fetchMedia = useServerFn(listMedia);
	const runUpload = useServerFn(uploadMedia);

	const [mediaEnabled, setMediaEnabled] = useState(sessionMediaEnabled);
	const [items, setItems] = useState<MediaLibraryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
	const [copiedUrl, setCopiedUrl] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [dragging, setDragging] = useState(false);
	const [uploadAlt, setUploadAlt] = useState("");
	const [uploading, setUploading] = useState(false);
	const [uploadNotice, setUploadNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(
		null,
	);

	useEffect(() => {
		if (!selectedFile || !selectedFile.type.startsWith("image/")) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(selectedFile);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [selectedFile]);

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

	const acceptFile = (file: File | null) => {
		setSelectedFile(file);
		setUploadNotice(null);
	};

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

	const toggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
		setCopiedUrl(false);
	};

	const selectedItems = items.filter((item) => selectedIds.has(item.id));
	const singleSelected = selectedItems.length === 1 ? selectedItems[0] : null;

	const copySelectedUrl = async () => {
		if (!singleSelected) return;
		try {
			await navigator.clipboard.writeText(singleSelected.url);
			setCopiedUrl(true);
			window.setTimeout(() => setCopiedUrl(false), 1800);
		} catch {
			// Clipboard API unavailable in restricted contexts.
		}
	};

	return (
		<div className="grid min-w-0 max-w-[1160px] grid-cols-1 gap-6">
			<PageHeader
				eyebrow="Assets · /library"
				title="Media library"
				description="Manage uploaded images and PDFs. Library alt text acts as the default for new attachments; individual embeds edit their own alt in the draft."
				actions={
					mediaEnabled ? (
						<span className="inline-flex items-center gap-1.5 rounded-full border border-success/35 bg-success/10 px-3 py-1.5 font-mono text-[11px] font-medium text-success">
							<span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
							<span>
								R2 connected · {items.length} {items.length === 1 ? "asset" : "assets"}
							</span>
						</span>
					) : undefined
				}
			/>

			{/* R2 binding status or Drag-and-drop Upload panel */}
			{!mediaEnabled ? (
				<StorageDisconnectedCard compact={items.length > 0} />
			) : (
				<section style={staggerStyle(0)} className="cms-panel cms-enter grid gap-4 p-4 sm:p-5">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="grid gap-0.5">
							<h2 className="m-0 text-[15px] font-semibold tracking-[-0.012em] text-foreground">
								Upload asset
							</h2>
							<p className="m-0 text-[13px] text-muted-foreground">
								Drag and drop a file or choose from disk. JPEG, PNG, WebP, AVIF, or PDF up to 20 MB.
							</p>
						</div>
					</div>

					<form onSubmit={(event) => void handleUpload(event)} className="grid gap-3.5">
						<div
							data-dragging={dragging ? "true" : "false"}
							onDragEnter={(event) => {
								event.preventDefault();
								setDragging(true);
							}}
							onDragOver={(event) => {
								event.preventDefault();
								setDragging(true);
							}}
							onDragLeave={(event) => {
								if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
									setDragging(false);
								}
							}}
							onDrop={(event) => {
								event.preventDefault();
								setDragging(false);
								const file = event.dataTransfer.files?.[0] ?? null;
								if (file) acceptFile(file);
							}}
							className="cms-dropzone flex flex-wrap items-center justify-between gap-4 p-4"
						>
							<input
								id="cms-media-file"
								ref={fileInputRef}
								type="file"
								accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
								onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
								className="sr-only"
							/>

							{selectedFile ? (
								<div className="flex min-w-0 flex-1 items-center gap-3">
									{previewUrl ? (
										<img
											src={previewUrl}
											alt={selectedFile.name}
											className="size-12 shrink-0 rounded-[9px] border border-line object-cover"
										/>
									) : (
										<span className="grid size-12 shrink-0 place-items-center rounded-[9px] border border-line bg-surface-solid text-muted-foreground">
											<MediaLibraryIcon className="size-5" />
										</span>
									)}
									<div className="min-w-0">
										<p className="m-0 truncate text-[13.5px] font-medium text-foreground">
											{selectedFile.name}
										</p>
										<p className="m-0 font-mono text-[11px] tabular-nums text-muted-foreground">
											{selectedFile.type || "file"} · {formatBytes(selectedFile.size)}
										</p>
									</div>
								</div>
							) : (
								<div className="flex min-w-0 flex-1 items-center gap-3">
									<span
										aria-hidden="true"
										className="grid size-10 shrink-0 place-items-center rounded-[11px] border border-line-strong bg-surface-solid text-primary-text shadow-[0_1px_2px_var(--theme-shadow-soft)]"
									>
										<UploadIcon className="size-4" />
									</span>
									<div className="min-w-0">
										<p className="m-0 text-[13.5px] font-medium text-foreground">
											{dragging ? "Drop file to attach" : "Drop an image or PDF here"}
										</p>
										<p className="m-0 text-[12px] text-muted-foreground">
											Or browse your device · max 20 MB
										</p>
									</div>
								</div>
							)}

							<div className="flex items-center gap-2">
								{selectedFile ? (
									<button
										type="button"
										onClick={() => {
											acceptFile(null);
											if (fileInputRef.current) fileInputRef.current.value = "";
										}}
										className={pillControlClass}
									>
										Clear
									</button>
								) : null}
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className={pillControlClass}
								>
									<span>{selectedFile ? "Replace file" : "Choose file"}</span>
								</button>
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
							<div className="grid gap-1.5">
								<label
									htmlFor="cms-media-alt"
									className="flex items-center justify-between text-[12.5px] font-medium text-foreground"
								>
									<span>Default alt text</span>
									<span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
										{uploadAlt.length}/240
									</span>
								</label>
								<input
									id="cms-media-alt"
									type="text"
									maxLength={240}
									value={uploadAlt}
									onChange={(event) => setUploadAlt(event.target.value)}
									placeholder="Describe the image for screen readers"
									className={cn(controlClass, "min-h-10 py-2 text-[13px] pointer-coarse:min-h-11")}
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
								<span>{uploading ? "Uploading…" : "Upload asset"}</span>
							</Button>
						</div>
					</form>

					{uploadNotice ? (
						<p
							role="status"
							className={cn(
								"cms-enter m-0 flex items-center gap-2 text-[13px]",
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

			{/* Selection action bar */}
			<AnimatePresence>
				{selectedItems.length > 0 ? (
					<motion.div
						initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						transition={reduced ? REDUCED : SPRING_SNAPPY}
						className="cms-panel flex flex-wrap items-center justify-between gap-3 border-primary-line bg-primary-soft/45 px-4 py-2.5"
					>
						<span className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground">
							<span className="grid size-5 place-items-center rounded-full bg-primary font-mono text-[11px] font-semibold tabular-nums text-primary-foreground">
								{selectedItems.length}
							</span>
							<span>{selectedItems.length === 1 ? "asset selected" : "assets selected"}</span>
						</span>
						<div className="flex flex-wrap items-center gap-2">
							{singleSelected ? (
								<button
									type="button"
									onClick={() => void copySelectedUrl()}
									className={pillControlClass}
								>
									<span>{copiedUrl ? "Copied URL" : "Copy asset URL"}</span>
								</button>
							) : null}
							<button
								type="button"
								onClick={() => setSelectedIds(new Set())}
								className={pillControlClass}
							>
								Clear selection
							</button>
						</div>
					</motion.div>
				) : null}
			</AnimatePresence>

			{/* Asset grid */}
			{error ? (
				<section className="cms-panel">
					<EmptyState
						icon={<AlertTriangleIcon className="size-4 text-destructive" />}
						title="Could not load media library"
						description={error}
						action={
							<button type="button" className={pillControlClass} onClick={() => void load()}>
								Try again
							</button>
						}
					/>
				</section>
			) : loading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[0, 1, 2].map((slot) => (
						<div key={slot} className="cms-panel overflow-hidden">
							<div className="cms-skeleton aspect-[16/10] w-full rounded-none" />
							<div className="grid gap-3 p-4">
								<div className="cms-skeleton h-9 w-full" />
								<div className="cms-skeleton h-3.5 w-3/4" />
								<div className="cms-skeleton h-6 w-1/2" />
							</div>
						</div>
					))}
				</div>
			) : items.length === 0 ? (
				<section style={staggerStyle(1)} className="cms-panel cms-enter grid gap-5 p-5 sm:p-6">
					{/* Subtle architectural preview slots so the empty library feels designed, not hollow */}
					<div aria-hidden="true" className="grid gap-3 sm:grid-cols-3">
						{[0, 1, 2].map((slot) => (
							<div
								key={slot}
								className="grid gap-2 rounded-[13px] border border-dashed border-line bg-[color-mix(in_srgb,var(--theme-ink)_1.8%,transparent)] p-3"
							>
								<div className="grid h-24 place-items-center rounded-[8px] border border-line/70 bg-surface-solid/60 text-muted-foreground/45">
									<MediaLibraryIcon className="size-5" />
								</div>
								<div className="grid gap-1.5">
									<span className="h-2 w-2/3 rounded-full bg-line" />
									<span className="h-2 w-2/5 rounded-full bg-line/70" />
								</div>
							</div>
						))}
					</div>
					<EmptyState
						icon={<MediaLibraryIcon className="size-5" />}
						title="No media records yet"
						description={
							mediaEnabled
								? "Drop an image or PDF in the upload zone above to build your media library."
								: "Once R2 storage is connected and assets are uploaded, thumbnails, alt text controls, and draft usage links will appear in this grid."
						}
						className="py-3"
					/>
				</section>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((asset, idx) => (
						<AssetCard
							key={asset.id}
							asset={asset}
							csrfToken={csrfToken}
							selected={selectedIds.has(asset.id)}
							stagger={Math.min(idx, 8)}
							onToggleSelect={() => toggleSelect(asset.id)}
							onUpdated={handleUpdated}
						/>
					))}
				</div>
			)}
		</div>
	);
}
