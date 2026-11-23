import { linkableProjects, projectSlug } from "../work/project-utils";
import type { ProjectContent } from "../../types/content";

export interface PaletteProjectItem {
	id: string;
	slug: string;
	target: string;
	label: string;
	detail?: string;
	keywords: string;
}

/**
 * Maps published projects into command-palette entries using the same rules as
 * `/work` and `/work/$slug` (trimmed slug, non-blank title, deduplicated slug).
 */
export function paletteProjects(
	projects: readonly ProjectContent[] | null | undefined,
): PaletteProjectItem[] {
	if (!projects?.length) return [];
	return linkableProjects(projects).map((project) => {
		const slug = projectSlug(project);
		return {
			id: `project-${project.id}`,
			slug,
			target: `/work/${encodeURIComponent(slug)}`,
			label: project.title.trim(),
			detail: project.summary.trim() || undefined,
			keywords: [project.category, project.year, project.role, ...project.tags].join(" "),
		};
	});
}
