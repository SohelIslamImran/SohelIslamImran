/**
 * Content paths in the validator's format: `projects[2].metrics[0].label`.
 * Field components, validation issues, and change marks all key off the same
 * string, so an error from `validatePortfolioContent` lands on its control.
 */
import type { ValidationIssue } from "../../../lib/validation";

export type PathSegment = string | number;

const SEGMENT = /([^.[\]]+)|\[(\d+)\]/gu;

export function parsePath(path: string): PathSegment[] {
	if (path === "" || path === "$") return [];
	const segments: PathSegment[] = [];
	for (const match of path.matchAll(SEGMENT)) {
		if (match[2] !== undefined) segments.push(Number(match[2]));
		else if (match[1] !== undefined && match[1] !== "$") segments.push(match[1]);
	}
	return segments;
}

export function formatPath(segments: readonly PathSegment[]): string {
	let out = "";
	for (const segment of segments) {
		if (typeof segment === "number") out += `[${segment}]`;
		else out += out === "" ? segment : `.${segment}`;
	}
	return out;
}

/** Join a base path and a child key or index. */
export function childPath(base: string, child: PathSegment): string {
	if (typeof child === "number") return `${base}[${child}]`;
	return base === "" ? child : `${base}.${child}`;
}

export function getAt(root: unknown, path: string | readonly PathSegment[]): unknown {
	const segments = typeof path === "string" ? parsePath(path) : path;
	let current: unknown = root;
	for (const segment of segments) {
		if (current === null || typeof current !== "object") return undefined;
		current = (current as Record<string | number, unknown>)[segment];
	}
	return current;
}

/**
 * Immutable set. Copies each container on the way down so unchanged branches
 * keep their identity, which lets field subscriptions skip re-rendering.
 * `undefined` deletes an object key (optional fields stay absent, not null).
 */
export function setAt<T>(root: T, path: string | readonly PathSegment[], value: unknown): T {
	const segments = typeof path === "string" ? parsePath(path) : path;
	if (segments.length === 0) return value as T;
	const [head, ...rest] = segments as [PathSegment, ...PathSegment[]];
	const container = (root ?? (typeof head === "number" ? [] : {})) as
		| Record<string, unknown>
		| unknown[];
	const currentChild = (container as Record<string | number, unknown>)[head];
	const nextChild = rest.length === 0 ? value : setAt(currentChild, rest, value);
	if (Object.is(currentChild, nextChild) && (nextChild !== undefined || !(head in container))) {
		return root;
	}
	if (Array.isArray(container)) {
		const copy = container.slice();
		copy[head as number] = nextChild;
		return copy as T;
	}
	const copy: Record<string, unknown> = { ...container };
	if (nextChild === undefined) delete copy[head as string];
	else copy[head as string] = nextChild;
	return copy as T;
}

export function updateAt<T, V>(
	root: T,
	path: string | readonly PathSegment[],
	update: (current: V) => V,
): T {
	return setAt(root, path, update(getAt(root, path) as V));
}

/** Array helpers that return new arrays. */
export function insertItem<V>(list: readonly V[], index: number, item: V): V[] {
	const copy = list.slice();
	copy.splice(Math.max(0, Math.min(index, copy.length)), 0, item);
	return copy;
}

export function removeItem<V>(list: readonly V[], index: number): V[] {
	return list.filter((_, position) => position !== index);
}

export function moveItem<V>(list: readonly V[], from: number, to: number): V[] {
	if (from === to || from < 0 || from >= list.length) return list.slice();
	const copy = list.slice();
	const [item] = copy.splice(from, 1);
	copy.splice(Math.max(0, Math.min(to, copy.length)), 0, item as V);
	return copy;
}

function hasId(value: unknown): value is { id: string } {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof (value as { id?: unknown }).id === "string" &&
		(value as { id: string }).id !== ""
	);
}

/**
 * Map a draft path to the matching path in another document (usually the
 * published one). Rows that carry an `id` are matched by id, so reordering a
 * collection does not mark every row as changed. Returns `null` when a row
 * with that id does not exist on the other side (a new row).
 */
export function correspondingPath(
	draft: unknown,
	other: unknown,
	path: string | readonly PathSegment[],
): PathSegment[] | null {
	const segments = typeof path === "string" ? parsePath(path) : path;
	const out: PathSegment[] = [];
	let draftNode: unknown = draft;
	let otherNode: unknown = other;
	for (const segment of segments) {
		if (typeof segment === "number" && Array.isArray(draftNode)) {
			const row = draftNode[segment];
			if (hasId(row) && Array.isArray(otherNode)) {
				const index = otherNode.findIndex(
					(candidate) => hasId(candidate) && candidate.id === row.id,
				);
				if (index === -1) return null;
				out.push(index);
				draftNode = row;
				otherNode = otherNode[index];
				continue;
			}
		}
		out.push(segment);
		draftNode = getAt(draftNode, [segment]);
		otherNode = getAt(otherNode, [segment]);
	}
	return out;
}

/** Structural equality for JSON-shaped content. */
export function jsonEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
		// Treat a missing optional string and an empty one as the same value.
		return (a ?? "") === (b ?? "");
	}
	if (Array.isArray(a) !== Array.isArray(b)) return false;
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((item, index) => jsonEqual(item, b[index]));
	}
	const left = a as Record<string, unknown>;
	const right = b as Record<string, unknown>;
	const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
	for (const key of keys) if (!jsonEqual(left[key], right[key])) return false;
	return true;
}

/** True when `path` is `prefix` or a descendant of it, by parsed segments. */
export function isPathWithin(path: string, prefix: string): boolean {
	const target = parsePath(prefix);
	const candidate = parsePath(path);
	if (candidate.length < target.length) return false;
	return target.every((segment, index) => candidate[index] === segment);
}

export interface IssueIndex {
	readonly all: readonly ValidationIssue[];
	/** Issues whose path is exactly this one. Stable array identity per index. */
	at(path: string): readonly ValidationIssue[];
	/** Issues at this path or under it. Stable array identity per index. */
	under(path: string): readonly ValidationIssue[];
}

const NO_ISSUES: readonly ValidationIssue[] = Object.freeze([]);

export function indexIssues(issues: readonly ValidationIssue[]): IssueIndex {
	const exact = new Map<string, ValidationIssue[]>();
	for (const issue of issues) {
		const key = formatPath(parsePath(issue.path));
		const list = exact.get(key);
		if (list) list.push(issue);
		else exact.set(key, [issue]);
	}
	const underCache = new Map<string, readonly ValidationIssue[]>();
	return {
		all: issues,
		at: (path) => exact.get(formatPath(parsePath(path))) ?? NO_ISSUES,
		under: (path) => {
			const key = formatPath(parsePath(path));
			const cached = underCache.get(key);
			if (cached) return cached;
			const found = issues.filter((issue) => isPathWithin(issue.path, key));
			const result = found.length ? found : NO_ISSUES;
			underCache.set(key, result);
			return result;
		},
	};
}
