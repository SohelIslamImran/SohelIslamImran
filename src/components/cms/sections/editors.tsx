/**
 * Section id → editor component. `SiteEditor` is the reference for how an
 * editor composes fields; every other section follows the same pattern.
 */
import type { ComponentType } from "react";
import { TextAreaField, TextField } from "../fields";
import { EditorGroup, PendingEditor } from "./EditorLayout";
import type { SectionId } from "./registry";

function SiteEditor() {
	return (
		<>
			<EditorGroup
				title="Search and sharing"
				description="Shown in search results and link previews."
			>
				<TextField path="site.title" label="Site title" maxLength={160} />
				<TextAreaField
					path="site.description"
					label="Meta description"
					maxLength={320}
					description="One or two plain sentences about what you build. Keep the city out of it."
				/>
				<TextField
					path="site.url"
					label="Canonical URL"
					optional
					mono
					type="url"
					placeholder="https://sohelislamimran.com"
				/>
			</EditorGroup>
			<EditorGroup title="Document">
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField path="site.locale" label="Locale" mono maxLength={32} placeholder="en" />
					<TextField path="site.theme" label="Theme id" mono maxLength={64} placeholder="ink" />
				</div>
			</EditorGroup>
		</>
	);
}

export const SECTION_EDITORS: Record<SectionId, ComponentType> = {
	site: SiteEditor,
	identity: PendingEditor,
	hero: PendingEditor,
	about: PendingEditor,
	contact: PendingEditor,
	resume: PendingEditor,
	projects: PendingEditor,
	experience: PendingEditor,
	capabilities: PendingEditor,
	testimonials: PendingEditor,
	credentials: PendingEditor,
	writing: PendingEditor,
	story: PendingEditor,
	travel: PendingEditor,
	links: PendingEditor,
};
