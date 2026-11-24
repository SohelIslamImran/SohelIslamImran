import { useState, type ComponentType, type ReactNode } from "react";
import type { LinkContent, MetricContent } from "../../../types/content";
import { CheckboxField, SegmentedField } from "./ChoiceFields";
import { ExternalArrowIcon } from "../shell/cms-icons";
import { GlobeIcon, LinkIcon, MailIcon, PhoneIcon } from "./field-icons";
import { hrefKind } from "./field-logic";
import { ClearAction, InputAction } from "./InputShell";
import { focusField } from "./FieldFrame";
import { RepeaterField } from "./RepeaterField";
import { NumberField, TextField } from "./TextFields";
import { useDraftStore, useDraftValue } from "../draft/context";
import { editorButton } from "./UndoRemoval";

export function HrefField({
	path,
	label,
	optional,
	description,
}: {
	path: string;
	label: ReactNode;
	optional?: boolean;
	description?: string;
}) {
	const href = (useDraftValue<string | undefined>(path) ?? "").trim();
	const kind = hrefKind(href);
	return (
		<TextField
			path={path}
			label={label}
			optional={optional}
			required={!optional}
			maxLength={2_000}
			mono
			inputMode="url"
			leading={
				<span className="cms-href-icons" data-kind={kind === "empty" ? "path" : kind}>
					<GlobeIcon data-icon="web" />
					<LinkIcon data-icon="path" />
					<MailIcon data-icon="mail" />
					<PhoneIcon data-icon="tel" />
				</span>
			}
			trailing={
				kind === "web" && URL.canParse(href) ? (
					<InputAction href={href} label="Open link in a new tab">
						<ExternalArrowIcon />
					</InputAction>
				) : undefined
			}
			spellCheck={false}
			description={
				description ??
				"Use https://, a site path like /work, an anchor like #contact, mailto:, or tel:."
			}
		/>
	);
}

interface DateFieldProps {
	path: string;
	label: string;
	optional?: boolean;
}

export function DateField(props: DateFieldProps) {
	const value = useDraftValue<string | null | undefined>(props.path);
	const legacy = Boolean(value && !isIsoDate(value));
	const store = useDraftStore();
	const [calendarFor, setCalendarFor] = useState<string>();
	const editingLegacy = legacy && calendarFor === value;
	if (calendarFor !== undefined && calendarFor !== value) setCalendarFor(undefined);
	const { path, label, optional } = props;
	return (
		<div className="grid gap-2">
			<TextField
				path={path}
				label={label}
				type={legacy && !editingLegacy ? "text" : "date"}
				valueOverride={legacy && editingLegacy ? "" : undefined}
				maxLength={80}
				optional={optional}
				trailing={
					optional && value ? (
						<ClearAction
							label="Clear date"
							onClear={() => {
								store.update(path, undefined);
								setCalendarFor(undefined);
							}}
						/>
					) : undefined
				}
				description={
					legacy && !editingLegacy
						? "This saved date uses a different format. Keep it as written or choose a calendar date."
						: undefined
				}
			/>
			{legacy ? (
				<button
					type="button"
					className={`${editorButton} justify-self-start`}
					onClick={() => {
						setCalendarFor(editingLegacy ? undefined : (value ?? undefined));
						requestAnimationFrame(() => focusField(path));
					}}
				>
					{editingLegacy ? "Show saved date" : "Choose a calendar date"}
				</button>
			) : null}
		</div>
	);
}

function isIsoDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || value.startsWith("0000")) return false;
	const date = new Date(value);
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function CoordinateField({ path }: { path: string }) {
	return (
		<div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
			<NumberField
				path={`${path}.latitude`}
				label="Latitude"
				suffix="°"
				description="−90 to 90"
				min={-90}
				max={90}
			/>
			<NumberField
				path={`${path}.longitude`}
				label="Longitude"
				suffix="°"
				description="−180 to 180"
				min={-180}
				max={180}
			/>
		</div>
	);
}

export function LinkRow({ path }: { path: string }) {
	return (
		<>
			<TextField path={`${path}.label`} label="Label" maxLength={120} required />
			<HrefField path={`${path}.href`} label="Destination" />
			<CheckboxField path={`${path}.external`} label="External link" />
		</>
	);
}

export function MetricRow({ path, labelDescription }: { path: string; labelDescription?: string }) {
	return (
		<div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
			<TextField
				path={`${path}.label`}
				label="Label"
				description={labelDescription}
				maxLength={120}
				required
			/>
			<TextField path={`${path}.value`} label="Value" maxLength={240} />
		</div>
	);
}

export function LinksField({
	path,
	label,
	labelHidden,
	itemLabel = "Link",
}: {
	path: string;
	label: string;
	labelHidden?: boolean;
	itemLabel?: string;
}) {
	return (
		<RepeaterField<LinkContent>
			path={path}
			label={label}
			labelHidden={labelHidden}
			itemLabel={itemLabel}
			create={() => ({ label: "", href: "" })}
			summarize={(row) => row.label}
			Editor={LinkRow}
		/>
	);
}

export function MetricsField({
	path,
	label,
	labelHidden,
	itemLabel,
	Editor = MetricRow,
}: {
	path: string;
	label: string;
	labelHidden?: boolean;
	itemLabel: string;
	Editor?: ComponentType<{ path: string }>;
}) {
	return (
		<RepeaterField<MetricContent>
			path={path}
			label={label}
			labelHidden={labelHidden}
			itemLabel={itemLabel}
			create={() => ({ label: "", value: "" })}
			summarize={(row) => [row.label, row.value].filter(Boolean).join(" · ")}
			Editor={Editor}
		/>
	);
}

const VISIBILITY_OPTIONS = [
	{ value: "public", label: "Public", hint: "Visible on the public travel page." },
	{ value: "unlisted", label: "Unlisted", hint: "Hidden from public pages." },
	{ value: "private", label: "Private", hint: "Only visible in the CMS." },
] as const;

export function VisibilityField({ path }: { path: string }) {
	return <SegmentedField path={path} label="Visibility" options={VISIBILITY_OPTIONS} />;
}
