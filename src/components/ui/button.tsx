import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Pill buttons. `default` is the accent fill — use it for one primary action
 * per view. `ink` is the calm high-contrast alternative, `outline` the neutral
 * secondary, `ghost` for toolbars, `link` for inline text actions.
 */
const buttonVariants = cva(
	"group/button relative inline-flex min-w-0 max-w-full shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding font-medium tracking-[-0.01em] whitespace-normal select-none outline-none transition-[transform,translate,scale,rotate,background-color,border-color,box-shadow,color,opacity] duration-200 ease-trace focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ring active:scale-[.97] disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 aria-invalid:border-destructive aria-invalid:outline-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [overflow-wrap:anywhere]",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground shadow-[0_1px_2px_var(--theme-shadow-soft),0_8px_22px_var(--theme-accent-shadow),inset_0_1px_rgb(255_255_255/0.18)] hover:bg-[color-mix(in_srgb,var(--theme-accent)_88%,var(--theme-ink))] dark:hover:bg-[color-mix(in_srgb,var(--theme-accent)_86%,white)]",
				ink: "bg-foreground text-background shadow-[0_1px_2px_var(--theme-shadow-soft),0_8px_22px_var(--theme-shadow)] hover:bg-[color-mix(in_srgb,var(--theme-ink)_86%,var(--theme-paper))]",
				outline:
					"border-line-strong bg-surface-solid text-foreground shadow-[0_1px_2px_var(--theme-shadow-soft)] hover:border-[color-mix(in_srgb,var(--theme-ink)_28%,transparent)] hover:bg-surface-raised aria-expanded:bg-muted",
				secondary:
					"bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] text-foreground hover:bg-[color-mix(in_srgb,var(--theme-ink)_10%,transparent)] aria-expanded:bg-[color-mix(in_srgb,var(--theme-ink)_10%,transparent)]",
				ghost:
					"text-ink-soft hover:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] hover:text-foreground aria-expanded:bg-[color-mix(in_srgb,var(--theme-ink)_6%,transparent)] aria-expanded:text-foreground",
				destructive:
					"bg-[color-mix(in_srgb,var(--theme-destructive)_12%,transparent)] text-destructive hover:bg-[color-mix(in_srgb,var(--theme-destructive)_18%,transparent)] focus-visible:outline-destructive",
				link: "rounded-md px-0 text-primary-text underline-offset-4 hover:underline active:scale-100",
			},
			size: {
				default:
					"min-h-11 gap-2 px-5 text-[15px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
				xs: "min-h-7 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
				sm: "min-h-9 gap-1.5 px-3.5 text-[13px] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
				lg: "min-h-[52px] gap-2 px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
				icon: "size-11",
				"icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-9",
				"icon-lg": "size-[52px]",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
