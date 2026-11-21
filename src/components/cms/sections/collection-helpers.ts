import { getAt, parsePath } from "../draft/paths";
import { duplicateRow, rowId } from "../fields/row-list";

const SLUG_LIMIT = 160;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function slugIssue(
	slug: string,
	rows: readonly { id: string; slug: string }[],
	id: string,
): string | undefined {
	if (!slug.trim()) return undefined; // The document validator reports blank slugs.
	if (
		rows.some((row) => row.id !== id && row.slug.trim().toLowerCase() === slug.trim().toLowerCase())
	) {
		return "Another project already uses this slug.";
	}
	if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters, numbers, and single hyphens.";
	return undefined;
}

export function uniqueProjectSlug(title: string, existing: readonly string[]): string {
	const taken = new Set(existing.map((slug) => slug.trim().toLowerCase()));
	const base =
		title
			.normalize("NFKD")
			.replace(/\p{Mark}/gu, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/gu, "-")
			.replace(/^-|-$/gu, "") || "project";
	let slug = base.slice(0, SLUG_LIMIT).replace(/-$/u, "");
	for (let n = 2; taken.has(slug); n++) {
		const suffix = `-${n}`;
		slug = base.slice(0, SLUG_LIMIT - suffix.length).replace(/-$/u, "") + suffix;
	}
	return slug;
}

export function duplicateProject<T extends { id: string; title: string; slug: string }>(
	row: T,
	rows: readonly T[],
): T {
	const suffix = " (copy)";
	const title = row.title.slice(0, 240 - suffix.length) + suffix;
	return {
		...duplicateRow(row),
		title,
		slug: uniqueProjectSlug(
			`${row.slug}-copy`,
			rows.map((entry) => entry.slug),
		),
	};
}

export function itemForIssue(
	draft: unknown,
	collectionPath: string,
	issuePath: string,
): string | undefined {
	const collection = parsePath(collectionPath);
	const issue = parsePath(issuePath);
	if (!collection.every((segment, index) => segment === issue[index])) return undefined;
	const index = issue[collection.length];
	if (typeof index !== "number") return undefined;
	return rowId(getAt(draft, [...collection, index]));
}
