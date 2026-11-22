/**
 * Field labels keyed by content path, matching the section editors in
 * `src/components/cms/sections/*` word for word, so the Changes and History
 * diffs name a field exactly as the editor does ("Headline", not "Title").
 *
 * Paths use `[]` for any collection index (`projects[].cover`). The editors
 * still pass their own `label` props; they can import `fieldLabel` from here
 * later so both sides share one source.
 */
const LABELS: Record<string, string> = {
	// Site
	"site.title": "Site title",
	"site.description": "Meta description",
	"site.url": "Canonical URL",
	"site.locale": "Locale",
	"site.theme": "Theme ID",
	// Identity
	"identity.name": "Name",
	"identity.handle": "Handle",
	"identity.role": "Role",
	"identity.availability": "Availability",
	"identity.avatar": "Portrait",
	"identity.email": "Email",
	"identity.location": "Résumé location",
	"identity.timezone": "Time zone",
	// Home hero
	"hero.eyebrow": "Line above headline",
	"hero.title": "Headline",
	"hero.intro": "Introduction",
	"hero.actions": "Actions",
	"hero.metrics": "Metrics",
	// About
	"about.title": "Heading",
	"about.paragraphs": "Paragraphs",
	"about.facts": "Quick facts",
	// Contact
	"contact.title": "Heading",
	"contact.intro": "Introduction",
	"contact.email": "Email",
	"contact.responseTime": "Response time",
	"contact.links": "Links",
	// Résumé
	"resume.label": "Label",
	"resume.href": "Résumé link",
	"resume.summary": "Summary",
	"resume.updatedAt": "Last updated",
	// Story
	"story.eyebrow": "Line above heading",
	"story.title": "Heading",
	"story.intro": "Introduction",
	"story.quote": "Quote",
	"story.chapters": "Chapters",
	"story.sourceLabel": "Source label",
	"story.sourceHref": "Source link",
	"story.chapters[].eyebrow": "Line above heading",
	"story.chapters[].title": "Heading",
	"story.chapters[].paragraphs": "Paragraphs",
	"story.chapters[].artifact": "Artifact",
	// Projects
	projects: "Projects",
	"projects[].title": "Title",
	"projects[].slug": "Slug",
	"projects[].category": "Category",
	"projects[].featured": "Featured project",
	"projects[].summary": "Summary",
	"projects[].description": "Description",
	"projects[].year": "Year",
	"projects[].status": "Status",
	"projects[].role": "Role",
	"projects[].tags": "Tags",
	"projects[].highlights": "Highlights",
	"projects[].metrics": "Public metrics",
	"projects[].href": "Project link",
	"projects[].repository": "Repository link",
	"projects[].cover": "Cover image",
	// Experience
	experience: "Experience",
	"experience[].company": "Company",
	"experience[].role": "Role",
	"experience[].period": "Period",
	"experience[].location": "Location",
	"experience[].current": "Current role",
	"experience[].summary": "Summary",
	"experience[].highlights": "Highlights",
	"experience[].technologies": "Technologies",
	"experience[].href": "Company link",
	// Capabilities
	capabilities: "Capabilities",
	"capabilities[].title": "Title",
	"capabilities[].description": "Description",
	"capabilities[].tools": "Tools",
	// Testimonials
	testimonials: "Testimonials",
	"testimonials[].author": "Author",
	"testimonials[].role": "Author's role",
	"testimonials[].quote": "Quote",
	"testimonials[].date": "Date",
	"testimonials[].href": "Source link",
	// Credentials
	credentials: "Credentials",
	"credentials[].title": "Title",
	"credentials[].issuer": "Issuer",
	"credentials[].issuedAt": "Issue date",
	"credentials[].href": "Credential link",
	// Field notes
	writing: "Field notes",
	"writing[].title": "Title",
	"writing[].excerpt": "Excerpt",
	"writing[].publishedAt": "Publication date",
	"writing[].readingTime": "Reading time",
	"writing[].href": "Article link",
	"writing[].tags": "Tags",
	// Travel
	"travel.eyebrow": "Line above heading",
	"travel.title": "Heading",
	"travel.intro": "Introduction",
	"travel.origin": "Travel origin",
	"travel.entries": "Travel entries",
	"travel.entries[].place": "Place",
	"travel.entries[].region": "Region",
	"travel.entries[].season": "Season",
	"travel.entries[].visibility": "Visibility",
	"travel.entries[].summary": "Summary",
	"travel.entries[].reflection": "Reflection",
	"travel.entries[].latitude": "Latitude",
	"travel.entries[].longitude": "Longitude",
	"travel.entries[].mediaIds": "Photos",
	// Links
	profileLinks: "Profile links",
	"profileLinks[].label": "Label",
	"profileLinks[].platform": "Platform",
	"profileLinks[].handle": "Handle",
	"profileLinks[].href": "Destination",
	"profileLinks[].description": "Description",
	"profileLinks[].kind": "Kind",
	"profileLinks[].featured": "Featured link",
	social: "Social links",
	"social[].label": "Label",
	"social[].platform": "Platform",
	"social[].handle": "Handle",
	"social[].href": "Destination",
};

/** `projects[2].cover` → `projects[].cover`. */
export function labelPattern(path: string): string {
	return path.replace(/\[\d+\]/gu, "[]");
}

/** The editor's label for a content path, or `undefined` when the editors don't name it. */
export function fieldLabel(path: string): string | undefined {
	return LABELS[labelPattern(path)];
}
