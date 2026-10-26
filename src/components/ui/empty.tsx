import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty"
			className={cn(
				"flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-surface border-dashed p-6 text-center text-balance",
				className,
			)}
			{...props}
		/>
	);
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-header"
			className={cn("flex min-w-0 max-w-full flex-col items-center gap-2", className)}
			{...props}
		/>
	);
}

const emptyMediaVariants = cva(
	"mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				icon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function EmptyMedia({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
	return (
		<div
			data-slot="empty-icon"
			data-variant={variant}
			className={cn(emptyMediaVariants({ variant, className }))}
			{...props}
		/>
	);
}

export type EmptyTitleLevel = 2 | 3 | 4 | 5 | 6;

type EmptyTitleProps = Omit<React.ComponentProps<"h2">, "children"> & {
	children?: React.ReactNode;
	level?: EmptyTitleLevel;
};

function EmptyTitle({ className, children, level = 3, ...props }: EmptyTitleProps) {
	const Heading = `h${level}` as "h2" | "h3" | "h4" | "h5" | "h6";
	const content =
		typeof children === "string" && !children.trim()
			? "Nothing here yet."
			: (children ?? "Nothing here yet.");

	return (
		<Heading
			data-slot="empty-title"
			{...props}
			className={cn(
				"m-0 min-w-0 max-w-full break-words font-heading text-sm font-medium tracking-tight [overflow-wrap:anywhere]",
				className,
			)}
		>
			{content}
		</Heading>
	);
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="empty-description"
			className={cn(
				"m-0 min-w-0 max-w-full break-words text-sm/relaxed text-muted-foreground [overflow-wrap:anywhere] [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary-text",
				className,
			)}
			{...props}
		/>
	);
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-content"
			className={cn(
				"flex w-full max-w-full min-w-0 flex-col items-center gap-2.5 text-sm text-balance",
				className,
			)}
			{...props}
		/>
	);
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia };
