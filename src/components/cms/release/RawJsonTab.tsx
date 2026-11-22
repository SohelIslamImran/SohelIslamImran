/**
 * Raw JSON inspection, export, and validated file import with diff preview.
 */
import { useMemo, useRef, useState } from "react";
import {
	MAX_CONTENT_BYTES,
	upgradeStoredContent,
	validatePortfolioContent,
	type ValidationIssue,
} from "../../../lib/validation";
import { CONTENT_SCHEMA_VERSION, type PortfolioContent } from "../../../types/content";
import { CopyButton } from "../../motion/CopyButton";
import { Button } from "../../ui/button";
import { staggerStyle } from "../analytics/Widgets";
import { useDraftSelector, useDraftStore } from "../draft/context";
import { AlertTriangleIcon, CheckCircleIcon, DownloadIcon, UploadIcon } from "../shell/cms-icons";
import { formatBytes } from "../shell/time";
import { diffPortfolioDocuments } from "./diff";
import { DiffView } from "./DiffView";

type ImportState =
	| { kind: "idle" }
	| { kind: "error"; message: string; issues?: ValidationIssue[] }
	| { kind: "preview"; fileName: string; content: PortfolioContent }
	| { kind: "applied"; fileName: string };

export function RawJsonTab() {
	const store = useDraftStore();
	const draft = useDraftSelector((state) => state.draft);
	const draftRevision = useDraftSelector((state) => state.draftRevision);
	const busy = useDraftSelector(
		(state) => state.status === "saving" || state.status === "publishing",
	);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [importState, setImportState] = useState<ImportState>({ kind: "idle" });
	const [applying, setApplying] = useState(false);

	const { formatted, byteLength } = useMemo(() => {
		const text = `${JSON.stringify(draft, null, 2)}\n`;
		return {
			formatted: text,
			byteLength: new TextEncoder().encode(text).byteLength,
		};
	}, [draft]);

	const importDiff = useMemo(() => {
		if (importState.kind !== "preview") return null;
		return diffPortfolioDocuments(draft, importState.content);
	}, [draft, importState]);

	const usagePct = Math.min(100, Math.round((byteLength / MAX_CONTENT_BYTES) * 100));
	const usageScale = Math.min(1, Math.max(0, byteLength / MAX_CONTENT_BYTES));

	const exportDraft = () => {
		const blob = new Blob([formatted], { type: "application/json;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `portfolio-draft-r${draftRevision}.json`;
		anchor.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 1000);
	};

	const onSelectFile = async (file: File | undefined) => {
		if (!file) return;
		if (file.size > MAX_CONTENT_BYTES) {
			setImportState({
				kind: "error",
				message: `File is ${formatBytes(file.size)}, which exceeds the ${formatBytes(MAX_CONTENT_BYTES)} limit.`,
			});
			return;
		}
		try {
			const text = await file.text();
			let parsed: unknown;
			try {
				parsed = JSON.parse(text);
			} catch {
				setImportState({ kind: "error", message: "The selected file is not valid JSON." });
				return;
			}

			let candidate: unknown = parsed;
			if (
				candidate &&
				typeof candidate === "object" &&
				"schemaVersion" in candidate &&
				(candidate as { schemaVersion?: unknown }).schemaVersion !== CONTENT_SCHEMA_VERSION
			) {
				try {
					candidate = upgradeStoredContent(candidate);
				} catch {
					// Fall through to validator so the user gets structured issues.
				}
			}

			const validation = validatePortfolioContent(candidate);
			if (!validation.ok) {
				setImportState({
					kind: "error",
					message: `Validation failed with ${validation.issues.length} ${validation.issues.length === 1 ? "issue" : "issues"}.`,
					issues: validation.issues.slice(0, 20),
				});
				return;
			}

			setImportState({ kind: "preview", fileName: file.name, content: validation.value });
		} catch {
			setImportState({ kind: "error", message: "Could not read the selected file." });
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const applyImport = async () => {
		if (importState.kind !== "preview") return;
		setApplying(true);
		try {
			const ok = await store.replaceDraft(importState.content);
			if (ok) {
				setImportState({ kind: "applied", fileName: importState.fileName });
			}
		} finally {
			setApplying(false);
		}
	};

	return (
		<div className="grid gap-5">
			{/* Import / Export controls */}
			<section style={staggerStyle(0)} className="cms-panel cms-enter grid gap-4 p-4 sm:p-5">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="grid gap-1">
						<h2 className="m-0 text-[15px] font-semibold tracking-[-0.012em] text-foreground">
							Export and import
						</h2>
						<p className="m-0 text-[13px] text-muted-foreground">
							Download a full snapshot of Draft r{draftRevision}, or import a JSON file to preview
							changes before replacing your draft.
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
							onChange={(event) => void onSelectFile(event.target.files?.[0])}
						/>
						<Button
							variant="secondary"
							size="sm"
							disabled={busy || applying}
							onClick={() => fileInputRef.current?.click()}
							className="pointer-coarse:min-h-11"
						>
							<UploadIcon className="size-3.5" />
							<span>Import JSON…</span>
						</Button>
					</div>
				</div>

				{/* Byte budget gauge (transform-only scaleX) */}
				<div className="grid gap-1.5">
					<div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
						<span>
							Schema v{draft.schemaVersion} · {formatBytes(byteLength)} /{" "}
							{formatBytes(MAX_CONTENT_BYTES)}
						</span>
						<span>{usagePct}%</span>
					</div>
					<div className="h-1.5 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-300 ease-trace"
							style={{ transform: `scaleX(${usageScale})` }}
						/>
					</div>
				</div>

				{importState.kind === "error" ? (
					<div
						role="alert"
						className="cms-enter grid gap-2 rounded-[12px] border border-dashed border-destructive/45 bg-destructive/8 p-3.5 text-[13px]"
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
						role="status"
						className="cms-enter m-0 flex items-center gap-2 rounded-[10px] border border-success/35 bg-success/10 px-3 py-2 text-[13px] text-success"
					>
						<CheckCircleIcon className="size-4 shrink-0" />
						<span>Imported {importState.fileName} and saved as a new draft revision.</span>
					</p>
				) : null}
			</section>

			{/* Import preview diff */}
			{importState.kind === "preview" && importDiff ? (
				<section className="cms-panel cms-enter grid gap-4 border-primary-line p-4 sm:p-5">
					<header className="flex flex-wrap items-center justify-between gap-3">
						<div className="grid gap-0.5">
							<p className="mono-label m-0 text-[10.5px] text-primary-text">Import preview</p>
							<h3 className="m-0 text-[15px] font-semibold text-foreground">
								{importState.fileName} · {importDiff.changedSections.length}{" "}
								{importDiff.changedSections.length === 1 ? "section" : "sections"} will change
							</h3>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={applying}
								onClick={() => setImportState({ kind: "idle" })}
								className="pointer-coarse:min-h-11"
							>
								Cancel
							</Button>
							<Button
								variant="default"
								size="sm"
								disabled={applying || importDiff.changedSections.length === 0}
								onClick={() => void applyImport()}
								className="pointer-coarse:min-h-11"
							>
								{applying ? "Applying…" : "Replace draft"}
							</Button>
						</div>
					</header>
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
					<span className="mono-label text-[10.5px] text-muted-foreground">
						Draft r{draftRevision} · read-only inspect
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
