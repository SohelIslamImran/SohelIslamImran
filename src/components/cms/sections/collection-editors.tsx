import { CopyAction } from "../fields/InputShell";
import { LayoutGroup, motion } from "motion/react";
import { useId } from "react";
import { useLiveReducedMotion } from "../shell/use-live-reduced-motion";
import { REDUCED, SPRING_MOVE } from "../motion";
import { Tabs } from "@base-ui/react/tabs";
import { categoryLabels } from "../../work/project-utils";
import type {
	CapabilityContent,
	CredentialContent,
	ExperienceContent,
	ProfileLinkContent,
	ProjectContent,
	SocialLinkContent,
	TestimonialContent,
	TravelEntryContent,
	WritingContent,
} from "../../../types/content";
import { PROJECT_CATEGORIES } from "../../../types/content";
import { useChangedAt, useDraftSelector, useDraftValue } from "../draft/context";
import { useSettledIssues } from "../draft/use-settled-issues";
import {
	CoordinateField,
	DateField,
	HrefField,
	MediaField,
	MediaIdsField,
	MetricRow,
	MetricsField,
	RepeaterField,
	SelectField,
	StringListField,
	SwitchField,
	TagsField,
	TextAreaField,
	TextField,
	VisibilityField,
} from "../fields";
import { CollectionEditor, type EditorProps } from "./CollectionEditor";
import { duplicateProject, uniqueProfileLinkSlug, uniqueProjectSlug } from "./collection-helpers";
import { EditorGroup } from "./EditorLayout";

const CATEGORY_COPY = {
	product: "Paid work on a product people use.",
	"open-source": "Published and maintained open-source work.",
	experiment: "A prototype or technical exploration.",
};
const CATEGORY_OPTIONS = PROJECT_CATEGORIES.map((value) => ({
	value,
	label: categoryLabels[value],
	hint: CATEGORY_COPY[value],
}));

function ProjectSlug({ path }: { path: string }) {
	const slugPath = `${path}.slug`;
	const slug = useDraftValue<string>(slugPath);
	const liveSlug = useDraftSelector(
		(state, store) => store.liveValueAt(slugPath, state) as string | undefined,
	);
	return (
		<div className="grid gap-1.5">
			<TextField
				path={slugPath}
				label="Slug"
				required
				mono
				spellCheck={false}
				maxLength={160}
				prefix="/work/"
				trailing={slug ? <CopyAction text={`/work/${slug}`} /> : undefined}
			/>
			{liveSlug && liveSlug !== slug ? (
				<p className="m-0 text-[13px] text-ink-soft">
					Publishing this slug will change the public URL. Existing links to{" "}
					<code className="wrap-anywhere">/work/{liveSlug}</code> may stop working.
				</p>
			) : null}
		</div>
	);
}

function ProjectMetricRow({ path }: { path: string }) {
	return <MetricRow path={path} labelDescription="Keep the measurement date in the label." />;
}

function ProjectFields({ path }: { path: string }) {
	return (
		<>
			<EditorGroup heading="h3" title="Basics">
				<TextAreaField singleLine path={`${path}.title`} label="Title" maxLength={240} required />
				<ProjectSlug path={path} />
				<SelectField path={`${path}.category`} label="Category" options={CATEGORY_OPTIONS} />
				<SwitchField path={`${path}.featured`} label="Featured project" />
			</EditorGroup>
			<EditorGroup heading="h3" title="Story">
				<TextAreaField path={`${path}.summary`} label="Summary" maxLength={600} />
				<TextAreaField path={`${path}.description`} label="Description" maxLength={2_000} />
				<StringListField
					path={`${path}.highlights`}
					label="Highlights"
					itemLabel="Highlight"
					addLabel="Add highlight"
					maxLength={600}
				/>
			</EditorGroup>
			<EditorGroup heading="h3" title="Details">
				<div className="cms-field-pair">
					<TextField path={`${path}.year`} label="Year" maxLength={32} />
					<TextField path={`${path}.status`} label="Status" maxLength={120} />
				</div>
				<TextAreaField singleLine path={`${path}.role`} label="Role" maxLength={240} />
				<TagsField path={`${path}.tags`} label="Tags" />
			</EditorGroup>
			<EditorGroup heading="h3" title="Measurements">
				<MetricsField
					path={`${path}.metrics`}
					label="Public metrics"
					itemLabel="Metric"
					Editor={ProjectMetricRow}
				/>
			</EditorGroup>
			<EditorGroup heading="h3" title="Links and media">
				<HrefField path={`${path}.href`} label="Project link" optional />
				<HrefField path={`${path}.repository`} label="Repository link" optional />
				<MediaField path={`${path}.cover`} label="Cover image" />
			</EditorGroup>
		</>
	);
}

