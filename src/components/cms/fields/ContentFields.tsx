import { useState, type ReactNode } from "react";
import type { LinkContent, MetricContent } from "../../../types/content";
import { SelectField, SwitchField } from "./ChoiceFields";
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
	return (
		<TextField
			path={path}
			label={label}
			optional={optional}
			required={!optional}
			maxLength={2_000}
			mono
			spellCheck={false}
			description={
				description ??
				"Use https://, a site path like /work, an anchor like #contact, mailto:, or tel:."
			}
		/>
	);
}

export function DateField({
	path,
	label,
	optional,
}: {
	path: string;
	label: string;
	optional?: boolean;
}) {
	const store = useDraftStore();
	const value = useDraftValue<string | null | undefined>(path);
	const legacy = Boolean(value && !isIsoDate(value));
	const [editingLegacy, setEditingLegacy] = useState(false);
	return (
		<div className="grid gap-2">
			<TextField
				path={path}
				label={label}
				type={legacy && !editingLegacy ? "text" : "date"}
				valueOverride={legacy && editingLegacy ? "" : undefined}
				maxLength={80}
				optional={optional}
				mono
				description={
					legacy && !editingLegacy
						? "This saved date uses a different format. Keep it as written or choose a calendar date."
						: undefined
				}
			/>
			{legacy || (optional && value) ? (
				<div className="flex flex-wrap gap-2">
					{legacy ? (
						<button
							type="button"
							className={editorButton}
							onClick={() => {
								setEditingLegacy(!editingLegacy);
								requestAnimationFrame(() => focusField(path));
							}}
						>
							{editingLegacy ? "Show saved date" : "Choose a calendar date"}
						</button>
					) : null}
					{optional && value ? (
						<button
							type="button"
							className={editorButton}
							onClick={() => {
								store.update(path, undefined);
								setEditingLegacy(false);
								requestAnimationFrame(() => focusField(path));
							}}
						>
							Clear date
						</button>
					) : null}
				</div>
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
		<div className="grid gap-4 sm:grid-cols-2">
			<NumberField
				path={`${path}.latitude`}
				label="Latitude"
				description="−90 to 90"
				min={-90}
				max={90}
			/>
			<NumberField
				path={`${path}.longitude`}
				label="Longitude"
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
			<SwitchField path={`${path}.external`} label="External link" />
		</>
	);
}

export function MetricRow({ path }: { path: string }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<TextField path={`${path}.label`} label="Label" maxLength={120} required />
			<TextField path={`${path}.value`} label="Value" maxLength={240} />
		</div>
	);
}

export function LinksField({
	path,
	label,
	itemLabel = "Link",
}: {
	path: string;
	label: string;
	itemLabel?: string;
}) {
	return (
		<RepeaterField<LinkContent>
			path={path}
			label={label}
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
	itemLabel,
	description,
}: {
	path: string;
	label: string;
	itemLabel: string;
	description?: string;
}) {
	return (
		<RepeaterField<MetricContent>
			path={path}
			label={label}
			itemLabel={itemLabel}
			description={description}
			create={() => ({ label: "", value: "" })}
			summarize={(row) => [row.label, row.value].filter(Boolean).join(" · ")}
			Editor={MetricRow}
		/>
	);
}

const VISIBILITY_OPTIONS = [
	{ value: "public", label: "Public", hint: "Visible on the public travel page." },
	{ value: "unlisted", label: "Unlisted", hint: "Hidden from public pages." },
	{ value: "private", label: "Private", hint: "Only visible in the CMS." },
] as const;

export function VisibilityField({ path }: { path: string }) {
	return <SelectField path={path} label="Visibility" options={VISIBILITY_OPTIONS} />;
}
