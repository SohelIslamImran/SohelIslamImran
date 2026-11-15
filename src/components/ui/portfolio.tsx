import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import { Card } from "./card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
	type EmptyTitleLevel,
} from "./empty";
import { Separator } from "./separator";
import { buttonVariants } from "./button";

/*
 * Portfolio layout and typography primitives. Every export here is shared by
 * all pages; see docs/design/primitives.md for usage.
 */

const pageShellVariants = cva(
	"mx-auto w-full min-w-0 max-w-full pl-[max(var(--page-gutter),env(safe-area-inset-left))] pr-[max(var(--page-gutter),env(safe-area-inset-right))]",
	{
		variants: {
			width: {
				default: "max-w-[calc(var(--page-max)+2*var(--page-gutter))]",
				wide: "max-w-[calc(var(--page-max-wide)+2*var(--page-gutter))]",
				narrow: "max-w-[calc(820px+2*var(--page-gutter))]",
				reading: "max-w-[calc(var(--reading-max)+2*var(--page-gutter))]",
			},
			spacing: {
				default: "pt-[clamp(40px,7vw,96px)] pb-section-sm",
				compact: "pt-[clamp(28px,5vw,64px)] pb-[clamp(48px,7vw,88px)]",
				none: "",
			},
		},
		defaultVariants: {
			width: "default",
			spacing: "default",
		},
	},
);

function hasRenderableContent(value: React.ReactNode) {
	if (typeof value === "string") return value.trim().length > 0;
	return value !== null && value !== undefined && value !== false;
}

/** Floating glass panel for menus, popovers, and chrome. Not for content. */
export function MenuSurface({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="menu-surface"
			data-material="glass"
			className={cn("glass rounded-card text-foreground", className)}
			{...props}
		/>
	);
}