export function ProjectsEditor(props: EditorProps) {
	return (
		<CollectionEditor<ProjectContent>
			{...props}
			path="projects"
			label="Projects"
			itemLabel="Project"
			nameLabel="Project title"
			nameLimit={240}
			orderNote="The work page groups projects by category and uses this order within each group."
			create={(title, id, rows) => ({
				id,
				title,
				slug: uniqueProjectSlug(
					title,
					rows.map((row) => row.slug),
				),
				summary: "",
				description: "",
				year: "",
				role: "",
				status: "",
				category: "product",
				tags: [],
				highlights: [],
			})}
			duplicate={duplicateProject}
			describe={(row) => ({
				title: row.title,
				subtitle: row.status,
				chips: [
					categoryLabels[row.category] ?? row.category,
					...(row.featured ? ["Featured"] : []),
				],
			})}
			Editor={ProjectFields}
		/>
	);
}

function ExperienceFields({ path }: { path: string }) {
	return (
		<>
			<EditorGroup heading="h3" title="Role details">
				<TextField
					path={`${path}.company`}
					label="Company"
					maxLength={240}
					autoCapitalize="words"
					spellCheck={false}
					required
				/>
				<TextAreaField singleLine path={`${path}.role`} label="Role" maxLength={240} required />
				<TextField path={`${path}.period`} label="Period" maxLength={120} />
				<TextField path={`${path}.location`} label="Location" maxLength={160} optional />
				<SwitchField path={`${path}.current`} label="Current role" />
				<HrefField path={`${path}.href`} label="Company link" optional />
			</EditorGroup>
			<EditorGroup heading="h3" title="Work and technologies">
				<TextAreaField path={`${path}.summary`} label="Summary" maxLength={1_200} />
				<StringListField
					path={`${path}.highlights`}
					label="Highlights"
					itemLabel="Highlight"
					addLabel="Add highlight"
					maxLength={600}
				/>
				<TagsField path={`${path}.technologies`} label="Technologies" />
			</EditorGroup>
		</>
	);
}

export function ExperienceEditor(props: EditorProps) {
	return (
		<CollectionEditor<ExperienceContent>
			{...props}
			path="experience"
			label="Experience"
			itemLabel="Role"
			nameLabel="Company name"
			nameLimit={240}
			create={(company, id) => ({
				id,
				company,
				role: "",
				period: "",
				summary: "",
				highlights: [],
				technologies: [],
			})}
			describe={(row) => ({
				title: row.company,
				subtitle: row.role,
				chips: row.current ? ["Current"] : [],
			})}
			Editor={ExperienceFields}
		/>
	);
}

function CapabilityFields({ path }: { path: string }) {
	return (
		<EditorGroup heading="h3" title="Capability details">
			<TextAreaField singleLine path={`${path}.title`} label="Title" maxLength={240} required />
			<TextAreaField path={`${path}.description`} label="Description" maxLength={1_200} />
			<TagsField path={`${path}.tools`} label="Tools" />
		</EditorGroup>
	);
}

export function CapabilitiesEditor(props: EditorProps) {
	return (
		<CollectionEditor<CapabilityContent>
			{...props}
			path="capabilities"
			label="Capabilities"
			itemLabel="Capability"
			nameLabel="Capability title"
			nameLimit={240}
			create={(title, id) => ({ id, title, description: "", tools: [] })}
			describe={(row) => ({ title: row.title })}
			Editor={CapabilityFields}
		/>
	);
}

function TestimonialFields({ path }: { path: string }) {
	return (
		<>
			<EditorGroup heading="h3" title="Attribution">
				<TextField path={`${path}.author`} label="Author" maxLength={160} required />
				<TextAreaField singleLine path={`${path}.role`} label="Author's role" maxLength={240} />
			</EditorGroup>
			<EditorGroup heading="h3" title="Testimonial">
				<TextAreaField path={`${path}.quote`} label="Quote" maxLength={1_200} required />
				<TextField
					path={`${path}.date`}
					label="Date"
					maxLength={80}
					optional
					placeholder="Nov 2022"
					description="Shown on the résumé exactly as written."
				/>
				<HrefField path={`${path}.href`} label="Source link" optional />
			</EditorGroup>
		</>
	);
}

export function TestimonialsEditor(props: EditorProps) {
	return (
		<CollectionEditor<TestimonialContent>
			{...props}
			path="testimonials"
			label="Testimonials"
			itemLabel="Testimonial"
			nameLabel="Author name"
			nameLimit={160}
			create={(author, id) => ({ id, author, role: "", quote: "" })}
			describe={(row) => ({ title: row.author, subtitle: row.role })}
			Editor={TestimonialFields}
		/>
	);
}

