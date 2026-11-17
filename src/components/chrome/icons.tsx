import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/** Stroke icons on a 20px grid, 1.5px stroke, round caps. Always decorative. */
function Icon({ className, children, ...props }: SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 20 20"
			aria-hidden="true"
			className={cn(
				"size-5 shrink-0 fill-none stroke-current stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]",
				className,
			)}
			{...props}
		>
			{children}
		</svg>
	);
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<path d="M3.75 8.6 10 3.5l6.25 5.1V16a.75.75 0 0 1-.75.75h-3.25v-4.5h-4.5v4.5H4.5a.75.75 0 0 1-.75-.75Z" />
		</Icon>
	);
}

export function WorkIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<rect x="2.75" y="5.75" width="14.5" height="10.5" rx="2.25" />
			<path d="M7.25 5.75V4.5c0-.69.56-1.25 1.25-1.25h3c.69 0 1.25.56 1.25 1.25v1.25M2.75 10.25h14.5" />
		</Icon>
	);
}

export function StoryIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<path d="M10 5.25c-1.6-1.15-3.7-1.5-6.25-1.25v11.5c2.55-.25 4.65.1 6.25 1.25 1.6-1.15 3.7-1.5 6.25-1.25V4c-2.55-.25-4.65.1-6.25 1.25ZM10 5.25v11.5" />
		</Icon>
	);
}

export function ResumeIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<path d="M5.25 2.75h6.5l3 3v11.5H5.25Z" />
			<path d="M11.5 2.75V6h3.25M7.75 9.75h4.5M7.75 12.75h4.5" />
		</Icon>
	);
}

export function LinksIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<path d="M8.6 11.4a3.1 3.1 0 0 0 4.4 0l2.5-2.5a3.1 3.1 0 0 0-4.4-4.4l-.9.9" />
			<path d="M11.4 8.6a3.1 3.1 0 0 0-4.4 0l-2.5 2.5a3.1 3.1 0 0 0 4.4 4.4l.9-.9" />
		</Icon>
	);
}

export function NotesIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<circle cx="10" cy="10" r="7.25" />
			<path d="m12.75 7.25-1.6 3.9-3.9 1.6 1.6-3.9Z" />
		</Icon>
	);
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<circle cx="9" cy="9" r="5.25" />
			<path d="m13 13 3.75 3.75" />
		</Icon>
	);
}

export function CommandIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<path d="M7.5 7.5h5v5h-5ZM7.5 7.5V5.75a2 2 0 1 0-2 2h2M12.5 7.5V5.75a2 2 0 1 1 2 2h-2M7.5 12.5v1.75a2 2 0 1 1-2-2h2M12.5 12.5v1.75a2 2 0 1 0 2-2h-2" />
		</Icon>
	);
}

export function TerminalIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<rect x="2.75" y="3.75" width="14.5" height="12.5" rx="3" />
			<path d="m6.25 8 2.25 2-2.25 2M10.75 12.25h3" />
		</Icon>
	);
}

export function ProjectIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<path d="m10 2.75 6.5 3.75v7L10 17.25 3.5 13.5v-7Z" />
			<path d="m3.75 6.6 6.25 3.6 6.25-3.6M10 10.2v7" />
		</Icon>
	);
}

export function ExternalIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<path d="M7.25 4.75h-1.5a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h7.5a2 2 0 0 0 2-2v-1.5M10.75 3.75h5.5v5.5M16 4 9.5 10.5" />
		</Icon>
	);
}

export function MailIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<rect x="2.75" y="4.25" width="14.5" height="11.5" rx="2.25" />
			<path d="m3.5 5.5 6.5 5 6.5-5" />
		</Icon>
	);
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<rect x="6.75" y="6.75" width="10" height="10" rx="2.25" />
			<path d="M13.25 6.75V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6.25a2 2 0 0 0 2 2h1.75" />
		</Icon>
	);
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<path d="m4.5 10.4 3.6 3.35 7.4-7.75" />
		</Icon>
	);
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<path d="M4 10h12M11.5 5.5 16 10l-4.5 4.5" />
		</Icon>
	);
}

export function RssIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<path d="M4.25 9.25a6.5 6.5 0 0 1 6.5 6.5M4.25 4.25a11.5 11.5 0 0 1 11.5 11.5" />
			<circle cx="5" cy="15" r="0.9" className="fill-current stroke-none" />
		</Icon>
	);
}

export function ReturnIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<Icon {...props}>
			<path d="M15.75 4.75v4.5a2.5 2.5 0 0 1-2.5 2.5H4.5M8 8.25l-3.5 3.5 3.5 3.5" />
		</Icon>
	);
}

/** The SI monogram used in the dock and favicon. */
export function Monogram({ className }: { className?: string }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"relative grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-semibold tracking-[0.02em] text-background",
				className,
			)}
		>
			SI
			<span className="absolute -right-px -bottom-px size-2.5 rounded-full border-2 border-paper bg-primary" />
		</span>
	);
}
