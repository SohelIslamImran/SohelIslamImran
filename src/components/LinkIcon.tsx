interface LinkIconProps {
	platform: string;
}

/**
 * Small, inline platform marks keep the links page fast and self-contained.
 * Unknown platforms intentionally receive a neutral signal glyph so new CMS
 * links still have a polished affordance without another dependency.
 */
export function LinkIcon({ platform }: LinkIconProps) {
	const name = platform.toLowerCase();
	const icon = name.includes("linkedin") ? (
		<>
			<rect x="5" y="5" width="14" height="14" rx="2.5" />
			<circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
			<path d="M8 12v4M11 16v-2.2a2 2 0 0 1 4 0V16M11 12v4" />
		</>
	) : name.includes("github") ? (
		<>
			<path d="M8.4 18.5c-3.2.8-3.2-1.5-4.5-2m9-11.1c2.8-.3 4.7 1.3 4.7 4.7 0 1.8-.6 3-1.7 3.8.2 1.1.2 2.1-.1 3.1-.9.2-1.6-.2-2.2-.7" />
			<path d="M7.5 5.4C4.7 5.1 2.8 6.7 2.8 10c0 1.8.6 3 1.7 3.8-.2 1.1-.2 2.1.1 3.1.9.2 1.6-.2 2.2-.7" />
			<path d="M8 18.2c-.1-1.1.4-1.9 1.5-2.2 1.1-.3 2-.3 3.1 0 1.1.3 1.6 1.1 1.5 2.2" />
		</>
	) : name === "x" || name.includes("twitter") ? (
		<path d="m5 5 5.8 6.2L5.2 19h2.6l4.2-5 4.6 5H19l-5.8-6.4L18.4 5h-2.6l-3.8 4.6L7.7 5H5Z" />
	) : name.includes("facebook") ? (
		<>
			<circle cx="12" cy="12" r="8" />
			<path d="M13.4 17v-4h1.8l.3-2h-2.1V9.8c0-.7.2-1.2 1.2-1.2h1V6.8a12 12 0 0 0-1.5-.1c-1.9 0-3 1.1-3 3v1.3H9.4v2h1.7v4" />
		</>
	) : name.includes("bluesky") ? (
		<path d="M12 10.8C10.9 8.5 8 5.4 5.5 4.1 3.1 2.9 2.4 3.8 2.4 5c0 .3.2 2.6.3 3.1.4 1.8 1.7 2.8 3.4 3.2-1.9-.2-3.6.1-3.7 1.6-.1 1.8 2 2.7 3.6 3.2 1.8.6 3.5-.1 4.6-1.3l1.4-1.8 1.4 1.8c1.1 1.2 2.8 1.9 4.6 1.3 1.6-.5 3.7-1.4 3.6-3.2-.1-1.5-1.8-1.8-3.7-1.6 1.7-.4 3-1.4 3.4-3.2.1-.5.3-2.8.3-3.1 0-1.2-.7-2.1-3.1-.9-2.5 1.3-5.4 4.4-6.5 6.7Z" />
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
			<circle cx="12" cy="12" r="8" />
			<path d="M9 12h6M12 9v6" />
		</>
	);

	return (
		<span className="link-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24" focusable="false">
				{icon}
			</svg>
		</span>
	);
}
