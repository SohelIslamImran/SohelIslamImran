import { mediaHref } from "../../../lib/media";
import { cn } from "../../../lib/utils";
import { asMediaAsset, type RowDiffStatus } from "./diff";
import { diffWords } from "./word-diff";

export function StatusGlyph({ status }: { status: RowDiffStatus }) {
	switch (status) {
		case "added":
			return (
				<svg
					viewBox="0 0 14 14"
					aria-hidden="true"
					className="size-3 shrink-0 fill-none stroke-current stroke-[1.9] [stroke-linecap:round]"
				>
					<path d="M7 2.75v8.5M2.75 7h8.5" />
				</svg>
			);
		case "edited":
			return (
				<svg
					viewBox="0 0 14 14"
					aria-hidden="true"
					className="size-3 shrink-0 fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
				>
					<path d="M9.5 2.5 11.5 4.5 5 11H3V9l6.5-6.5Z" />
				</svg>
			);
		case "removed":
			return (
				<svg
					viewBox="0 0 14 14"
					aria-hidden="true"
					className="size-3 shrink-0 fill-none stroke-current stroke-[1.9] [stroke-linecap:round]"
				>
					<path d="M3 7h8" />
				</svg>
			);
		case "reordered":
			return (
				<svg
					viewBox="0 0 14 14"
					aria-hidden="true"
					className="size-3 shrink-0 fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
				>
					<path d="M7 2.5v9M4.5 5 7 2.5 9.5 5M4.5 9 7 11.5 9.5 9" />
				</svg>
			);
	}
}

function formatScalar(value: unknown): string {
	if (value === undefined || value === null || value === "") return "Empty";
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "number") return String(value);
	if (typeof value === "string") return value;
	return JSON.stringify(value);
}

function isEmptyScalar(value: unknown): boolean {
	return value === undefined || value === null || value === "";
}

export function TagsDiff({ before, after }: { before: unknown; after: unknown }) {
	const left = Array.isArray(before) ? before.map(String) : [];
	const right = Array.isArray(after) ? after.map(String) : [];
	const leftSet = new Set(left);
	const rightSet = new Set(right);
	const removed = left.filter((item) => !rightSet.has(item));
	const added = right.filter((item) => !leftSet.has(item));
	const kept = right.filter((item) => leftSet.has(item));

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{removed.map((tag) => (
				<span
					key={`del-${tag}`}
					className="inline-flex items-center gap-1 rounded-full border border-dashed border-destructive/45 bg-destructive/10 px-2.5 py-0.5 text-[12px] text-destructive line-through"
				>
					<StatusGlyph status="removed" />
					{tag}
					<span className="sr-only"> (removed)</span>
				</span>
			))}
			{added.map((tag) => (
				<span
					key={`add-${tag}`}
					className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-[12px] font-medium text-success"
				>
					<StatusGlyph status="added" />
					{tag}
					<span className="sr-only"> (added)</span>
				</span>
			))}
			{kept.length > 0 ? (
				<span className="text-[12px] text-muted-foreground">{kept.length} unchanged</span>
			) : null}
		</div>
	);
}

/** Split a changed run into leading space, the changed words, and trailing space. */
function splitEdges(text: string): [string, string, string] {
	const match = /^(\s*)([\s\S]*?)(\s*)$/u.exec(text);
	return match ? [match[1] ?? "", match[2] ?? "", match[3] ?? ""] : ["", text, ""];
}

/** Inline word diff. Whitespace around a change stays outside the highlight. */
function WordDiffText({ before, after }: { before: string; after: string }) {
	const parts = diffWords(before, after);
	return (
		<>
			{parts.map((part, index) => {
				if (part.kind === "same") return <span key={index}>{part.text}</span>;
				const [lead, core, trail] = splitEdges(part.text);
				return (
					<span key={index}>
						{lead}
						{core ? (
							part.kind === "del" ? (
								<del className="rounded-[4px] bg-destructive/12 px-0.5 text-destructive decoration-destructive/75 line-through [box-decoration-break:clone]">
									<span className="sr-only">removed: </span>
									{core}
								</del>
							) : (
								<ins className="rounded-[4px] bg-success/14 px-0.5 text-foreground underline decoration-success/80 decoration-2 underline-offset-2 [box-decoration-break:clone]">
									<span className="sr-only">added: </span>
									{core}
								</ins>
							)
						) : null}
						{trail}
					</span>
				);
			})}
		</>
	);
}

export function ProseDiff({ before, after }: { before: unknown; after: unknown }) {
	return (
		<p className="m-0 rounded-[11px] border border-line bg-surface-solid px-3.5 py-3 text-[13.5px] leading-[1.68] text-ink-soft whitespace-pre-wrap">
			<WordDiffText
				before={typeof before === "string" ? before : ""}
				after={typeof after === "string" ? after : ""}
			/>
		</p>
	);
}

function MediaCard({ value, label }: { value: unknown; label: string }) {
	const asset = asMediaAsset(value);
	const href = mediaHref(asset);
	return (
		<div className="flex min-w-0 items-center gap-2.5 rounded-[10px] border border-line bg-surface-solid p-2">
			{asset && href ? (
				<img
					src={href}
					alt={asset.alt || asset.id}
					className="size-11 shrink-0 rounded-[7px] border border-line bg-muted object-cover"
				/>
			) : (
				<span
					aria-hidden="true"
					className="grid size-11 shrink-0 place-items-center rounded-[7px] border border-dashed border-line-strong font-mono text-[11px] text-muted-foreground"
				>
					—
				</span>
			)}
			<div className="min-w-0">
				<p className="m-0 text-[11.5px] font-medium text-muted-foreground">{label}</p>
				<p className="m-0 truncate text-[12.5px] font-medium text-foreground">
					{asset ? asset.alt || "Untitled asset" : "None"}
				</p>
			</div>
		</div>
	);
}

