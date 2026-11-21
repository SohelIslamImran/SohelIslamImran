/**
 * Structural diff between two `PortfolioContent` documents, grouped by the CMS
 * section registry (`SECTIONS`). Collection rows carrying `id` are matched by
 * `id`, so reordering reports `reordered` (#from → #to) instead of marking
 * every row as edited.
 */
import type { MediaAsset, PortfolioContent } from "../../../types/content";
import { childPath, getAt, jsonEqual, parsePath } from "../draft/paths";
import { SECTIONS, type SectionId, type SectionMeta } from "../sections/registry";

export type FieldDiffKind = "short" | "prose" | "tags" | "media" | "list";

export interface FieldDiff {
	/** Human-readable label for the changed field. */
	label: string;
	/** Canonical path on the `draft` / `target` side (e.g. `projects[2].summary`). */
	path: string;
	kind: FieldDiffKind;
	before: unknown;
	after: unknown;
	/** True when the field exists on the live side so `store.revertAt(path)` can restore it. */
	revertible: boolean;
}

export type RowDiffStatus = "added" | "edited" | "removed" | "reordered";

export interface RowDiff {
	id: string;
	/** Human label for the collection row (title, company, author, place…). */
	title: string;
	status: RowDiffStatus;
	/** 1-based index in the base (live) list when present. */
	beforeIndex: number | null;
	/** 1-based index in the target (draft) list when present. */
	afterIndex: number | null;
	/** Path to the row in the target list, if present. */
	path: string | null;
	/** Optional `?item=` id for deep-linking into collection editors. */
	itemId?: string;
	/** Field-level diffs when `status === "edited"`. */
	fields: FieldDiff[];
	/** Summary preview for added/removed rows. */
	preview?: string;
}

export interface SectionDiff {
	section: SectionMeta;
	changed: boolean;
	fields: FieldDiff[];
	rows: RowDiff[];
	counts: {
		added: number;
		edited: number;
		removed: number;
		reordered: number;
		fields: number;
	};
}

export interface DocumentDiff {
	sections: SectionDiff[];
	changedSections: SectionDiff[];
	unchangedSections: SectionDiff[];
	totalChanges: number;
}

const FIELD_LABELS: Record<string, string> = {
	title: "Title",
	description: "Description",
	url: "Canonical URL",
	locale: "Locale",
	theme: "Theme",
	name: "Name",
	handle: "Handle",
	role: "Role",
	location: "Location",
	timezone: "Time zone",
	availability: "Availability",
	email: "Email",
	avatar: "Portrait",
	eyebrow: "Eyebrow",
	intro: "Intro",
	actions: "Actions",
	metrics: "Metrics",
	paragraphs: "Paragraphs",
	facts: "Quick facts",
	responseTime: "Response time",
	links: "Links",
	label: "Label",
	href: "URL",
	updatedAt: "Last updated",
	summary: "Summary",
	company: "Company",
	period: "Period",
	highlights: "Highlights",
	technologies: "Technologies",
	current: "Current role",
	slug: "Slug",
	year: "Year",
	status: "Status",
	tags: "Tags",
	category: "Category",
	repository: "Repository",
	cover: "Cover image",
	featured: "Featured",
	quote: "Quote",
	author: "Author",
	date: "Date",
	issuer: "Issuer",
	issuedAt: "Issued date",
	tools: "Tools",
	excerpt: "Excerpt",
	publishedAt: "Published date",
	readingTime: "Reading time",
	platform: "Platform",
	kind: "Kind",
	chapters: "Chapters",
	artifact: "Artifact",
	sourceLabel: "Source label",
	sourceHref: "Source link",
	origin: "Origin",
	entries: "Entries",
	place: "Place",
	region: "Region",
	season: "Season",
	reflection: "Reflection",
	latitude: "Latitude",
	longitude: "Longitude",
	visibility: "Visibility",
	mediaIds: "Media attachments",
	social: "Social links",
};

const TAG_KEYS = new Set(["tags", "tools", "technologies", "mediaIds"]);
const MEDIA_KEYS = new Set(["avatar", "cover"]);
const PROSE_KEYS = new Set([
	"description",
	"intro",
	"summary",
	"quote",
	"reflection",
	"excerpt",
	"artifact",
]);

