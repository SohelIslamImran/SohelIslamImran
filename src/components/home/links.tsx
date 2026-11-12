import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LinkContent } from "../../types/content";

export type LinkKind = "internal" | "hash" | "mail" | "tel" | "external";

/**
 * Classifies a CMS link so it renders as the right element: a router `Link`
 * for internal paths, a plain anchor for hashes and mail/tel, and a new-tab
 * anchor for anything with a protocol or a protocol-relative host.
 */
export function classifyLink(href: string, markedExternal = false): LinkKind {
	const value = href.trim();
	const lower = value.toLowerCase();
	if (lower.startsWith("mailto:")) return "mail";
	if (lower.startsWith("tel:")) return "tel";
	if (value.startsWith("#")) return "hash";
	if (/^(?:https?:)?\/\//iu.test(value)) return "external";
	if (/^[a-z][a-z\d+.-]*:/iu.test(value)) return "external";
	if (markedExternal && !value.startsWith("/")) return "external";
	return "internal";
}

/** U+2709 falls back to a glyph that reads like a close control, so email uses "@". */
export const LINK_ARROWS: Record<LinkKind, string> = {
	internal: "→",
	hash: "↓",
	mail: "@",
	tel: "☎",
	external: "↗",
};

export const LINK_DESTINATIONS: Record<LinkKind, string> = {
	internal: "Internal destination",
	hash: "Page section",
	mail: "Email destination",
	tel: "Phone destination",
	external: "External destination, opens in a new tab",
};

/**
 * Renders a CMS link with the right element for its kind. `children` is the
 * visible label; the arrow and the new-tab hint are added here.
 */
export function SmartLink({
	link,
	className,
	children,
	describe = false,
	arrow = true,
}: {
	link: LinkContent;
	className?: string;
	children?: ReactNode;
	/** Add the destination type to the accessible name (contact lists). */
	describe?: boolean;
	arrow?: boolean;
}) {
	const href = link.href.trim();
	const kind = classifyLink(href, link.external);
	const label = link.label.trim() || (kind === "internal" ? "Open page" : "Open link");
	const content = (
		<>
			{children ?? label}
			{arrow ? (
				<span aria-hidden="true" className="translate-y-[-0.5px]">
					{LINK_ARROWS[kind]}
				</span>
			) : null}
			{kind === "external" && !describe ? (
				<span className="sr-only">, opens in a new tab</span>
			) : null}
		</>
	);
	const ariaLabel = describe ? `${label}, ${LINK_DESTINATIONS[kind]}` : undefined;
	if (kind === "internal") {
		return (
			<Link className={className} to={href} aria-label={ariaLabel}>
				{content}
			</Link>
		);
	}
	return (
		<a
			className={className}
			href={href}
			aria-label={ariaLabel}
			target={kind === "external" ? "_blank" : undefined}
			rel={kind === "external" ? "noopener noreferrer" : undefined}
		>
			{content}
		</a>
	);
}
