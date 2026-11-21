import { getAt, parsePath } from "../draft/paths";
import { duplicateRow, rowId } from "../fields/row-list";

export function uniqueSlug(
	title: string,
	existing: readonly string[],
	limit: number,
	fallback: string,
): string {
	const taken = new Set(existing.map((slug) => slug.trim().toLowerCase()));
	const base =
		title
			.normalize("NFKD")
			.replace(/\p{Mark}/gu, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/gu, "-")
			.replace(/^-|-$/gu, "") || fallback;
	let slug = base.slice(0, limit).replace(/-$/u, "");
	for (let n = 2; taken.has(slug); n++) {
		const suffix = `-${n}`;
		slug = base.slice(0, limit - suffix.length).replace(/-$/u, "") + suffix;
	}
	return slug;
}

export function uniqueProjectSlug(title: string, existing: readonly string[]): string {
	return uniqueSlug(title, existing, 160, "project");
}

export function uniqueProfileLinkSlug(label: string, rows: readonly { id: string }[]): string {
	return uniqueSlug(
		label,
		rows.map(({ id }) => id),
		80,
		"link",
	);
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
