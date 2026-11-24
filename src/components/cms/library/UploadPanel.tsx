/**
 * Media upload panel: a drag-and-drop zone, default alt text, and Upload.
 * Shown only when the `MEDIA` R2 bucket is bound.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkUploadFile, mediaTypeShortLabel } from "../../../lib/media-policy";
import { cn } from "../../../lib/utils";
import { uploadMedia } from "../../../server/cms.functions";
import { controlClass as pillControlClass } from "../analytics/Widgets";
import { useCsrfRetry } from "../draft/context";
import { InputShell, inputClass, proseAttributes } from "../fields/InputShell";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	MediaLibraryIcon,
	UploadIcon,
} from "../shell/cms-icons";
import { formatBytes } from "../shell/time";
import { Button } from "../../ui/button";

function DropzoneUploadIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 20 20"
			aria-hidden="true"
			className={cn(
				"size-4 shrink-0 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]",
				className,
			)}
		>
			<g className="cms-dropzone-arrow">
				<path d="M10 12.75V4.5M6.75 7.75 10 4.5l3.25 3.25" />
			</g>
			<path d="M4 13.5v1.25A1.25 1.25 0 0 0 5.25 16h9.5A1.25 1.25 0 0 0 16 14.75V13.5" />
		</svg>
	);
}

export function UploadPanel({
	id,
	empty = false,
	onUploaded,
	onClose,
	onBusyChange,
}: {
	id?: string;
	empty?: boolean;
	onUploaded: () => Promise<void> | void;
	onClose?: () => void;
	onBusyChange?: (busy: boolean) => void;
}) {
	const runUpload = useServerFn(uploadMedia);
	const mutate = useCsrfRetry();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const chooseButtonRef = useRef<HTMLButtonElement>(null);
	const fileErrorId = useId();
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [stagedKey, setStagedKey] = useState(0);
	// Tied to the File that produced it, so a replaced file never shows the old image.
	const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
	const [dragging, setDragging] = useState(false);
	const [uploadAlt, setUploadAlt] = useState("");
	const [uploading, setUploading] = useState(false);
	const [fileError, setFileError] = useState<string | null>(null);
	const [uploadNotice, setUploadNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(
		null,
	);

	useEffect(() => {
		setPreview(null);
		if (!selectedFile || !selectedFile.type.startsWith("image/")) return;
		// Decode once and draw a small thumbnail: a full-size data URL of a 20 MB
		// photo is tens of millions of characters and stalls the main thread.
		let active = true;
		void (async () => {
			try {
				const bitmap = await createImageBitmap(selectedFile);
				const scale = Math.min(1, 96 / Math.max(bitmap.width, bitmap.height));
				const canvas = document.createElement("canvas");
				canvas.width = Math.max(1, Math.round(bitmap.width * scale));
				canvas.height = Math.max(1, Math.round(bitmap.height * scale));
				canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
				bitmap.close();
				// Site CSP allows `data:` images (not `blob:`); this string is a few KB.
				if (active) setPreview({ file: selectedFile, url: canvas.toDataURL("image/png") });
			} catch {
				// Unsupported codec or out of memory: the type icon stays.
			}
		})();
		return () => {
			active = false;
		};
	}, [selectedFile]);

	const previewUrl = preview && preview.file === selectedFile ? preview.url : null;
	const isImage = selectedFile?.type.startsWith("image/") ?? false;
	const altMissing = isImage && uploadAlt.trim() === "";

	const clearFile = () => {
		setSelectedFile(null);
		setFileError(null);
		setUploadNotice(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const acceptFile = (file: File) => {
		if (uploading) return;
		const check = checkUploadFile(file);
		if (!check.ok) {
			setSelectedFile(null);
			setFileError(check.message);
			setUploadNotice(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
			return;
		}
		setFileError(null);
		setUploadNotice(null);
		setSelectedFile(file);
		setStagedKey((n) => n + 1);
	};

	const postUpload = async (file: File, altText: string, token: string) => {
		const form = new FormData();
		form.set("file", file);
		form.set("alt", altText);
		form.set("csrfToken", token);
		await runUpload({ data: form });
	};

	const handleUpload = async (event: FormEvent) => {
		event.preventDefault();
		if (!selectedFile || altMissing || uploading) return;
		setUploading(true);
		onBusyChange?.(true);
		setUploadNotice(null);
		const altText = uploadAlt.trim();
		try {
			await mutate((csrfToken) => postUpload(selectedFile, altText, csrfToken));
			setSelectedFile(null);
			setUploadAlt("");
			setFileError(null);
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
			onBusyChange?.(false);
		}
	};

	return (
		<section
			id={id}
			onKeyDown={(event) => {
				if (event.key !== "Escape" || !onClose || uploading) return;
				event.preventDefault();
				event.stopPropagation();
				onClose();
			}}
			className="cms-panel grid gap-4 p-4 sm:p-5"
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="grid gap-0.5">
					<h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em] text-foreground">
						Add media
					</h2>
					<p className="m-0 text-[13px] text-muted-foreground">
						{empty
							? "Your library is empty. Add the first image or PDF."
							: "JPEG, PNG, WebP, AVIF, or PDF, up to 20 MB."}
					</p>
				</div>
				{onClose ? (
					<button
						type="button"
						disabled={uploading}
						onClick={() => {
							if (!uploading) onClose();
						}}
						className={cn(pillControlClass, "disabled:pointer-events-none disabled:opacity-45")}
					>
						Done
					</button>
				) : null}
			</div>

			<form onSubmit={(event) => void handleUpload(event)} className="grid gap-3.5">
				<div className="grid gap-2">
					<div
						data-dragging={dragging ? "true" : "false"}
						onDragEnter={(event) => {
							event.preventDefault();
							if (!uploading) setDragging(true);
						}}
						onDragOver={(event) => {
							event.preventDefault();
							if (!uploading) setDragging(true);
						}}
						onDragLeave={(event) => {
							if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
								setDragging(false);
							}
						}}
						onDrop={(event) => {
							event.preventDefault();
							setDragging(false);
							if (uploading) return;
							const file = event.dataTransfer.files?.[0] ?? null;
							if (file) acceptFile(file);
						}}
						className="cms-dropzone flex flex-wrap items-center justify-between gap-4 p-4"
					>
						<input
							id="cms-media-file"
							ref={fileInputRef}
							type="file"
							tabIndex={-1}
							aria-hidden="true"
							disabled={uploading}
							accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) acceptFile(file);
							}}
							className="sr-only"
						/>

						{selectedFile ? (
							<div
								key={stagedKey}
								className="cms-staged-file flex min-w-0 flex-[1_1_14rem] items-center gap-3"
							>
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
								<p className="m-0 flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[13px] text-muted-foreground">
									<span className="max-w-full truncate font-medium text-foreground">
										{selectedFile.name}
									</span>{" "}
									<span className="font-mono text-[11.5px] tabular-nums">
										· {mediaTypeShortLabel(selectedFile.type)} · {formatBytes(selectedFile.size)}{" "}
										(max 20 MB)
									</span>
								</p>
							</div>
						) : (
							<div className="flex min-w-0 flex-[1_1_14rem] items-center gap-3">
								<span
									aria-hidden="true"
									className="grid size-10 shrink-0 place-items-center rounded-[12px] border border-line-strong bg-surface-solid text-primary-text shadow-[0_1px_2px_var(--theme-shadow-soft)]"
								>
									<DropzoneUploadIcon />
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
									disabled={uploading}
									onClick={clearFile}
									className={cn(
										pillControlClass,
										"disabled:pointer-events-none disabled:opacity-45",
									)}
								>
									Clear
								</button>
							) : null}
							<button
								ref={chooseButtonRef}
								type="button"
								disabled={uploading}
								aria-describedby={fileError ? fileErrorId : undefined}
								onClick={() => fileInputRef.current?.click()}
								className={cn(pillControlClass, "disabled:pointer-events-none disabled:opacity-45")}
							>
								<span>{selectedFile ? "Replace file" : "Choose file"}</span>
							</button>
						</div>
					</div>

					{fileError ? (
						<p
							id={fileErrorId}
							role="alert"
							className="cms-enter m-0 flex items-center gap-2 text-[13px] text-destructive"
						>
							<AlertTriangleIcon className="size-4 shrink-0" />
							<span>{fileError}</span>
						</p>
					) : null}
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
						<InputShell disabled={uploading}>
							<input
								{...proseAttributes}
								id="cms-media-alt"
								type="text"
								maxLength={240}
								value={uploadAlt}
								required={isImage}
								disabled={uploading}
								onChange={(event) => setUploadAlt(event.target.value)}
								placeholder="Describe the image for screen readers"
								className={inputClass}
							/>
						</InputShell>
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
					role={uploadNotice.tone === "error" ? "alert" : "status"}
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