export function humanizeKey(key: string): string {
	if (FIELD_LABELS[key]) return FIELD_LABELS[key];
	return key
		.replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
		.replace(/[_-]+/gu, " ")
		.replace(/^./u, (char) => char.toUpperCase());
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function hasId(value: unknown): value is Record<string, unknown> & { id: string } {
	const rec = asRecord(value);
	return rec !== null && typeof rec.id === "string" && rec.id.length > 0;
}

function isIdArray(value: unknown): value is Array<Record<string, unknown> & { id: string }> {
	return Array.isArray(value) && value.length > 0 && value.every((item) => hasId(item));
}

function isMediaValue(key: string, before: unknown, after: unknown): boolean {
	if (MEDIA_KEYS.has(key)) return true;
	const check = (val: unknown) => {
		const rec = asRecord(val);
		return rec !== null && typeof rec.id === "string" && "alt" in rec && "key" in rec;
	};
	return check(before) || check(after);
}

function classifyField(key: string, before: unknown, after: unknown): FieldDiffKind {
	if (isMediaValue(key, before, after)) return "media";
	if (TAG_KEYS.has(key)) return "tags";
	if (Array.isArray(before) || Array.isArray(after)) {
		const sample =
			Array.isArray(after) && after.length ? after : Array.isArray(before) ? before : [];
		if (sample.every((item) => typeof item === "string") && TAG_KEYS.has(key)) {
			return "tags";
		}
		return "list";
	}
	const left = typeof before === "string" ? before : "";
	const right = typeof after === "string" ? after : "";
	if (
		PROSE_KEYS.has(key) ||
		left.length >= 80 ||
		right.length >= 80 ||
		left.includes("\n") ||
		right.includes("\n")
	) {
		return "prose";
	}
	return "short";
}

function rowTitle(row: Record<string, unknown>): string {
	for (const key of ["title", "label", "place", "author", "company", "platform", "slug", "id"]) {
		const value = row[key];
		if (typeof value === "string" && value.trim()) {
			if (key === "company" && typeof row.role === "string" && row.role.trim()) {
				return `${row.role.trim()} · ${value.trim()}`;
			}
			return value.trim();
		}
	}
	return "Untitled item";
}

function rowPreview(row: Record<string, unknown>): string | undefined {
	for (const key of [
		"summary",
		"description",
		"excerpt",
		"quote",
		"reflection",
		"period",
		"href",
	]) {
		const value = row[key];
		if (typeof value === "string" && value.trim()) {
			const text = value.trim();
			return text.length > 140 ? `${text.slice(0, 137)}…` : text;
		}
	}
	return undefined;
}

function diffObjectFields(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	basePath: string,
	revertible: boolean,
): FieldDiff[] {
	const diffs: FieldDiff[] = [];
	const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
	for (const key of keys) {
		if (key === "id") continue;
		const left = before[key];
		const right = after[key];
		if (jsonEqual(left, right)) continue;
		diffs.push({
			label: humanizeKey(key),
			path: childPath(basePath, key),
			kind: classifyField(key, left, right),
			before: left,
			after: right,
			revertible,
		});
	}
	return diffs;
}

function diffIdCollection(
	beforeList: unknown[],
	afterList: unknown[],
	basePath: string,
	supportsItemParam: boolean,
): RowDiff[] {
	const beforeById = new Map<string, { item: Record<string, unknown>; index: number }>();
	beforeList.forEach((item, index) => {
		if (hasId(item)) beforeById.set(item.id, { item, index });
	});

	const afterById = new Map<string, { item: Record<string, unknown>; index: number }>();
	afterList.forEach((item, index) => {
		if (hasId(item)) afterById.set(item.id, { item, index });
	});

	const rows: RowDiff[] = [];

	// Walk target (draft) order first for added, edited, and reordered rows.
	afterList.forEach((item, afterIndex) => {
		if (!hasId(item)) return;
		const matched = beforeById.get(item.id);
		const path = childPath(basePath, afterIndex);
		if (!matched) {
			rows.push({
				id: item.id,
				title: rowTitle(item),
				status: "added",
				beforeIndex: null,
				afterIndex: afterIndex + 1,
				path,
				itemId: supportsItemParam ? item.id : undefined,
				fields: [],
				preview: rowPreview(item),
			});
			return;
		}
		const fields = diffObjectFields(matched.item, item, path, true);
		const moved = matched.index !== afterIndex;
		if (fields.length > 0) {
			rows.push({
				id: item.id,
				title: rowTitle(item),
				status: "edited",
				beforeIndex: matched.index + 1,
				afterIndex: afterIndex + 1,
				path,
				itemId: supportsItemParam ? item.id : undefined,
				fields,
			});
		} else if (moved) {
			rows.push({
				id: item.id,
				title: rowTitle(item),
				status: "reordered",
				beforeIndex: matched.index + 1,
				afterIndex: afterIndex + 1,
				path,
				itemId: supportsItemParam ? item.id : undefined,
				fields: [],
			});
		}
	});

	// Append removed rows (present in base/live, absent in target/draft).
	beforeList.forEach((item, beforeIndex) => {
		if (!hasId(item) || afterById.has(item.id)) return;
		rows.push({
			id: item.id,
			title: rowTitle(item),
			status: "removed",
			beforeIndex: beforeIndex + 1,
			afterIndex: null,
			path: null,
			fields: [],
			preview: rowPreview(item),
		});
	});

	return rows;
}

/**
 * Diff `target` (usually the draft) against `base` (usually the live document),
 * grouped into the CMS `SECTIONS` registry.
 */
export function diffPortfolioDocuments(
	base: PortfolioContent,
	target: PortfolioContent,
): DocumentDiff {
	const sections: SectionDiff[] = (SECTIONS as readonly SectionMeta[]).map((section) => {
		const fields: FieldDiff[] = [];
		const rows: RowDiff[] = [];

		for (const rootKey of section.paths) {
			const beforeVal = base[rootKey];
			const afterVal = target[rootKey];
			if (jsonEqual(beforeVal, afterVal)) continue;

			if (Array.isArray(beforeVal) && Array.isArray(afterVal)) {
				const treatsAsIdRows =
					isIdArray(beforeVal) ||
					isIdArray(afterVal) ||
					(beforeVal.length === 0 && afterVal.length === 0);
				if (treatsAsIdRows && rootKey !== "social") {
					rows.push(...diffIdCollection(beforeVal, afterVal, rootKey, Boolean(section.collection)));
				} else {
					fields.push({
						label: humanizeKey(rootKey),
						path: rootKey,
						kind: "list",
						before: beforeVal,
						after: afterVal,
						revertible: true,
					});
				}
				continue;
			}

			const beforeObj = asRecord(beforeVal);
			const afterObj = asRecord(afterVal);
			if (beforeObj && afterObj) {
				const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
				for (const key of keys) {
					const left = beforeObj[key];
					const right = afterObj[key];
					if (jsonEqual(left, right)) continue;

					// Nested id-bearing collections such as `story.chapters` and `travel.entries`.
					if (
						Array.isArray(left) &&
						Array.isArray(right) &&
						(isIdArray(left) || isIdArray(right))
					) {
						rows.push(...diffIdCollection(left, right, childPath(rootKey, key), false));
					} else {
						fields.push({
							label: humanizeKey(key),
							path: childPath(rootKey, key),
							kind: classifyField(key, left, right),
							before: left,
							after: right,
							revertible: true,
						});
					}
				}
			}
		}

		const counts = {
			added: rows.filter((row) => row.status === "added").length,
			edited: rows.filter((row) => row.status === "edited").length,
			removed: rows.filter((row) => row.status === "removed").length,
			reordered: rows.filter((row) => row.status === "reordered").length,
			fields: fields.length + rows.reduce((sum, row) => sum + row.fields.length, 0),
		};
		const changed = fields.length > 0 || rows.length > 0;
		return { section, changed, fields, rows, counts };
	});

	const changedSections = sections.filter((entry) => entry.changed);
	const unchangedSections = sections.filter((entry) => !entry.changed);
	const totalChanges = changedSections.reduce(
		(total, entry) =>
			total +
			entry.counts.added +
			entry.counts.removed +
			entry.counts.reordered +
			entry.counts.fields,
		0,
	);

	return { sections, changedSections, unchangedSections, totalChanges };
}

export interface PathTarget {
	sectionId: SectionId;
	sectionLabel: string;
	itemId?: string;
	fieldLabel: string;
}

/**
 * Resolve any validator/draft path (e.g. `projects[2].metrics[0].label`) to its
 * CMS section and optional collection `?item=<id>` so error jump lists and diff
 * links can navigate and focus the exact field.
 */
export function resolvePathTarget(path: string, content: PortfolioContent): PathTarget | null {
	const segments = parsePath(path);
	const root = segments[0];
	if (typeof root !== "string") return null;

	const section = (SECTIONS as readonly SectionMeta[]).find((candidate) =>
		candidate.paths.includes(root as keyof PortfolioContent),
	);
	if (!section) return null;

	let itemId: string | undefined;
	if (section.collection && typeof segments[1] === "number") {
		const row = getAt(content, [root, segments[1]]);
		if (hasId(row)) itemId = row.id;
	}

	const lastString = [...segments].reverse().find((seg): seg is string => typeof seg === "string");
	const fieldLabel = lastString ? humanizeKey(lastString) : section.label;

	return {
		sectionId: section.id as SectionId,
		sectionLabel: section.label,
		itemId,
		fieldLabel,
	};
}

/** Extract a safe media asset shape for thumbnail diff rendering. */
export function asMediaAsset(value: unknown): MediaAsset | null {
	const rec = asRecord(value);
	if (!rec || typeof rec.id !== "string" || !rec.id) return null;
	return {
		id: rec.id,
		key: typeof rec.key === "string" ? rec.key : "",
		alt: typeof rec.alt === "string" ? rec.alt : "",
		mimeType: typeof rec.mimeType === "string" ? rec.mimeType : undefined,
		width: typeof rec.width === "number" ? rec.width : undefined,
		height: typeof rec.height === "number" ? rec.height : undefined,
		bytes: typeof rec.bytes === "number" ? rec.bytes : undefined,
	};
}
