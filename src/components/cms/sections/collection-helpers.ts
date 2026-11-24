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

/** Labels the editors show, keyed by path with indexes written as `[]`. */
const FIELD_LABELS: Record<string, string> = {
	"site.title": "Site title",
	"site.description": "Meta description",
	"site.url": "Canonical URL",
	"site.theme": "Theme ID",
	"identity.location": "Résumé location",
	"identity.timezone": "Time zone",
	"identity.avatar": "Portrait",
	"identity.avatar.alt": "Portrait alt text",
	"hero.eyebrow": "Line above headline",
	"hero.title": "Headline",
	"about.title": "Heading",
	"about.facts": "Quick facts",
	"contact.title": "Heading",
	"resume.href": "Résumé link",
	"resume.updatedAt": "Last updated",
	"story.eyebrow": "Line above heading",
	"story.title": "Heading",
	"story.chapters[].eyebrow": "Line above heading",
	"story.chapters[].title": "Heading",
	"story.sourceHref": "Source link",
	"travel.eyebrow": "Line above heading",
	"travel.title": "Heading",
	"travel.origin": "Travel origin",
	"travel.entries": "Travel entries",
	"media[].alt": "Photo alt text",
	"projects[].href": "Project link",
	"projects[].cover": "Cover image",
	"projects[].metrics": "Public metrics",
	"experience[].href": "Company link",
	"testimonials[].role": "Author's role",
	"testimonials[].href": "Source link",
	"credentials[].href": "Credential link",
	"writing[].href": "Article link",
	"profileLinks[].href": "Destination",
	"profileLinks[].id": "Public link slug",
	"social[].href": "Destination",
};

const KEY_LABELS: Record<string, string> = {
	alt: "Alt text",
	href: "Link",
	id: "ID",
	issuedAt: "Issue date",
	mediaIds: "Photos",
	publishedAt: "Publication date",
	repository: "Repository link",
	external: "External link",
	url: "URL",
};

const ROW_NAME_KEYS = ["title", "label", "company", "author", "place", "platform", "name"];

function humanize(key: string): string {
	const words = key.replace(/([a-z0-9])([A-Z])/gu, "$1 $2").toLowerCase();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

function rowName(row: unknown): string | undefined {
	if (!row || typeof row !== "object") return undefined;
	for (const key of ROW_NAME_KEYS) {
		const value = (row as Record<string, unknown>)[key];
		if (typeof value === "string" && value.trim()) {
			const name = value.trim();
			return name.length > 40 ? `${name.slice(0, 39)}…` : name;
		}
	}
	return undefined;
}

/**
 * A readable name for the field at a validation path, as the editor labels
 * it: "Headline", "Actions › Email me › Label", "Kuno › Title". The section
 * itself (the first segment) is left out because the summary sits on that
 * section's page.
 */
export function issueLabel(draft: unknown, path: string): string {
	const segments = parsePath(path);
	const key = (end: number) =>
		segments
			.slice(0, end)
			.map((segment, index) =>
				typeof segment === "number" ? "[]" : index === 0 ? segment : `.${segment}`,
			)
			.join("");
	const exact = FIELD_LABELS[key(segments.length)];
	if (exact) return exact;
	const parts: string[] = [];
	for (let index = 1; index < segments.length; index++) {
		const segment = segments[index]!;
		const prefix = key(index + 1);
		if (typeof segment === "number") {
			const row = getAt(draft, segments.slice(0, index + 1));
			parts.push(rowName(row) ?? `Item ${segment + 1}`);
		} else parts.push(FIELD_LABELS[prefix] ?? KEY_LABELS[segment] ?? humanize(segment));
	}
	if (typeof segments[0] === "string" && typeof segments[1] === "number") {
		// A top-level collection: the row name already says where it is.
		return parts.join(" › ");
	}
	return parts.join(" › ") || humanize(String(segments[0] ?? ""));
}

/** Pluralize a singular title-case item label ("project" / "projects", "entry" / "entries"). */
export function countNoun(count: number, itemLabel: string): string {
	const noun = itemLabel.toLowerCase();
	if (count === 1) return noun;
	return /[^aeiou]y$/u.test(noun) ? `${noun.slice(0, -1)}ies` : `${noun}s`;
}

/** "8 projects", "1 entry": the item label is singular title case. */
export function countLabel(count: number, itemLabel: string): string {
	return `${count} ${countNoun(count, itemLabel)}`;
}
