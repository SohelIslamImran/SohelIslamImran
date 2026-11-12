import { cn } from "../lib/utils";

interface LinkIconProps {
	platform: string;
	/** `md` 44px (list rows), `lg` 52px (featured tiles). */
	size?: "md" | "lg";
	className?: string;
}

/**
 * Small, inline platform marks keep the links page fast and self-contained.
 * Unknown platforms intentionally receive a neutral signal glyph so new CMS
 * links still have a polished affordance without another dependency.
 */
export function LinkIcon({ platform, size = "md", className }: LinkIconProps) {
	const name = platform.trim().toLowerCase();
	const icon = name.includes("linkedin") ? (
		<>
			<rect x="5" y="5" width="14" height="14" rx="2.5" />
			<circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
			<path d="M8 12v4M11 16v-2.2a2 2 0 0 1 4 0V16M11 12v4" />
		</>
	) : name.includes("github") ? (
		<>
			<path
				d="M9 19c-4 1-4-2-6-2m12 5v-3.5c0-1 .1-1.8-.5-2.4 3-.3 6-1.4 6-6.1A4.8 4.8 0 0 0 19.2 6a4.4 4.4 0 0 0-.1-4s-1.1-.3-4.1 1.5a14 14 0 0 0-7 0C5 1.7 3.9 2 3.9 2a4.4 4.4 0 0 0-.1 4 4.8 4.8 0 0 0-1.3 3.5c0 4.7 3 5.8 6 6.1-.5.5-.6 1.2-.5 2.4V22"
				transform="translate(2 1) scale(.83)"
			/>
		</>
	) : name === "x" || name.includes("twitter") ? (
		<path d="m5 5 5.8 6.2L5.2 19h2.6l4.2-5 4.6 5H19l-5.8-6.4L18.4 5h-2.6l-3.8 4.6L7.7 5H5Z" />
	) : name.includes("facebook") ? (
		<>
			<circle cx="12" cy="12" r="8" />
			<path d="M13.4 17v-4h1.8l.3-2h-2.1V9.8c0-.7.2-1.2 1.2-1.2h1V6.8a12 12 0 0 0-1.5-.1c-1.9 0-3 1.1-3 3v1.3H9.4v2h1.7v4" />
		</>
	) : name.includes("whatsapp") ? (
		<>
			<path d="M19.2 4.8A9.8 9.8 0 0 0 3.8 16.6L2.5 21.5l5-1.3A9.8 9.8 0 0 0 19.2 4.8Z" />
			<path d="M8.2 7.4c.3-.7.6-.7 1-.7l.5.1c.2.1.4.7.7 1.4.2.5.1.7-.1 1l-.6.7c-.2.2-.1.4 0 .6.7 1.2 1.6 2.2 2.9 2.8.2.1.4.1.6-.1l.9-1.1c.2-.2.4-.2.7-.1l1.8.9c.3.2.5.3.5.5 0 .2-.1 1.2-.7 1.7-.6.6-1.4.9-2.3.7-1-.2-2.8-.9-4.7-2.7-1.5-1.4-2.6-3.2-2.8-4.2-.2-.8.1-1.2.6-1.5Z" />
		</>
	) : name.includes("youtube") ? (
		<>
			<rect x="3" y="6" width="18" height="12" rx="4" />
			<path d="m10 9 5 3-5 3V9Z" />
		</>
	) : name.includes("instagram") ? (
		<>
			<rect x="4" y="4" width="16" height="16" rx="5" />
			<circle cx="12" cy="12" r="3.4" />
			<circle cx="17.2" cy="6.8" r=".7" fill="currentColor" stroke="none" />
		</>
	) : name.includes("reddit") ? (
		<>
			<circle cx="12" cy="13" r="6" />
			<circle cx="9.5" cy="12" r=".8" fill="currentColor" stroke="none" />
			<circle cx="14.5" cy="12" r=".8" fill="currentColor" stroke="none" />
			<path d="M9 15c1.8 1.2 4.2 1.2 6 0M13 7l1-3 3 .7" />
			<circle cx="18.2" cy="5" r="1.3" />
		</>
	) : name.includes("bluesky") ? (
		<path d="M12 10.8C10.9 8.5 8 5.4 5.5 4.1 3.1 2.9 2.4 3.8 2.4 5c0 .3.2 2.6.3 3.1.4 1.8 1.7 2.8 3.4 3.2-1.9-.2-3.6.1-3.7 1.6-.1 1.8 2 2.7 3.6 3.2 1.8.6 3.5-.1 4.6-1.3l1.4-1.8 1.4 1.8c1.1 1.2 2.8 1.9 4.6 1.3 1.6-.5 3.7-1.4 3.6-3.2-.1-1.5-1.8-1.8-3.7-1.6 1.7-.4 3-1.4 3.4-3.2.1-.5.3-2.8.3-3.1 0-1.2-.7-2.1-3.1-.9-2.5 1.3-5.4 4.4-6.5 6.7Z" />
	) : name === "npm" ? (
		<>
			<path d="M3 7h18v10H12v2H8v-2H3V7Z" />
			<path d="M7 10v4m4 0v-4h6v4m-3-4v4" />
		</>
	) : name.includes("medium") ? (
		<>
			<ellipse cx="7" cy="12" rx="4.5" ry="6" />
			<ellipse cx="16" cy="12" rx="2.5" ry="6" />
			<path d="M22 7v10" />
		</>
	) : name.includes("threads") ? (
		<>
			<path d="M19 7c-1-3-3.2-4-6.5-4C6.5 3 4 6.7 4 12s2.5 9 8.5 9c4.8 0 7.5-2.6 7.5-6 0-3.6-3-5.5-6.5-5.5-3.2 0-5 1.4-5 3.5 0 1.6 1.2 2.5 2.9 2.5 3 0 4.1-2.2 4.1-5 0-3.1-2.1-4.7-4.5-3.2" />
		</>
	) : name.includes("field") || name.includes("notes") ? (
		<>
			<rect x="5" y="3" width="15" height="18" rx="2" />
			<path d="M8 3v18M3 7h4m-4 5h4m-4 5h4m5-10h5m-5 4h5m-5 4h3" />
		</>
	) : name.includes("website") || name.includes("portfolio") ? (
		<>
			<circle cx="12" cy="12" r="8" />
			<path d="M4.5 12h15M12 4c2.3 2.2 3.4 4.9 3.4 8s-1.1 5.8-3.4 8c-2.3-2.2-3.4-4.9-3.4-8S9.7 6.2 12 4Z" />
		</>
	) : name.includes("stack") ? (
		<>
			<path d="m7 7 10 2M7 10l10 2M7 13l10 2M9 17h7" />
			<path d="M5 5v14h14" />
		</>
	) : name.includes("story") ? (
		<>
			<path d="M4 6.5c2.8-.7 5.2-.2 8 1.4 2.8-1.6 5.2-2.1 8-1.4v11c-2.8-.7-5.2-.2-8 1.4-2.8-1.6-5.2-2.1-8-1.4v-11Z" />
			<path d="M12 7.9v11" />
		</>
	) : name.includes("mail") || name.includes("email") ? (
		<>
			<rect x="3.5" y="5.5" width="17" height="13" rx="2" />
			<path d="m4.5 7 7.5 5.4L19.5 7" />
		</>
	) : (
		<>
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</>
	);

	return (
		<span
			className={cn(
				"grid shrink-0 place-items-center border border-line bg-[color-mix(in_srgb,var(--theme-ink)_4%,var(--theme-surface-solid))] text-ink-soft shadow-[inset_0_1px_0_var(--theme-highlight)] transition-[color,background-color,border-color] duration-200 pointer-fine:group-hover:border-line-strong pointer-fine:group-hover:text-primary-text group-has-[:focus-visible]:text-primary-text",
				size === "lg" ? "size-[52px] rounded-[16px]" : "size-11 rounded-[13px]",
				className,
			)}
			aria-hidden="true"
		>
			<svg
				className={cn(
					"block fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]",
					size === "lg" ? "size-[26px]" : "size-[22px]",
				)}
				viewBox="0 0 24 24"
				focusable="false"
			>
				{icon}
			</svg>
		</span>
	);
}
