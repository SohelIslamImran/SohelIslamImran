/**
 * Media upload panel: a drag-and-drop zone, default alt text, and Upload.
 * Shown only when the `MEDIA` R2 bucket is bound.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "../../../lib/utils";
import { uploadMedia } from "../../../server/cms.functions";
import { controlClass as pillControlClass, staggerStyle } from "../analytics/Widgets";
import { controlClass } from "../fields";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	MediaLibraryIcon,
	UploadIcon,
} from "../shell/cms-icons";
import { formatBytes } from "../shell/time";
import { Button } from "../../ui/button";

export function UploadPanel({
	id,
	csrfToken,
	onUploaded,
	onClose,
}: {
	id?: string;
	csrfToken: string;
	onUploaded: () => Promise<void> | void;
	onClose?: () => void;
}) {
	const runUpload = useServerFn(uploadMedia);
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

	const isImage = selectedFile?.type.startsWith("image/") ?? false;
	const altMissing = isImage && uploadAlt.trim() === "";

	const acceptFile = (file: File | null) => {
		setSelectedFile(file);
		setUploadNotice(null);
	};

	const handleUpload = async (event: FormEvent) => {
		event.preventDefault();
		if (!selectedFile || altMissing) return;
		setUploading(true);
		setUploadNotice(null);
		try {
			const form = new FormData();
			form.set("file", selectedFile);
			form.set("alt", uploadAlt.trim());
			form.set("csrfToken", csrfToken);
			await runUpload({ data: form });
			setSelectedFile(null);
			setUploadAlt("");
			if (fileInputRef.current) fileInputRef.current.value = "";
			setUploadNotice({ tone: "ok", text: "Uploaded. It’s saved as a draft asset." });
			await onUploaded();
		} catch {
			setUploadNotice({
				tone: "error",
				text: "Upload failed. Use JPEG, PNG, WebP, AVIF, or PDF up to 20 MB, with alt text for images.",
			});
		} finally {
			setUploading(false);
		}
	};

	return (
		<section id={id} style={staggerStyle(0)} className="cms-panel cms-enter grid gap-4 p-4 sm:p-5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="grid gap-0.5">
					<h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em] text-foreground">
						Add media
					</h2>
					<p className="m-0 text-[13px] text-muted-foreground">
						JPEG, PNG, WebP, AVIF, or PDF, up to 20 MB.
					</p>
				</div>
				{onClose ? (
					<button type="button" onClick={onClose} className={pillControlClass}>
						Done
					</button>
				) : null}
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
									className="size-12 shrink-0 rounded-[10px] border border-line object-cover"
								/>
							) : (
								<span className="grid size-12 shrink-0 place-items-center rounded-[10px] border border-line bg-surface-solid text-muted-foreground">
									<MediaLibraryIcon className="size-5" />
								</span>
							)}
							<div className="min-w-0">
								<p className="m-0 truncate text-[13.5px] font-medium text-foreground">
									{selectedFile.name}
								</p>
								<p className="m-0 font-mono text-[11.5px] tabular-nums text-muted-foreground">
									{selectedFile.type || "file"} · {formatBytes(selectedFile.size)}
								</p>
							</div>
						</div>
					) : (
						<div className="flex min-w-0 flex-1 items-center gap-3">
							<span
								aria-hidden="true"
								className="grid size-10 shrink-0 place-items-center rounded-[12px] border border-line-strong bg-surface-solid text-primary-text shadow-[0_1px_2px_var(--theme-shadow-soft)]"
							>
								<UploadIcon className="size-4" />
							</span>
							<div className="min-w-0">
								<p className="m-0 text-[13.5px] font-medium text-foreground">
									{dragging ? "Drop file to attach" : "Drop an image or PDF here"}
								</p>
								<p className="m-0 text-[12px] text-muted-foreground">
									or choose one from your device
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
							<span>
								Alt text
								{isImage ? (
									<span className="font-normal text-muted-foreground"> (required for images)</span>
								) : null}
							</span>
							<span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
								{uploadAlt.length}/240
							</span>
						</label>
						<input
							id="cms-media-alt"
							type="text"
							maxLength={240}
							value={uploadAlt}
							required={isImage}
							onChange={(event) => setUploadAlt(event.target.value)}
							placeholder="Describe the image for screen readers"
							className={cn(controlClass, "min-h-10 py-2 text-[13px] pointer-coarse:min-h-11")}
						/>
					</div>
					<Button
						type="submit"
						variant="default"
						size="sm"
						disabled={!selectedFile || altMissing || uploading}
						className="min-h-10 pointer-coarse:min-h-11"
					>
						<UploadIcon className="size-3.5" />
						<span>{uploading ? "Uploading…" : "Upload"}</span>
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
	);
}