/** Sliding selection pill. Give siblings a shared `layoutId` so it glides between them. */
export function MenuIndicator({ className, ...props }: React.ComponentProps<typeof motion.span>) {
	return (
		<motion.span
			data-slot="menu-indicator"
			aria-hidden="true"
			className={cn(
				"pointer-events-none absolute inset-0 z-0 rounded-full bg-[color-mix(in_srgb,var(--theme-ink)_7%,transparent)]",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * The page's `<main id="main-content" tabIndex={-1}>`. Exactly one per route.
 * The root frame already clears the nav dock, so `spacing` only adds rhythm.
 */
export function PageShell({
	id = "main-content",
	tabIndex = -1,
	"aria-label": ariaLabel = "Main content",
	className,
	width,
	spacing,
	...props
}: React.ComponentProps<"main"> & VariantProps<typeof pageShellVariants>) {
	return (
		<main
			id={id}
			tabIndex={tabIndex}
			aria-label={ariaLabel}
			data-slot="page-shell"
			className={cn(pageShellVariants({ width, spacing }), className)}
			{...props}
		/>
	);
}

/** Monospace coordinate label (`UTC+6`, `v0.12.0`, `23.81°N`). */
export function MonoLabel({
	className,
	tone = "muted",
	...props
}: React.ComponentProps<"span"> & { tone?: "muted" | "accent" | "ink" }) {
	return (
		<span
			data-slot="mono-label"
			className={cn(
				"mono-label",
				tone === "muted" && "text-muted-foreground",
				tone === "accent" && "text-primary-text",
				tone === "ink" && "text-foreground",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * A metric label whose trailing date ("… · Oct 19–25, 2026") never breaks
 * across lines. Labels without a date render unchanged.
 */
export function DatedLabel({ label }: { label: string }) {
	const match = label.match(/^(.*?)\s*·\s*([^·]*\d{4})\s*$/u);
	if (!match) return <>{label}</>;
	return (
		<>
			{match[1]?.trim()} · <span className="whitespace-nowrap">{match[2]?.trim()}</span>
		</>
	);
}

/** Small mono eyebrow above a heading. */
export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="eyebrow"
			className={cn(
				"mono-label mb-4 min-w-0 max-w-full break-words text-primary-text [overflow-wrap:anywhere]",
				className,
			)}
			{...props}
		/>
	);
}

/** A live status dot (availability, "now", online). Pulses unless reduced motion. */
export function StatusDot({
	className,
	tone = "success",
	pulse = true,
	...props
}: React.ComponentProps<"span"> & { tone?: "success" | "accent" | "muted"; pulse?: boolean }) {
	const color =
		tone === "success" ? "bg-success" : tone === "accent" ? "bg-primary" : "bg-muted-foreground";
	return (
		<span
			data-slot="status-dot"
			aria-hidden="true"
			className={cn("relative inline-grid size-2 shrink-0 place-items-center", className)}
			{...props}
		>
			{pulse ? (
				<span
					className={cn(
						"absolute inset-0 rounded-full motion-safe:animate-ping-soft motion-reduce:hidden",
						color,
					)}
				/>
			) : null}
			<span className={cn("relative size-2 rounded-full", color)} />
		</span>
	);
}

/** Keyboard key cap, e.g. <Kbd>⌘</Kbd><Kbd>K</Kbd>. */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
	return (
		<kbd
			data-slot="kbd"
			className={cn(
				"inline-grid h-5 min-w-5 place-items-center rounded-[6px] border border-line-strong bg-surface-solid px-1 font-mono text-[11px] leading-none font-medium text-muted-foreground shadow-[0_1px_0_var(--theme-line)]",
				className,
			)}
			{...props}
		/>
	);
}

/** Page-level title block (h1 by default). */
export function PageHeader({
	eyebrow,
	title,
	description,
	children,
	className,
	level = 1,
	...props
}: {
	eyebrow?: React.ReactNode;
	title: React.ReactNode;
	description?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	level?: 1 | 2;
} & Omit<React.ComponentProps<"header">, "children" | "title">) {
	const Heading = level === 1 ? "h1" : "h2";
	const resolvedTitle = hasRenderableContent(title) ? title : "Untitled section";
	const resolvedDescription = hasRenderableContent(description) ? description : undefined;
	return (
		<header
			data-slot="page-header"
			className={cn("mb-[clamp(40px,6vw,72px)] min-w-0 max-w-[920px]", className)}
			{...props}
		>
			{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
			<Heading
				className={cn(
					"m-0 min-w-0 max-w-[920px] break-words text-balance [overflow-wrap:anywhere]",
					level === 1 ? "text-display" : "text-title",
				)}
			>
				{resolvedTitle}
			</Heading>
			{resolvedDescription ? (
				<p className="mt-6 min-w-0 max-w-[62ch] break-words text-lead text-muted-foreground [overflow-wrap:anywhere]">
					{resolvedDescription}
				</p>
			) : null}
			{children}
		</header>
	);
}

/**
 * Section heading with a mono coordinate eyebrow: `01 — Work`.
 * Pass `id` to label the surrounding `<section aria-labelledby>`.
 */
export function SectionHeading({
	index,
	eyebrow,
	title,
	description,
	actions,
	level = 2,
	align = "start",
	id,
	className,
	titleClassName,
	...props
}: {
	/** Section number, rendered in accent, e.g. "01". */
	index?: React.ReactNode;
	/** Short section name after the dash, e.g. "Work". */
	eyebrow?: React.ReactNode;
	title: React.ReactNode;
	description?: React.ReactNode;
	/** Trailing slot (a "View all" link, a filter). Aligns to the baseline on wide screens. */
	actions?: React.ReactNode;
	level?: 2 | 3;
	align?: "start" | "center";
	/** Id for the heading element. */
	id?: string;
	className?: string;
	titleClassName?: string;
} & Omit<React.ComponentProps<"header">, "children" | "title" | "id">) {
	const Heading = level === 2 ? "h2" : "h3";
	const resolvedTitle = hasRenderableContent(title) ? title : "Untitled section";
	const resolvedDescription = hasRenderableContent(description) ? description : undefined;
	const hasEyebrow = hasRenderableContent(index) || hasRenderableContent(eyebrow);
	const centered = align === "center";
	return (
		<header
			data-slot="section-heading"
			className={cn(
				"mb-[clamp(40px,6vw,72px)] grid min-w-0 gap-x-10 gap-y-6",
				actions && !centered && "md:grid-cols-[minmax(0,1fr)_auto] md:items-end",
				centered && "justify-items-center text-center",
				className,
			)}
			{...props}
		>
			<div className={cn("min-w-0", centered && "flex flex-col items-center")}>
				{hasEyebrow ? (
					<p className="mono-label m-0 mb-5 flex items-center gap-2.5 text-muted-foreground">
						{hasRenderableContent(index) ? (
							<span className="text-primary-text">{index}</span>
						) : null}
						{hasRenderableContent(index) && hasRenderableContent(eyebrow) ? (
							<span aria-hidden="true" className="h-px w-5 bg-line-strong" />
						) : null}
						{hasRenderableContent(eyebrow) ? <span>{eyebrow}</span> : null}
					</p>
				) : null}
				<Heading
					id={id}
					className={cn(
						"m-0 min-w-0 max-w-[22ch] break-words text-title text-balance [overflow-wrap:anywhere]",
						centered && "mx-auto",
						titleClassName,
					)}
				>
					{resolvedTitle}
				</Heading>
				{resolvedDescription ? (
					<p
						className={cn(
							"mt-5 mb-0 min-w-0 max-w-[58ch] break-words text-lead text-muted-foreground [overflow-wrap:anywhere]",
							centered && "mx-auto",
						)}
					>
						{resolvedDescription}
					</p>
				) : null}
			</div>
			{actions ? <div className="flex min-w-0 flex-wrap gap-2.5">{actions}</div> : null}
		</header>
	);
}

/**
 * A major page section with the standard vertical rhythm. Pair with
 * `SectionHeading id` + `aria-labelledby`.
 */
export function Section({
	className,
	spacing = "default",
	...props
}: React.ComponentProps<"section"> & { spacing?: "default" | "compact" | "none" }) {
	return (
		<section
			data-slot="section"
			className={cn(
				"min-w-0",
				spacing === "default" && "py-[calc(var(--section-space)/2)]",
				spacing === "compact" && "py-[calc(var(--section-space-sm)/2)]",
				className,
			)}
			{...props}
		/>
	);
}

/** Legacy two-column section intro. Prefer `SectionHeading` in new code. */
export function SectionIntro({
	eyebrow,
	title,
	description,
	className,
	...props
}: {
	eyebrow?: React.ReactNode;
	title: React.ReactNode;
	description?: React.ReactNode;
	className?: string;
} & Omit<React.ComponentProps<"div">, "children" | "title">) {
	const resolvedTitle = hasRenderableContent(title) ? title : "Untitled section";
	const resolvedDescription = hasRenderableContent(description) ? description : undefined;
	return (
		<div
			data-slot="section-intro"
			className={cn(
				"mb-[clamp(40px,6vw,64px)] grid min-w-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-x-[clamp(28px,6vw,72px)] gap-y-4 max-md:block",
				className,
			)}
			{...props}
		>
			{eyebrow ? <Eyebrow className="pt-3">{eyebrow}</Eyebrow> : <span aria-hidden="true" />}
			<div className="min-w-0">
				<h2 className="m-0 min-w-0 break-words text-title text-balance [overflow-wrap:anywhere]">
					{resolvedTitle}
				</h2>
				{resolvedDescription ? (
					<p className="mt-5 min-w-0 max-w-[54ch] break-words text-lead text-muted-foreground [overflow-wrap:anywhere]">
						{resolvedDescription}
					</p>
				) : null}
			</div>
		</div>
	);
}

const surfaceVariants = cva(
	"min-w-0 rounded-card border transition-[background-color,border-color,box-shadow,transform,translate,scale,rotate] duration-300 ease-trace",
	{
		variants: {
			variant: {
				/** Kept for compatibility; content stays solid, so this is a raised solid card. */
				glass: "border-line bg-surface-solid shadow-surface",
				solid: "border-line bg-surface-solid shadow-raised",
				quiet: "border-line bg-[color-mix(in_srgb,var(--theme-ink)_2.5%,transparent)] shadow-none",
			},
		},
		defaultVariants: { variant: "solid" },
	},
);

/** Content card: hairline, 28px radius, soft shadow, inset highlight. */
export function Surface({
	className,
	variant,
	...props
}: React.ComponentProps<typeof Card> & VariantProps<typeof surfaceVariants>) {
	return (
		<Card
			data-variant={variant ?? "solid"}
			className={cn(surfaceVariants({ variant }), "ring-0", className)}
			{...props}
		/>
	);
}

/** Neutral pill tag for tools and topics. */
export function Tag({ className, ...props }: React.ComponentProps<typeof Badge>) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"inline-flex h-auto min-h-7 min-w-0 max-w-full shrink flex-wrap items-center justify-center gap-1 whitespace-normal break-words border-line bg-[color-mix(in_srgb,var(--theme-ink)_3%,transparent)] px-2.5 py-1 text-left text-[12.5px] font-medium text-ink-soft [overflow-wrap:anywhere]",
				className,
			)}
			{...props}
		/>
	);
}

export function TagList({ items, className }: { items: readonly string[]; className?: string }) {
	return (
		<div
			data-slot="tag-list"
			className={cn(
				"flex min-w-0 max-w-full flex-wrap gap-1.5 [&>*]:min-w-0 [&>*]:max-w-full",
				className,
			)}
		>
			{items.map((item) => (
				<Tag key={item}>{item}</Tag>
			))}
		</div>
	);
}

export function ActionRow({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="action-row"
			className={cn("mt-8 flex min-w-0 max-w-full flex-wrap items-center gap-3", className)}
			{...props}
		/>
	);
}

/** An `<a>` styled as a button. For internal routes use `<Link className={buttonVariants()}>`. */
export function ButtonLink({
	className,
	variant,
	size,
	...props
}: React.ComponentProps<"a"> & VariantProps<typeof buttonVariants>) {
	return (
		<a
			className={cn(
				buttonVariants({ variant, size }),
				"min-w-0 max-w-full whitespace-normal text-left [overflow-wrap:anywhere]",
				className,
			)}
			{...props}
		/>
	);
}

type StatusBadgeProps = React.ComponentProps<typeof Badge> & {
	tone?: "neutral" | "signal" | "accent" | "success";
};

export function StatusBadge({ className, tone = "neutral", ...props }: StatusBadgeProps) {
	return (
		<Badge
			variant="secondary"
			className={cn(
				"inline-flex h-auto min-h-6 min-w-0 max-w-full shrink flex-wrap items-center justify-center gap-1.5 whitespace-normal break-words border-0 bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] px-2.5 py-0.5 text-left text-xs font-medium text-foreground [overflow-wrap:anywhere]",
				tone === "signal" &&
					"bg-[color-mix(in_srgb,var(--theme-signal)_13%,transparent)] text-signal",
				tone === "accent" && "bg-primary-soft text-primary-text",
				tone === "success" &&
					"bg-[color-mix(in_srgb,var(--theme-success)_13%,transparent)] text-success",
				className,
			)}
			{...props}
		/>
	);
}

export function Rule({ className, ...props }: React.ComponentProps<typeof Separator>) {
	return <Separator data-slot="section-rule" className={cn("bg-line", className)} {...props} />;
}

export function EmptyState({
	title,
	description,
	children,
	className,
	level = 2,
	...props
}: {
	title: React.ReactNode;
	description: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	level?: EmptyTitleLevel;
} & Omit<React.ComponentProps<typeof Empty>, "children">) {
	const resolvedTitle = hasRenderableContent(title) ? title : "Nothing here yet.";
	const resolvedDescription = hasRenderableContent(description)
		? description
		: "There is nothing to show here yet.";
	return (
		<Empty
			className={cn(
				"min-h-48 min-w-0 max-w-full border border-dashed border-line-strong bg-[color-mix(in_srgb,var(--theme-ink)_2%,transparent)]",
				className,
			)}
			{...props}
		>
			<EmptyHeader>
				<EmptyTitle level={level}>{resolvedTitle}</EmptyTitle>
				<EmptyDescription>{resolvedDescription}</EmptyDescription>
			</EmptyHeader>
			{children ? <EmptyContent>{children}</EmptyContent> : null}
		</Empty>
	);
}
