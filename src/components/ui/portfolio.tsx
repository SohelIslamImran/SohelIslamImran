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

const pageShellVariants = cva(
	"mx-auto w-full min-w-0 max-w-full pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))]",
	{
		variants: {
			width: {
				default: "max-w-[1200px]",
				wide: "max-w-[1280px]",
				narrow: "max-w-[820px]",
			},
			spacing: {
				default: "py-[clamp(58px,8vw,112px)]",
				compact: "py-[clamp(42px,6vw,80px)]",
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

export function MenuSurface({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="menu-surface"
			data-material="glass"
			className={cn(
				"rounded-surface border-0 bg-[color-mix(in_srgb,var(--theme-surface-solid)_96%,transparent)] shadow-float backdrop-blur-2xl backdrop-saturate-150",
				className,
			)}
			{...props}
		/>
	);
}

export function MenuIndicator({ className, ...props }: React.ComponentProps<typeof motion.span>) {
	return (
		<motion.span
			data-slot="menu-indicator"
			aria-hidden="true"
			className={cn(
				"pointer-events-none absolute inset-0 z-0 rounded-full bg-surface-solid shadow-[0_5px_16px_var(--theme-accent-shadow)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--theme-highlight)_32%,transparent)]",
				className,
			)}
			{...props}
		/>
	);
}

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

export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="eyebrow"
			className={cn(
				"mb-3.5 min-w-0 max-w-full break-words text-xs font-extrabold uppercase tracking-[0.11em] leading-tight text-primary-text [overflow-wrap:anywhere]",
				className,
			)}
			{...props}
		/>
	);
}

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
			className={cn("mb-[clamp(42px,6vw,72px)] min-w-0 max-w-[920px]", className)}
			{...props}
		>
			{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
			<Heading
				className={cn(
					"min-w-0 max-w-[920px] break-words font-[760] text-balance [overflow-wrap:anywhere]",
					level === 1
						? "text-[clamp(2.8rem,6.4vw,5.4rem)] leading-[0.94] tracking-[-0.065em]"
						: "text-[clamp(1.65rem,3vw,2.4rem)] leading-none tracking-[-0.055em]",
				)}
			>
				{resolvedTitle}
			</Heading>
			{resolvedDescription ? (
				<p className="mt-5 min-w-0 max-w-[680px] break-words text-[clamp(1.05rem,2vw,1.3rem)] leading-[1.55] text-muted-foreground [overflow-wrap:anywhere]">
					{resolvedDescription}
				</p>
			) : null}
			{children}
		</header>
	);
}

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
				"mb-[clamp(42px,6vw,64px)] grid min-w-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-x-[clamp(28px,6vw,72px)] gap-y-4 max-[800px]:block",
				className,
			)}
			{...props}
		>
			{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : <span aria-hidden="true" />}
			<div className="min-w-0">
				<h2 className="m-0 min-w-0 break-words text-[clamp(2.25rem,4.6vw,4.3rem)] font-[760] leading-[0.96] tracking-[-0.06em] text-balance [overflow-wrap:anywhere] max-[800px]:mt-3.5">
					{resolvedTitle}
				</h2>
				{resolvedDescription ? (
					<p className="mt-4 min-w-0 max-w-[540px] break-words text-lg leading-[1.55] text-muted-foreground [overflow-wrap:anywhere] max-[800px]:text-base">
						{resolvedDescription}
					</p>
				) : null}
			</div>
		</div>
	);
}

const surfaceVariants = cva(
	"min-w-0 rounded-surface border shadow-surface transition-[background-color,border-color,box-shadow,transform,translate,scale,rotate] duration-200 ease-route",
	{
		variants: {
			variant: {
				glass:
					"border-border/60 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-surface-solid)_98%,transparent),color-mix(in_srgb,var(--theme-surface-solid)_88%,var(--theme-accent-soft)))] backdrop-blur-2xl backdrop-saturate-150",
				solid: "border-border/70 bg-surface-solid",
				quiet: "border-border/60 bg-background/80",
			},
		},
		defaultVariants: { variant: "solid" },
	},
);

export function Surface({
	className,
	variant,
	...props
}: React.ComponentProps<typeof Card> & VariantProps<typeof surfaceVariants>) {
	return (
		<Card
			data-material={variant === "glass" ? "glass" : undefined}
			className={cn(surfaceVariants({ variant }), className)}
			{...props}
		/>
	);
}

export function Tag({ className, ...props }: React.ComponentProps<typeof Badge>) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"inline-flex h-auto min-w-0 max-w-full shrink flex-wrap items-center justify-center gap-1 whitespace-normal break-words border-border px-2 py-1 text-left text-xs font-medium text-muted-foreground [overflow-wrap:anywhere]",
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
			className={cn("mt-7 flex min-w-0 max-w-full flex-wrap gap-2.5", className)}
			{...props}
		/>
	);
}

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
	tone?: "neutral" | "signal";
};

export function StatusBadge({ className, tone = "neutral", ...props }: StatusBadgeProps) {
	return (
		<Badge
			variant="secondary"
			className={cn(
				"inline-flex h-auto min-w-0 max-w-full shrink flex-wrap items-center justify-center gap-1 whitespace-normal break-words border-0 bg-muted px-2 py-1 text-left text-xs font-bold text-foreground [overflow-wrap:anywhere]",
				tone === "signal" && "bg-signal/15 text-signal",
				className,
			)}
			{...props}
		/>
	);
}

export function Rule({ className, ...props }: React.ComponentProps<typeof Separator>) {
	return <Separator data-slot="section-rule" className={cn("bg-border", className)} {...props} />;
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
				"min-h-48 min-w-0 max-w-full border border-dashed border-border bg-muted/45",
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
