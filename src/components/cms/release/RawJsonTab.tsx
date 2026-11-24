/**
 * Raw JSON inspection, export, and validated file import with diff preview.
 */
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
	MAX_CONTENT_BYTES,
	upgradeStoredContent,
	validatePortfolioContent,
	type ValidationIssue,
} from "../../../lib/validation";
import { cn } from "../../../lib/utils";
import { CONTENT_SCHEMA_VERSION, type PortfolioContent } from "../../../types/content";
import { CopyButton } from "../../motion/CopyButton";
import { Button } from "../../ui/button";
import { staggerStyle } from "../analytics/Widgets";
import { useDraftSelector, useDraftStore } from "../draft/context";
import { AlertTriangleIcon, CheckCircleIcon, DownloadIcon, UploadIcon } from "../shell/cms-icons";
import { formatBytes } from "../shell/time";
import { diffPortfolioDocuments } from "./diff";
import { DiffView } from "./DiffView";
import { checkImportFile, compactByteLength, exportFileName } from "./raw-json";

type ImportState =
	| { kind: "idle" }
	| { kind: "error"; message: string; issues?: ValidationIssue[] }
	| {
			kind: "preview";
			fileName: string;
			content: PortfolioContent;
			reviewedDraft: PortfolioContent;
			problem?: "failed" | "conflict" | "stale";
	  }
	| { kind: "applied"; fileName: string; revision: number };

