import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import { Card } from "./card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "./empty";
import { Separator } from "./separator";
import { buttonVariants } from "./button";

const pageShellVariants = cva("mx-auto w-full px-5 sm:px-8", {
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
});

export function MenuSurface({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="menu-surface"
			data-material="glass"
			className={cn(
				"rounded-surface border-0 bg-[color-mix(in_srgb,var(--theme-paper)_82%,var(--theme-muted-surface)_18%)] shadow-float backdrop-blur-2xl backdrop-saturate-150",
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
	className,
	width,
	spacing,
	...props
}: React.ComponentProps<"main"> & VariantProps<typeof pageShellVariants>) {
	return (
		<main
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
				"mb-3.5 text-xs font-extrabold uppercase tracking-[0.11em] leading-tight text-primary-text",
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
	return (
		<header
			data-slot="page-header"
			className={cn("mb-[clamp(42px,6vw,72px)] max-w-[920px]", className)}
			{...props}
		>
			{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
			<Heading
				className={cn(
					"max-w-[920px] font-[760] text-balance",
					level === 1
						? "text-[clamp(2.8rem,6.4vw,5.4rem)] leading-[0.94] tracking-[-0.065em]"
						: "text-[clamp(1.65rem,3vw,2.4rem)] leading-none tracking-[-0.055em]",
				)}
			>
				{title}
			</Heading>
			{description ? (
				<p className="mt-5 max-w-[680px] text-[clamp(1.05rem,2vw,1.3rem)] leading-[1.55] text-muted-foreground">
					{description}
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
	return (
		<div
			data-slot="section-intro"
			className={cn(
				"mb-[clamp(42px,6vw,64px)] grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-x-[clamp(28px,6vw,72px)] gap-y-4 max-[800px]:block",
				className,
			)}
			{...props}
		>
			{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : <span aria-hidden="true" />}
			<div>
				<h2 className="m-0 text-[clamp(2.25rem,4.6vw,4.3rem)] font-[760] leading-[0.96] tracking-[-0.06em] text-balance max-[800px]:mt-3.5">
					{title}
				</h2>
				{description ? (
					<p className="mt-4 max-w-[540px] text-lg leading-[1.55] text-muted-foreground max-[800px]:text-base">
						{description}
					</p>
				) : null}
			</div>
		</div>
	);
}

const surfaceVariants = cva(
	"rounded-surface border shadow-surface transition-[background-color,border-color,box-shadow,transform,translate,scale,rotate] duration-200 ease-route",
	{
		variants: {
			variant: {
				glass:
					"border-border/60 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-surface-solid)_98%,transparent),color-mix(in_srgb,var(--theme-surface-solid)_88%,var(--theme-accent-soft)))] backdrop-blur-2xl backdrop-saturate-150",
				solid: "border-border/70 bg-surface-solid",
				quiet: "border-border/60 bg-background/70 backdrop-blur-xl",
			},
		},
		defaultVariants: { variant: "glass" },
	},
);

export function Surface({
	className,
	variant,
	...props
}: React.ComponentProps<typeof Card> & VariantProps<typeof surfaceVariants>) {
	return (
		<Card
			data-material={variant === "solid" ? undefined : "glass"}
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
				"h-auto rounded-full border-border px-2 py-1 text-xs font-medium text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export function TagList({ items, className }: { items: readonly string[]; className?: string }) {
	return (
		<div data-slot="tag-list" className={cn("flex flex-wrap gap-1.5", className)}>
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
			className={cn("mt-7 flex flex-wrap gap-2.5", className)}
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
	return <a className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function StatusBadge({ className, ...props }: React.ComponentProps<typeof Badge>) {
	return (
		<Badge
			variant="secondary"
			className={cn(
				"h-auto rounded-full border-0 bg-signal/15 px-2 py-1 text-xs font-bold text-signal",
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
	...props
}: {
	title: React.ReactNode;
	description: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
} & Omit<React.ComponentProps<typeof Empty>, "children">) {
	return (
		<Empty
			className={cn("min-h-48 border border-dashed border-border bg-muted/45", className)}
			{...props}
		>
			<EmptyHeader>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			{children ? <EmptyContent>{children}</EmptyContent> : null}
		</Empty>
	);
}
