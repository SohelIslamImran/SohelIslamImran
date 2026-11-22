/**
 * Minimal architectural 1.5px stroke icons for the Control Plane shell,
 * command bar, release diff, history, activity, and media library.
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

export function OverviewIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="3" y="3" width="6" height="6" rx="1.5" />
			<rect x="11" y="3" width="6" height="4" rx="1.5" />
			<rect x="11" y="9" width="6" height="8" rx="1.5" />
			<rect x="3" y="11" width="6" height="6" rx="1.5" />
		</Icon>
	);
}

export function AnalyticsIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M3.25 15.75h13.5" />
			<path d="M4.5 12.25 8 8.75l3 2.5 4.5-5.5" />
			<circle cx="15.5" cy="5.75" r="1.25" className="fill-current stroke-none" />
		</Icon>
	);
}

export function MediaLibraryIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="3" y="4" width="14" height="12" rx="2" />
			<circle cx="7.25" cy="8.25" r="1.25" />
			<path d="m4.5 14 3.5-3.25 2.75 2.5 2.25-2 2.5 2.75" />
		</Icon>
	);
}

export function ReleaseChangesIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="5.5" cy="5.5" r="2" />
			<circle cx="14.5" cy="14.5" r="2" />
			<circle cx="5.5" cy="14.5" r="2" />
			<path d="M5.5 7.5v5M7.5 5.5h4a3 3 0 0 1 3 3v4" />
		</Icon>
	);
}

export function HistoryIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4 10a6 6 0 1 0 1.76-4.24L4 7.5" />
			<path d="M4 4.25V7.5h3.25" />
			<path d="M10 7v3.25l2.25 1.5" />
		</Icon>
	);
}

export function ActivityIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M2.75 10h3l2-5 3.5 10 2-5h4" />
		</Icon>
	);
}

export function SearchIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="9" cy="9" r="5.5" />
			<path d="m13.2 13.2 3.55 3.55" />
		</Icon>
	);
}

export function MenuIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M3.5 6h13M3.5 10h13M3.5 14h9.5" />
		</Icon>
	);
}

export function CloseIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m5 5 10 10M15 5 5 15" />
		</Icon>
	);
}

export function SidebarToggleIcon({ collapsed, ...props }: IconProps & { collapsed?: boolean }) {
	return (
		<Icon {...props}>
			<rect x="3" y="4" width="14" height="12" rx="2" />
			<path d="M7.5 4v12" />
			{collapsed ? (
				<path d="m10.75 8.25 1.75 1.75-1.75 1.75" />
			) : (
				<path d="m12.25 8.25-1.75 1.75 1.75 1.75" />
			)}
		</Icon>
	);
}

export function ExternalArrowIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M7 13 14 6M8.5 6H14v5.5" />
		</Icon>
	);
}

export function CheckCircleIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="10" cy="10" r="7" />
			<path d="m7 10.2 2.1 2.1 4-4.3" />
		</Icon>
	);
}

export function AlertTriangleIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M10 3.5 17 16H3L10 3.5Z" />
			<path d="M10 8v3.5" />
			<circle cx="10" cy="13.75" r="0.6" className="fill-current" />
		</Icon>
	);
}

export function LockIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="4.5" y="8.5" width="11" height="8" rx="2" />
			<path d="M7 8.5V6a3 3 0 0 1 6 0v2.5M10 12v1.5" />
		</Icon>
	);
}

export function PublishIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M10 15V4.5" />
			<path d="m6 8.5 4-4 4 4" />
			<path d="M4.5 16.25h11" />
		</Icon>
	);
}

export function SaveIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4.5 4h9l2 2v9.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
			<path d="M7.25 4v4h5.5V4M7.25 16.5v-4.25h5.5v4.25" />
		</Icon>
	);
}

export function DiscardIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M5.5 7.5H13a3.5 3.5 0 1 1 0 7H8.5" />
			<path d="M8 5 5.25 7.5 8 10" />
		</Icon>
	);
}

export function UploadIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M10 12.75V4.5M6.75 7.75 10 4.5l3.25 3.25" />
			<path d="M4 13.5v1.25A1.25 1.25 0 0 0 5.25 16h9.5A1.25 1.25 0 0 0 16 14.75V13.5" />
		</Icon>
	);
}

export function DownloadIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M10 4.5v8.25M6.75 9.5 10 12.75l3.25-3.25" />
			<path d="M4 13.5v1.25A1.25 1.25 0 0 0 5.25 16h9.5A1.25 1.25 0 0 0 16 14.75V13.5" />
		</Icon>
	);
}

/** Per-section icons keyed by `SectionId` (with a crisp fallback). */
export function SectionIcon({ id, ...props }: IconProps & { id: string }) {
	switch (id) {
		case "site":
			return (
				<Icon {...props}>
					<circle cx="10" cy="10" r="6.75" />
					<path d="M3.5 10h13M10 3.25a9.5 9.5 0 0 1 0 13.5M10 3.25a9.5 9.5 0 0 0 0 13.5" />
				</Icon>
			);
		case "identity":
			return (
				<Icon {...props}>
					<circle cx="10" cy="7.25" r="3" />
					<path d="M4.5 16a5.5 5.5 0 0 1 11 0" />
				</Icon>
			);
		case "hero":
			return (
				<Icon {...props}>
					<rect x="3" y="4" width="14" height="12" rx="2" />
					<path d="M6 8.25h8M6 11.75h5" />
				</Icon>
			);
		case "about":
			return (
				<Icon {...props}>
					<path d="M4.5 5.5h11M4.5 9.5h11M4.5 13.5h7" />
				</Icon>
			);
		case "contact":
			return (
				<Icon {...props}>
					<rect x="3" y="4.75" width="14" height="10.5" rx="2" />
					<path d="m4 6 6 4.75L16 6" />
				</Icon>
			);
		case "resume":
			return (
				<Icon {...props}>
					<path d="M5.5 3.5h6l3 3v10a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" />
					<path d="M11.5 3.5v3h3M7.5 10h5M7.5 13h3.5" />
				</Icon>
			);
		case "projects":
			return (
				<Icon {...props}>
					<path d="M10 3.25 16.5 6.8 10 10.35 3.5 6.8 10 3.25Z" />
					<path d="m3.5 10.2 6.5 3.55 6.5-3.55" />
					<path d="m3.5 13.5 6.5 3.25 6.5-3.25" />
				</Icon>
			);
		case "experience":
			return (
				<Icon {...props}>
					<rect x="3.25" y="6.25" width="13.5" height="9.75" rx="1.75" />
					<path d="M7.25 6.25v-1.5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1v1.5" />
				</Icon>
			);
		case "capabilities":
			return (
				<Icon {...props}>
					<path d="M4 6.5h12M4 10h8M4 13.5h10" />
					<circle cx="15" cy="10" r="1.5" />
				</Icon>
			);
		case "testimonials":
			return (
				<Icon {...props}>
					<path d="M4.25 5.25h11.5a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5H9.5l-3.75 2.5v-2.5H4.25a1.5 1.5 0 0 1-1.5-1.5v-6.5a1.5 1.5 0 0 1 1.5-1.5Z" />
				</Icon>
			);
		case "credentials":
			return (
				<Icon {...props}>
					<circle cx="10" cy="8.25" r="4" />
					<path d="m7.75 11.75-.75 5 3-1.6 3 1.6-.75-5" />
				</Icon>
			);
		case "writing":
			return (
				<Icon {...props}>
					<path d="m13.5 4.25 2.25 2.25-8.5 8.5-3 .75.75-3 8.5-8.5Z" />
				</Icon>
			);
		case "story":
			return (
				<Icon {...props}>
					<path d="M4 4.75h4.75a2.25 2.25 0 0 1 2.25 2.25v9a1.75 1.75 0 0 0-1.75-1.75H4v-9.5Z" />
					<path d="M16 4.75h-4.75A2.25 2.25 0 0 0 9 7v9a1.75 1.75 0 0 1 1.75-1.75H16v-9.5Z" />
				</Icon>
			);
		case "travel":
			return (
				<Icon {...props}>
					<path d="M10 16.75s5-4.5 5-8.5a5 5 0 1 0-10 0c0 4 5 8.5 5 8.5Z" />
					<circle cx="10" cy="8.25" r="1.6" />
				</Icon>
			);
		case "links":
			return (
				<Icon {...props}>
					<path d="M8.5 11.5 11.5 8.5" />
					<path d="M7.25 13.75a3 3 0 0 1-1-5l1.5-1.5a3 3 0 0 1 4.25 0" />
					<path d="M12.75 6.25a3 3 0 0 1 1 5l-1.5 1.5a3 3 0 0 1-4.25 0" />
				</Icon>
			);
		default:
			return (
				<Icon {...props}>
					<rect x="4" y="4" width="12" height="12" rx="2" />
				</Icon>
			);
	}
}
