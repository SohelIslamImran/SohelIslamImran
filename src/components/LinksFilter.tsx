import { FilterStrip } from "./FilterStrip";

export const linkKinds = ["all", "social", "contact", "work", "story", "other"] as const;
export type LinkKind = (typeof linkKinds)[number];

export const linkKindLabels: Record<LinkKind, string> = {
	all: "All links",
	social: "Social",
	contact: "Contact",
	work: "Work",
	story: "Story",
	other: "Other",
};

export function LinksFilter({
	value,
	onChange,
}: {
	value: LinkKind;
	onChange: (value: LinkKind) => void;
}) {
	return (
		<FilterStrip
			className="mb-6 w-full max-w-[560px]"
			labelId="links-filter-label"
			hintId="links-filter-hint"
			label="Filter links by category"
			options={linkKinds}
			labels={linkKindLabels}
			value={value}
			onChange={onChange}
			resultsId="link-results"
		/>
	);
}