export function MediaDiff({
	before,
	after,
	beforeLabel,
	afterLabel,
}: {
	before: unknown;
	after: unknown;
	beforeLabel: string;
	afterLabel: string;
}) {
	return (
		<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
			<MediaCard value={before} label={beforeLabel} />
			<span aria-hidden="true" className="hidden font-mono text-muted-foreground sm:inline">
				→
			</span>
			<MediaCard value={after} label={afterLabel} />
		</div>
	);
}

/** Multi-word strings past this length read better as an inline word diff. */
const WORD_DIFF_MIN_LENGTH = 24;

function wantsWordDiff(before: unknown, after: unknown): before is string {
	if (typeof before !== "string" || typeof after !== "string") return false;
	if (!before || !after) return false;
	const long = before.length > WORD_DIFF_MIN_LENGTH || after.length > WORD_DIFF_MIN_LENGTH;
	return long && (/\s/u.test(before) || /\s/u.test(after));
}

export function ShortDiff({
	before,
	after,
	beforeLabel,
	afterLabel,
}: {
	before: unknown;
	after: unknown;
	beforeLabel: string;
	afterLabel: string;
}) {
	if (wantsWordDiff(before, after)) {
		return (
			<p className="m-0 rounded-[11px] border border-line bg-surface-solid px-3.5 py-2.5 text-[13.5px] leading-[1.6] text-ink-soft [overflow-wrap:anywhere]">
				<WordDiffText before={before} after={after as string} />
			</p>
		);
	}
	// Stacked on narrow screens (no arrow), inline with an arrow from `sm`.
	return (
		<div className="grid gap-1.5 text-[13px] sm:flex sm:flex-wrap sm:items-center sm:gap-2">
			<span
				className={cn(
					"inline-flex max-w-full items-baseline gap-1.5 justify-self-start rounded-[9px] border border-dashed border-line-strong bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] px-2.5 py-1 text-muted-foreground",
					isEmptyScalar(before) && "italic",
				)}
			>
				<span className="shrink-0 text-[11.5px] font-medium not-italic">{beforeLabel}</span>
				<span className="line-through decoration-destructive/65 [overflow-wrap:anywhere]">
					{formatScalar(before)}
				</span>
			</span>
			<span aria-hidden="true" className="hidden text-[12px] text-primary-text sm:inline">
				→
			</span>
			<span
				className={cn(
					"inline-flex max-w-full items-baseline gap-1.5 justify-self-start rounded-[9px] border border-primary-line bg-primary-soft px-2.5 py-1 font-medium text-foreground",
					isEmptyScalar(after) && "italic text-muted-foreground",
				)}
			>
				<span className="shrink-0 text-[11.5px] font-medium text-primary-text not-italic">
					{afterLabel}
				</span>
				<span className="[overflow-wrap:anywhere]">{formatScalar(after)}</span>
			</span>
		</div>
	);
}

export function ListDiff({
	before,
	after,
	beforeLabel,
	afterLabel,
}: {
	before: unknown;
	after: unknown;
	beforeLabel: string;
	afterLabel: string;
}) {
	const left = Array.isArray(before) ? before : [];
	const right = Array.isArray(after) ? after : [];
	const max = Math.max(left.length, right.length);

	const summarize = (item: unknown): string => {
		if (typeof item === "string") return item;
		if (item && typeof item === "object") {
			const rec = item as Record<string, unknown>;
			const label = rec.label ?? rec.title ?? rec.platform ?? rec.key;
			const value = rec.value ?? rec.href ?? rec.handle;
			if (typeof label === "string" && typeof value === "string") return `${label}: ${value}`;
			if (typeof label === "string") return label;
		}
		return JSON.stringify(item);
	};

	return (
		<ul className="m-0 grid list-none gap-1.5 p-0">
			{Array.from({ length: max }).map((_, index) => {
				const l = left[index];
				const r = right[index];
				if (JSON.stringify(l) === JSON.stringify(r)) return null;
				if (l === undefined) {
					return (
						<li
							key={index}
							className="flex items-start gap-2 rounded-[9px] border border-success/35 bg-success/8 px-2.5 py-1.5 text-[13px] text-foreground"
						>
							<span className="mt-0.5 text-success">
								<StatusGlyph status="added" />
							</span>
							<span className="min-w-0 break-words">{summarize(r)}</span>
						</li>
					);
				}
				if (r === undefined) {
					return (
						<li
							key={index}
							className="flex items-start gap-2 rounded-[9px] border border-dashed border-destructive/35 bg-destructive/8 px-2.5 py-1.5 text-[13px] text-destructive line-through"
						>
							<span className="mt-0.5">
								<StatusGlyph status="removed" />
							</span>
							<span className="min-w-0 break-words">{summarize(l)}</span>
						</li>
					);
				}
				if (typeof l === "string" && typeof r === "string" && (l.length >= 60 || r.length >= 60)) {
					return (
						<li key={index} className="grid gap-1">
							<span className="text-[11.5px] font-medium text-muted-foreground">
								Item {index + 1}
							</span>
							<ProseDiff before={l} after={r} />
						</li>
					);
				}
				return (
					<li key={index} className="grid gap-1">
						<ShortDiff
							before={summarize(l)}
							after={summarize(r)}
							beforeLabel={`${beforeLabel}, item ${index + 1}`}
							afterLabel={`${afterLabel}, item ${index + 1}`}
						/>
					</li>
				);
			})}
		</ul>
	);
}