function CredentialFields({ path }: { path: string }) {
	return (
		<>
			<EditorGroup heading="h3" title="Credential details">
				<TextAreaField singleLine path={`${path}.title`} label="Title" maxLength={240} required />
				<TextField
					path={`${path}.issuer`}
					label="Issuer"
					maxLength={240}
					autoCapitalize="words"
					spellCheck={false}
					required
				/>
			</EditorGroup>
			<EditorGroup heading="h3" title="Verification">
				<TextField
					path={`${path}.issuedAt`}
					label="Issue date"
					maxLength={80}
					placeholder="Apr 2021"
					description="Shown on the résumé exactly as written."
				/>
				<HrefField path={`${path}.href`} label="Credential link" optional />
			</EditorGroup>
		</>
	);
}

export function CredentialsEditor(props: EditorProps) {
	return (
		<CollectionEditor<CredentialContent>
			{...props}
			path="credentials"
			label="Credentials"
			itemLabel="Credential"
			nameLabel="Credential title"
			nameLimit={240}
			create={(title, id) => ({ id, title, issuer: "", issuedAt: "" })}
			describe={(row) => ({ title: row.title, subtitle: row.issuer })}
			Editor={CredentialFields}
		/>
	);
}

function WritingFields({ path }: { path: string }) {
	return (
		<>
			<EditorGroup heading="h3" title="Article">
				<TextAreaField singleLine path={`${path}.title`} label="Title" maxLength={240} required />
				<TextAreaField path={`${path}.excerpt`} label="Excerpt" maxLength={1_200} />
			</EditorGroup>
			<EditorGroup heading="h3" title="Publication">
				<DateField path={`${path}.publishedAt`} label="Publication date" />
				<TextField
					path={`${path}.readingTime`}
					label="Reading time"
					placeholder="5 min read"
					maxLength={64}
					optional
				/>
				<HrefField path={`${path}.href`} label="Article link" />
				<TagsField path={`${path}.tags`} label="Tags" />
			</EditorGroup>
		</>
	);
}

export function WritingEditor(props: EditorProps) {
	return (
		<CollectionEditor<WritingContent>
			{...props}
			path="writing"
			label="Field notes"
			itemLabel="Note"
			nameLabel="Article title"
			nameLimit={240}
			create={(title, id) => ({ id, title, excerpt: "", publishedAt: "", href: "", tags: [] })}
			describe={(row) => ({ title: row.title, subtitle: row.publishedAt })}
			Editor={WritingFields}
		/>
	);
}

function TravelFields({ path }: { path: string }) {
	return (
		<>
			<EditorGroup heading="h3" title="Place and map">
				<TextField path={`${path}.place`} label="Place" maxLength={160} required />
				<TextField path={`${path}.region`} label="Region" maxLength={160} />
				<TextField path={`${path}.season`} label="Season" maxLength={120} />
				<CoordinateField path={path} />
				<VisibilityField path={`${path}.visibility`} />
			</EditorGroup>
			<EditorGroup heading="h3" title="Story and photos">
				<TextAreaField path={`${path}.summary`} label="Summary" maxLength={1_200} />
				<TextAreaField path={`${path}.reflection`} label="Reflection" maxLength={2_400} />
				<MediaIdsField path={`${path}.mediaIds`} />
			</EditorGroup>
		</>
	);
}

const VISIBILITY_LABELS = { public: "Public", unlisted: "Unlisted", private: "Private" };

export function TravelEditor(props: EditorProps) {
	return (
		<CollectionEditor<TravelEntryContent>
			{...props}
			path="travel.entries"
			listSettings={<TravelPageFields />}
			label="Travel entries"
			itemLabel="Entry"
			nameLabel="Place name"
			nameLimit={160}
			create={(place, id) => ({
				id,
				place,
				region: "",
				season: "",
				summary: "",
				reflection: "",
				visibility: "private",
				mediaIds: [],
			})}
			describe={(row) => ({
				title: row.place,
				subtitle: row.region,
				chips: [VISIBILITY_LABELS[row.visibility]],
			})}
			Editor={TravelFields}
		/>
	);
}

function TravelPageFields() {
	return (
		<EditorGroup title="Travel page">
			<TextAreaField singleLine path="travel.eyebrow" label="Line above heading" maxLength={160} />
			<TextAreaField singleLine path="travel.title" label="Heading" maxLength={240} required />
			<TextAreaField path="travel.intro" label="Introduction" maxLength={1_200} />
			<TextField path="travel.origin" label="Travel origin" maxLength={160} />
		</EditorGroup>
	);
}

const PROFILE_KINDS = [
	{ value: "social", label: "Social" },
	{ value: "contact", label: "Contact" },
	{ value: "story", label: "Story" },
	{ value: "work", label: "Work" },
	{ value: "other", label: "Other" },
] as const;

