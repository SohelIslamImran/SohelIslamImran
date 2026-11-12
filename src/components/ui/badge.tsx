import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"group/badge inline-flex h-auto min-h-5 min-w-0 max-w-full w-fit flex-wrap items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium tracking-[-0.005em] whitespace-normal break-words [overflow-wrap:anywhere] transition-[transform,translate,scale,rotate,background-color,border-color,box-shadow,color] duration-150 ease-route outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
				secondary:
					"bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] text-foreground [a]:hover:bg-[color-mix(in_srgb,var(--theme-ink)_10%,transparent)]",
				destructive:
					"bg-destructive/10 text-destructive focus-visible:ring-destructive/20 [a]:hover:bg-destructive/20",
				outline: "border-line-strong text-ink-soft [a]:hover:bg-muted [a]:hover:text-foreground",
				ghost: "hover:bg-muted hover:text-muted-foreground",
				link: "text-primary-text underline-offset-4 hover:underline",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Badge({
	className,
	variant = "default",
	render,
	...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return useRender({
		defaultTagName: "span",
		props: mergeProps<"span">(
			{
				className: cn(badgeVariants({ variant }), className),
			},
			props,
		),
		render,
		state: {
			slot: "badge",
			variant,
		},
	});
}

export { Badge, badgeVariants };
