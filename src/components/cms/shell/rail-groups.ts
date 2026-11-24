import { SECTIONS, type SectionGroup } from "../sections/registry";

export type FoldableGroup = Exclude<SectionGroup, "links">;

export function isFoldableGroup(group: SectionGroup): group is FoldableGroup {
	return group !== "links";
}

export function initialOpenGroups(pathname: string): ReadonlySet<FoldableGroup> {
	const sectionId = /^(?:\/cms)?\/content\/([^/]+)\/?$/u.exec(pathname)?.[1];
	const group = SECTIONS.find((section) => section.id === sectionId)?.group;
	return new Set(group && isFoldableGroup(group) ? [group] : []);
}