export function RawJsonTab() {
	const store = useDraftStore();
	const draft = useDraftSelector((state) => state.draft);
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const dirty = useDraftSelector((state) => state.dirty);
	const conflict = useDraftSelector((state) => state.conflict !== null);
	const draftLabel = `Draft r${draftRevision}${dirty ? " + unsaved edits" : ""}`;
	const busy = useDraftSelector(
		(state) => state.status === "saving" || state.status === "publishing",
	);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const pickerRef = useRef<HTMLButtonElement>(null);
	const resultRef = useRef<HTMLElement>(null);
	const focusResult = useRef(false);
	const resultId = useId();
	const fileRequest = useRef(0);
	const [importState, setImportState] = useState<ImportState>({ kind: "idle" });
	const [applying, setApplying] = useState(false);

	const { formatted, exportBytes, savedBytes } = useMemo(() => {
		const text = `${JSON.stringify(draft, null, 2)}\n`;
		return {
			formatted: text,
			exportBytes: new TextEncoder().encode(text).byteLength,
			savedBytes: compactByteLength(draft),
		};
	}, [draft]);

	const importDiff = useMemo(() => {
		if (importState.kind !== "preview") return null;
		return diffPortfolioDocuments(importState.reviewedDraft, importState.content);
	}, [importState]);

	const usage = savedBytes / MAX_CONTENT_BYTES;
	const preview = importState.kind === "preview" ? importState : null;
	const stale =
		preview !== null && (preview.reviewedDraft !== draft || preview.problem === "stale");

	useLayoutEffect(() => {
		if (!focusResult.current) return;
		focusResult.current = false;
		resultRef.current?.focus({ preventScroll: true });
	}, [importState]);

	const exportDraft = () => {
		const blob = new Blob([formatted], { type: "application/json;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = exportFileName(draftRevision, dirty);
		anchor.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 1000);
	};

	const onSelectFile = async (file: File | undefined) => {
		if (!file) return;
		const request = ++fileRequest.current;
		const fileError = checkImportFile(file.size);
		if (fileError) {
			setImportState({ kind: "error", message: fileError });
			return;
		}
		try {
			const text = await file.text();
			if (request !== fileRequest.current) return;
			let candidate: unknown;
			try {
				candidate = JSON.parse(text);
			} catch {
				setImportState({ kind: "error", message: "The selected file is not valid JSON." });
				return;
			}

			if (
				candidate &&
				typeof candidate === "object" &&
				"schemaVersion" in candidate &&
				candidate.schemaVersion !== CONTENT_SCHEMA_VERSION
			) {
				try {
					candidate = upgradeStoredContent(candidate);
				} catch {
					// Validation below provides structured issues.
				}
			}

			const validation = validatePortfolioContent(candidate);
			if (!validation.ok) {
				setImportState({
					kind: "error",
					message: "Validation failed.",
					issues: validation.issues.slice(0, 20),
				});
				return;
			}
			const bytes = compactByteLength(validation.value);
			if (bytes > MAX_CONTENT_BYTES) {
				setImportState({
					kind: "error",
					message: `Too large to save (${formatBytes(bytes)} of ${formatBytes(MAX_CONTENT_BYTES)})`,
				});
				return;
			}
			focusResult.current = true;
			setImportState({
				kind: "preview",
				fileName: file.name,
				content: validation.value,
				reviewedDraft: store.getState().draft,
			});
		} catch {
			if (request === fileRequest.current) {
				setImportState({ kind: "error", message: "Could not read the selected file." });
			}
		}
	};

	const applyImport = async () => {
		if (!preview || stale || applying || busy || conflict) return;
		fileRequest.current += 1;
		setApplying(true);
		try {
			const result = await store.importDraft(preview.content, preview.reviewedDraft);
			switch (result.status) {
				case "saved":
					focusResult.current = true;
					setImportState({
						kind: "applied",
						fileName: preview.fileName,
						revision: result.revision,
					});
					break;
				case "invalid": {
					const validation = validatePortfolioContent(preview.content);
					focusResult.current = true;
					setImportState({
						kind: "error",
						message: "Validation failed.",
						issues: validation.ok ? [] : validation.issues.slice(0, 20),
					});
					break;
				}
				case "blocked":
				case "conflict":
					setImportState({ ...preview, problem: "conflict" });
					break;
				case "stale":
				case "failed":
					setImportState({ ...preview, problem: result.status });
					break;
			}
		} finally {
			setApplying(false);
		}
	};

	return (
		<div className="grid min-w-0 gap-5">
			{/* Import / Export controls */}
			<section style={staggerStyle(0)} className="cms-panel cms-enter grid gap-4 p-4 sm:p-5">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="grid gap-1">
						<h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em] text-foreground">
							{draftLabel}
						</h2>
						<p className="m-0 text-[13px] text-muted-foreground">
							Download a snapshot, or import a JSON file to preview changes before replacing your
							draft.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<CopyButton
							value={formatted}
							label="Copy JSON"
							copiedLabel="Copied"
							variant="outline"
							size="sm"
							className="pointer-coarse:min-h-11"
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={exportDraft}
							className="pointer-coarse:min-h-11"
						>
							<DownloadIcon className="size-3.5" />
							<span>Export JSON</span>
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept=".json,application/json"
							className="sr-only"
							tabIndex={-1}
							aria-hidden="true"
							onChange={(event) => {
								const file = event.currentTarget.files?.[0];
								event.currentTarget.value = "";
								void onSelectFile(file);
							}}
						/>
						<Button
							ref={pickerRef}
							variant="secondary"
							size="sm"
							aria-describedby={importState.kind === "idle" ? undefined : resultId}
							aria-disabled={busy || applying}
							onClick={() => {
								if (!busy && !applying) fileInputRef.current?.click();
							}}
							className="pointer-coarse:min-h-11"
						>
							<UploadIcon className="size-3.5" />
							<span>Import JSON…</span>
						</Button>
					</div>
				</div>

				<div className="grid gap-1.5">
					<div className="flex flex-wrap justify-between gap-x-3 font-mono text-[11px] tabular-nums text-muted-foreground">
						<span>
							{formatBytes(savedBytes)} of {formatBytes(MAX_CONTENT_BYTES)} saved size
						</span>
						<span>Export file {formatBytes(exportBytes)}</span>
					</div>
					<div
						className={cn(
							"h-1.5 overflow-hidden rounded-full bg-muted",
							usage > 1 && "border border-dashed border-destructive bg-transparent",
						)}
					>
						{usage <= 1 ? (
							<div
								aria-hidden="true"
								className={cn(
									"h-full w-full origin-left rounded-full transition-transform duration-300 ease-trace motion-reduce:transition-none",
									usage >= 0.8 ? "bg-foreground" : "bg-primary",
								)}
								style={{ transform: `scaleX(${usage})` }}
							/>
						) : null}
					</div>
					{usage >= 0.8 ? (
						<p
							className={cn("m-0 text-[12px]", usage > 1 ? "text-destructive" : "text-foreground")}
						>
							{usage > 1 ? "Over the saved size limit" : "Near the limit"}
						</p>
					) : null}
				</div>

				{importState.kind === "error" ? (
					<div
						id={resultId}
						ref={(element) => {
							resultRef.current = element;
						}}
						tabIndex={-1}
						role="alert"
						className="cms-page-focus cms-enter grid gap-2 rounded-[12px] border border-dashed border-destructive/45 bg-destructive/8 p-3.5 text-[13px]"
					>
						<p className="m-0 flex items-center gap-2 font-medium text-destructive">
							<AlertTriangleIcon className="size-4 shrink-0" />
							<span>{importState.message}</span>
						</p>
						{importState.issues?.length ? (
							<ul className="m-0 grid list-none gap-1 p-0 font-mono text-[11.5px] text-ink-soft">
								{importState.issues.map((issue, idx) => (
									<li key={`${issue.path}-${idx}`}>
										<span className="text-foreground">{issue.path || "$"}</span>: {issue.message}
									</li>
								))}
							</ul>
						) : null}
					</div>
				) : null}

				{importState.kind === "applied" ? (
					<p
						id={resultId}
						ref={(element) => {
							resultRef.current = element;
						}}
						tabIndex={-1}
						role="status"
						className="cms-page-focus cms-enter m-0 flex items-center gap-2 rounded-[10px] border border-success/35 bg-success/10 px-3 py-2 text-[13px] text-success"
					>
						<CheckCircleIcon className="size-4 shrink-0" />
						<span className="min-w-0 [overflow-wrap:anywhere]">
							Imported {importState.fileName} as Draft r{importState.revision}.
						</span>
					</p>
				) : null}
			</section>

			{/* Import preview diff */}
			{preview && importDiff ? (
				<section className="cms-panel cms-enter grid gap-4 border-primary-line p-4 sm:p-5">
					<header className="flex flex-wrap items-center justify-between gap-3">
						<div className="grid gap-0.5">
							<p className="mono-label m-0 text-[10.5px] text-primary-text">Import preview</p>
							<h3
								id={resultId}
								ref={(element) => {
									resultRef.current = element;
								}}
								tabIndex={-1}
								className="cms-page-focus m-0 text-[15px] font-semibold text-foreground [overflow-wrap:anywhere]"
							>
								{preview.fileName} · {importDiff.changedSections.length}{" "}
								{importDiff.changedSections.length === 1 ? "section" : "sections"} will change
							</h3>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={applying}
								onClick={() => {
									fileRequest.current += 1;
									setImportState({ kind: "idle" });
									pickerRef.current?.focus();
								}}
								className="pointer-coarse:min-h-11"
							>
								Cancel
							</Button>
							<Button
								variant="default"
								size="sm"
								aria-disabled={
									applying ||
									busy ||
									conflict ||
									stale ||
									(importDiff.changedSections.length === 0 && !dirty)
								}
								onClick={() => {
									if (importDiff.changedSections.length > 0 || dirty) void applyImport();
								}}
								className="pointer-coarse:min-h-11"
							>
								{applying
									? "Applying…"
									: preview.problem === "failed"
										? "Retry import"
										: "Replace draft"}
							</Button>
						</div>
					</header>
					{stale ? (
						<div className="flex flex-wrap items-center gap-2">
							<p role="status" className="m-0 text-[13px]">
								Your draft changed after this preview.
							</p>
							<Button
								variant="outline"
								size="sm"
								className="pointer-coarse:min-h-11"
								onClick={() => {
									focusResult.current = true;
									setImportState({
										...preview,
										reviewedDraft: store.getState().draft,
										problem: undefined,
									});
								}}
							>
								Refresh preview
							</Button>
						</div>
					) : null}
					{preview.problem === "conflict" && conflict ? (
						<p role="alert" className="m-0 text-[13px] text-destructive">
							Resolve the conflict first.
						</p>
					) : null}
					{preview.problem === "failed" ? (
						<p role="alert" className="m-0 text-[13px] text-destructive">
							The import wasn't confirmed. Your draft in this tab is unchanged.
						</p>
					) : null}
					<DiffView
						diff={importDiff}
						beforeLabel="Current draft"
						afterLabel="Import"
						showEditLinks={false}
						showUnchanged={false}
						emptyTitle="No differences found"
						emptyDescription="The imported JSON matches your current draft exactly."
					/>
				</section>
			) : null}

			{/* Read-only JSON document */}
			<section style={staggerStyle(1)} className="cms-panel cms-enter overflow-hidden">
				<header className="flex items-center justify-between border-b border-line px-4 py-2.5">
					<span className="font-mono text-[10.5px] text-muted-foreground">
						{draftLabel} · read-only inspect
					</span>
					<span className="font-mono text-[11px] tabular-nums text-muted-foreground">
						{formatted.split("\n").length} lines
					</span>
				</header>
				<pre
					tabIndex={0}
					aria-label={`Draft r${draftRevision} JSON`}
					className="cms-page-focus m-0 max-h-[540px] overflow-auto bg-[color-mix(in_srgb,var(--theme-ink)_2%,transparent)] p-4 font-mono text-[12px] leading-[1.6] text-ink-soft"
				>
					<code>{formatted}</code>
				</pre>
			</section>
		</div>
	);
}
