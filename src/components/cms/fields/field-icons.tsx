/**
 * Field and editor icons, drawn to match `shell/cms-icons.tsx`
 * (20px grid, 1.6 stroke, round caps).
 */
import type { SVGProps } from "react";
import { cn } from "../../../lib/utils";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ className, children, ...props }: IconProps) {
	return (
		<svg
			viewBox="0 0 20 20"
			aria-hidden="true"
			className={cn(
				"size-4 shrink-0 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]",
				className,
			)}
			{...props}
		>
			{children}
		</svg>
	);
}

export function PlusIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M10 4.5v11M4.5 10h11" />
		</Icon>
	);
}

export function CheckIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m4.75 10.25 3.5 3.5 7-7.5" />
		</Icon>
	);
}

export function ChevronDownIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m5.5 8 4.5 4.5L14.5 8" />
		</Icon>
	);
}

export function ChevronUpIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m5.5 12 4.5-4.5 4.5 4.5" />
		</Icon>
	);
}

export function ChevronRightIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m8 5.5 4.5 4.5L8 14.5" />
		</Icon>
	);
}

export function ChevronLeftIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 5.5 7.5 10l4.5 4.5" />
		</Icon>
	);
}

export function RevertIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4.5 8.5h7.25a3.75 3.75 0 0 1 0 7.5H9" />
			<path d="M7.5 5.5 4.5 8.5l3 3" />
		</Icon>
	);
}

export function TrashIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4 6h12M8 6V4.5h4V6M5.5 6l.75 9.5h7.5L14.5 6M8.5 9v4M11.5 9v4" />
		</Icon>
	);
}

export function DuplicateIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="7" y="7" width="9" height="9" rx="2" />
			<path d="M13 4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13" />
		</Icon>
	);
}

export function MoreIcon(props: IconProps) {
	return (
		<Icon {...props} className={cn("fill-current stroke-none", props.className)}>
			<circle cx="5" cy="10" r="1.4" />
			<circle cx="10" cy="10" r="1.4" />
			<circle cx="15" cy="10" r="1.4" />
		</Icon>
	);
}

export function AlertCircleIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="10" cy="10" r="7" />
			<path d="M10 6.5v4M10 13.5v.01" />
		</Icon>
	);
}

export function StackIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="3.5" y="4" width="13" height="4.5" rx="1.5" />
			<rect x="3.5" y="11.5" width="13" height="4.5" rx="1.5" />
		</Icon>
	);
}

export function MailIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="2.5" y="4.5" width="15" height="11" rx="2" />
			<path d="m3 6 7 5 7-5" />
		</Icon>
	);
}

export function GlobeIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="10" cy="10" r="7.5" />
			<ellipse cx="10" cy="10" rx="3" ry="7.5" />
			<path d="M2.5 10h15" />
		</Icon>
	);
}

export function LinkIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m8 12 4-4m-3-2 2.5-2.5a3.54 3.54 0 0 1 5 5L14 11m-3 3-2.5 2.5a3.54 3.54 0 0 1-5-5L6 9" />
		</Icon>
	);
}

export function PhoneIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m6.5 2.5 2 4.5-2 2a12 12 0 0 0 4.5 4.5l2-2 4.5 2v2a2 2 0 0 1-2 2 14 14 0 0 1-13-13 2 2 0 0 1 2-2Z" />
		</Icon>
	);
}

export function ImageIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="2.5" y="2.5" width="15" height="15" rx="2" />
			<circle cx="7" cy="7" r="1" />
			<path d="m3 14 4-4 3 3 3-4 4 5" />
		</Icon>
	);
}
