import type { ComponentType } from "react";
import type { EditorProps } from "./CollectionEditor";
import {
	CapabilitiesEditor,
	CredentialsEditor,
	ExperienceEditor,
	LinksEditor,
	ProjectsEditor,
	TestimonialsEditor,
	TravelEditor,
	WritingEditor,
} from "./collection-editors";
import {
	AboutEditor,
	ContactEditor,
	HeroEditor,
	IdentityEditor,
	ResumeEditor,
	SiteEditor,
	StoryEditor,
} from "./object-editors";
import type { SectionId } from "./registry";

export const SECTION_EDITORS: Record<SectionId, ComponentType<EditorProps>> = {
	site: SiteEditor,
	identity: IdentityEditor,
	hero: HeroEditor,
	about: AboutEditor,
	contact: ContactEditor,
	resume: ResumeEditor,
	projects: ProjectsEditor,
	experience: ExperienceEditor,
	capabilities: CapabilitiesEditor,
	testimonials: TestimonialsEditor,
	credentials: CredentialsEditor,
	writing: WritingEditor,
	story: StoryEditor,
	travel: TravelEditor,
	links: LinksEditor,
};
