import {
	HrefField,
	DateField,
	LinksField,
	MediaField,
	MetricsField,
	RepeaterField,
	StringListField,
	TextAreaField,
	TextField,
	fieldId,
} from "../fields";
import { useDraftValue } from "../draft/context";
import { newRowId } from "../fields/row-list";
import type { StoryChapterContent } from "../../../types/content";
import { SuggestionField } from "../fields/ChoiceFields";
import { EditorGroup } from "./EditorLayout";

export function SiteEditor() {
	return (
		<>
			<EditorGroup
				title="Search and sharing"
				description="Shown in search results and link previews."
			>
				<TextAreaField singleLine path="site.title" label="Site title" maxLength={160} required />
				<TextAreaField
					path="site.description"
					label="Meta description"
					maxLength={320}
					description="One or two sentences about what you build."
				/>
				<HrefField
					path="site.url"
					label="Canonical URL"
					optional
					description="Use the full public address, starting with https://."
				/>
			</EditorGroup>
			<EditorGroup title="Document">
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						path="site.locale"
						label="Locale"
						mono
						maxLength={32}
						placeholder="en"
						required
					/>
					<TextField
						path="site.theme"
						label="Theme ID"
						mono
						maxLength={64}
						placeholder="ink"
						required
					/>
				</div>
			</EditorGroup>
		</>
	);
}

const TIME_ZONES = ["UTC", ...Intl.supportedValuesOf("timeZone")];

export function IdentityEditor() {
	return (
		<>
			<EditorGroup title="Profile">
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField path="identity.name" label="Name" maxLength={160} required />
					<TextField path="identity.handle" label="Handle" maxLength={160} mono required />
				</div>
				<TextAreaField singleLine path="identity.role" label="Role" maxLength={240} />
				<TextAreaField
					singleLine
					path="identity.availability"
					label="Availability"
					maxLength={240}
				/>
				<MediaField path="identity.avatar" label="Portrait" />
			</EditorGroup>
			<EditorGroup title="Contact details">
				<TextField path="identity.email" label="Email" type="email" maxLength={320} required />
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField path="identity.location" label="Résumé location" maxLength={160} />
					<SuggestionField
						path="identity.timezone"
						label="Time zone"
						items={TIME_ZONES}
						emptyMessage="No matching time zone."
						description="Use an IANA time zone ID, such as Asia/Dhaka."
					/>
				</div>
			</EditorGroup>
		</>
	);
}

export function HeroEditor() {
	return (
		<>
			<EditorGroup title="Opening copy">
				<TextAreaField singleLine path="hero.eyebrow" label="Line above headline" maxLength={160} />
				<TextAreaField singleLine path="hero.title" label="Headline" maxLength={240} required />
				<TextAreaField path="hero.intro" label="Introduction" maxLength={1_200} />
			</EditorGroup>
			<EditorGroup title="Actions and metrics">
				<LinksField path="hero.actions" label="Actions" itemLabel="Action" />
				<MetricsField path="hero.metrics" label="Metrics" itemLabel="Metric" />
			</EditorGroup>
		</>
	);
}

export function AboutEditor() {
	return (
		<>
			<EditorGroup title="About copy">
				<TextAreaField singleLine path="about.title" label="Heading" maxLength={240} />
				<StringListField
					path="about.paragraphs"
					label="Paragraphs"
					itemLabel="Paragraph"
					addLabel="Add paragraph"
					max={20}
					maxLength={2_000}
					multiline
				/>
			</EditorGroup>
			<EditorGroup title="At a glance">
				<MetricsField path="about.facts" label="Quick facts" itemLabel="Fact" />
			</EditorGroup>
		</>
	);
}

export function ContactEditor() {
	return (
		<>
			<EditorGroup title="Contact copy">
				<TextAreaField singleLine path="contact.title" label="Heading" maxLength={240} />
				<TextAreaField path="contact.intro" label="Introduction" maxLength={1_200} />
				<TextField path="contact.email" label="Email" type="email" maxLength={320} required />
				<TextField path="contact.responseTime" label="Response time" maxLength={160} optional />
			</EditorGroup>
			<EditorGroup title="Contact options">
				<LinksField path="contact.links" label="Links" />
			</EditorGroup>
		</>
	);
}

export function ResumeEditor() {
	return (
		<EditorGroup title="Résumé details">
			<TextField path="resume.label" label="Label" maxLength={120} required />
			<HrefField path="resume.href" label="Résumé link" />
			<TextAreaField path="resume.summary" label="Summary" maxLength={1_200} optional />
			<DateField path="resume.updatedAt" label="Last updated" optional />
		</EditorGroup>
	);
}

function ChapterFields({ path }: { path: string }) {
	const id = useDraftValue<string>(`${path}.id`);
	return (
		<>
			<TextAreaField
				singleLine
				path={`${path}.eyebrow`}
				label="Line above heading"
				maxLength={160}
			/>
			<TextAreaField singleLine path={`${path}.title`} label="Heading" maxLength={240} required />
			<StringListField
				path={`${path}.paragraphs`}
				label="Paragraphs"
				itemLabel="Paragraph"
				addLabel="Add paragraph"
				max={20}
				maxLength={4_000}
				multiline
			/>
			<TextAreaField path={`${path}.artifact`} label="Artifact" maxLength={500} optional />
			<p
				id={fieldId(`${path}.id`)}
				tabIndex={-1}
				className="m-0 wrap-anywhere rounded-sm font-mono text-xs text-muted-foreground"
			>
				Chapter ID · {id}
			</p>
		</>
	);
}

export function StoryEditor() {
	return (
		<>
			<EditorGroup title="Opening copy">
				<TextAreaField singleLine path="story.eyebrow" label="Line above heading" maxLength={160} />
				<TextAreaField singleLine path="story.title" label="Heading" maxLength={240} required />
				<TextAreaField path="story.intro" label="Introduction" maxLength={1_200} />
				<TextAreaField path="story.quote" label="Quote" maxLength={800} />
			</EditorGroup>
			<EditorGroup title="Story chapters">
				<RepeaterField<StoryChapterContent>
					path="story.chapters"
					max={30}
					label="Chapters"
					itemLabel="Chapter"
					create={() => ({ id: newRowId(), eyebrow: "", title: "", paragraphs: [] })}
					summarize={(row) => row.title}
					Editor={ChapterFields}
				/>
			</EditorGroup>
			<EditorGroup title="Source">
				<TextField path="story.sourceLabel" label="Source label" maxLength={160} />
				<HrefField path="story.sourceHref" label="Source link" />
			</EditorGroup>
		</>
	);
}