function SocialFields({ path, profile = false }: { path: string; profile?: boolean }) {
	return (
		<div className="grid gap-5">
			<TextField path={`${path}.label`} label="Label" maxLength={profile ? 240 : 160} required />
			<TextField path={`${path}.platform`} label="Platform" maxLength={80} required />
			<TextField
				path={`${path}.handle`}
				label="Handle"
				maxLength={160}
				spellCheck={false}
				optional
			/>
			<HrefField
				path={`${path}.href`}
				label="Destination"
				description={
					profile ? "Use https://, a site path like /work, mailto:, or tel:." : undefined
				}
			/>
		</div>
	);
}

function ProfileLinkFields({ path }: { path: string }) {
	return (
		<>
			<EditorGroup heading="h3" title="Link details">
				<SocialFields path={path} profile />
				<TextAreaField path={`${path}.description`} label="Description" maxLength={600} optional />
			</EditorGroup>
			<EditorGroup heading="h3" title="Placement">
				<SelectField path={`${path}.kind`} label="Kind" options={PROFILE_KINDS} optional />
				<SwitchField path={`${path}.featured`} label="Featured link" />
			</EditorGroup>
		</>
	);
}

export function LinksEditor(props: EditorProps) {
	const tab = props.tab ?? "profile";
	const groupId = useId();
	const reduced = useLiveReducedMotion();
	const profileChanged = useChangedAt("profileLinks");
	const socialChanged = useChangedAt("social");
	const settled = useSettledIssues();
	const profileErrors = settled.under("profileLinks").length > 0;
	const socialErrors = settled.under("social").length > 0;
	const tabItems = [
		{
			value: "profile" as const,
			label: "Profile links",
			changed: profileChanged,
			hasErrors: profileErrors,
		},
		{
			value: "social" as const,
			label: "Social",
			changed: socialChanged,
			hasErrors: socialErrors,
		},
	];
	return (
		<Tabs.Root
			value={tab}
			onValueChange={(tab) =>
				void props.select(undefined, tab === "social" ? "social" : undefined, true)
			}
			className="grid min-w-0 gap-4"
		>
			<LayoutGroup id={groupId}>
				<Tabs.List aria-label="Link editors" className="cms-segments flex justify-self-start">
					{tabItems.map((entry) => (
						<Tabs.Tab key={entry.value} value={entry.value} className="cms-segment cms-press">
							{tab === entry.value ? (
								<motion.span
									aria-hidden="true"
									className="cms-choice-highlight"
									layoutId={reduced ? undefined : "tab"}
									transition={reduced ? REDUCED : SPRING_MOVE}
								/>
							) : null}
							<span>{entry.label}</span>
							{entry.changed ? (
								<span className="cms-tab-mark cms-tab-mark-changed">
									<span aria-hidden="true">Δ</span>
									<span className="sr-only"> has changes</span>
								</span>
							) : null}
							{entry.hasErrors ? (
								<span className="cms-tab-mark cms-tab-mark-error">
									<span aria-hidden="true">!</span>
									<span className="sr-only"> has errors</span>
								</span>
							) : null}
						</Tabs.Tab>
					))}
				</Tabs.List>
			</LayoutGroup>
			<Tabs.Panel value="profile" className="cms-enter min-w-0">
				<CollectionEditor<ProfileLinkContent>
					{...props}
					path="profileLinks"
					label="Profile links"
					itemLabel="Link"
					nameLabel="Link label"
					nameLimit={240}
					create={(label, _id, rows) => ({
						id: uniqueProfileLinkSlug(label, rows),
						label,
						platform: "",
						href: "",
					})}
					duplicate={(row, rows) => ({
						...row,
						id: uniqueProfileLinkSlug(`${row.id}-copy`, rows),
						label: row.label.slice(0, 233) + " (copy)",
					})}
					describe={(row) => ({
						title: row.label,
						subtitle: row.platform,
						chips: [
							...(row.kind
								? [PROFILE_KINDS.find((entry) => entry.value === row.kind)?.label ?? row.kind]
								: []),
							...(row.featured ? ["Featured"] : []),
						],
					})}
					Editor={ProfileLinkFields}
				/>
			</Tabs.Panel>
			<Tabs.Panel value="social" className="cms-enter min-w-0">
				<EditorGroup title="Résumé social links">
					<RepeaterField<SocialLinkContent>
						path="social"
						targetPath={props.field}
						summaryClassName="max-sm:truncate"
						label="Social links"
						labelHidden
						itemLabel="Social link"
						create={() => ({ label: "", platform: "", href: "" })}
						summarize={(row) => [row.platform, row.label].filter(Boolean).join(" · ")}
						Editor={SocialFields}
					/>
				</EditorGroup>
			</Tabs.Panel>
		</Tabs.Root>
	);
}
