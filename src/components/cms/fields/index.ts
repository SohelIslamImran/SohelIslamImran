/**
 * CMS form primitives. Every field binds to a content path in the validator's
 * format (`projects[2].title`) and reads its value, validation issues, and
 * change-from-live mark from the draft store. See `docs/cms/PLAN.md` §3.4.
 */
export { FieldFrame, controlClass, describedBy, fieldId, focusField } from "./FieldFrame";
export { NumberField, TextAreaField, TextField } from "./TextFields";
export { SegmentedField, SelectField, SwitchField, type ChoiceOption } from "./ChoiceFields";
export { StringListField, TagsField } from "./ListFields";
export { RepeaterField } from "./RepeaterField";
export {
	CoordinateField,
	DateField,
	HrefField,
	LinkRow,
	LinksField,
	MetricRow,
	MetricsField,
	VisibilityField,
} from "./ContentFields";
export { MediaField, MediaIdsField } from "./MediaFields";
