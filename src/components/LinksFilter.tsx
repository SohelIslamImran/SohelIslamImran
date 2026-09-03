import type { KeyboardEvent } from "react";
import { motion } from "motion/react";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

export const linkKinds = ["all", "social", "contact", "work", "story", "other"] as const;
export type LinkKind = (typeof linkKinds)[number];

interface LinksFilterProps {
	value: LinkKind;
	onChange: (value: LinkKind) => void;
}

export function LinksFilter({ value, onChange }: LinksFilterProps) {
	const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		const next =
			event.key === "ArrowRight"
				? index + 1
				: event.key === "ArrowLeft"
					? index - 1
					: event.key === "Home"
						? 0
						: event.key === "End"
							? linkKinds.length - 1
							: -1;
		if (next < 0 || next >= linkKinds.length) return;
		event.preventDefault();
		event.stopPropagation();
		const target = Array.from(event.currentTarget.parentElement?.querySelectorAll("button") ?? [])[
			next
		] as HTMLButtonElement | undefined;
		onChange(linkKinds[next]);
		target?.focus();
	};

	return (
		<div className="mb-6 w-full max-w-full overflow-hidden rounded-[22px] border border-border/60 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-surface-solid)_98%,transparent),color-mix(in_srgb,var(--theme-surface-solid)_88%,var(--theme-accent-soft)))] p-1 shadow-accent backdrop-blur-xl">
			<ToggleGroup
				value={[value]}
				onValueChange={(next) => {
					const kind = next[0];
					if (kind && linkKinds.includes(kind as LinkKind)) onChange(kind as LinkKind);
				}}
				aria-label="Link categories"
				className="flex w-full min-w-0 flex-nowrap gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[640px]:items-center"
				spacing={0}
			>
				{linkKinds.map((kind) => (
					<ToggleGroupItem
						key={kind}
						value={kind}
						className="relative isolate h-auto min-h-10 min-w-0 flex-1 basis-0 rounded-[16px] border-0 bg-transparent !px-3.5 text-center text-[13px] font-medium capitalize text-muted-foreground transition-[color,transform,translate,scale,rotate] duration-220 ease-route hover:bg-transparent hover:text-foreground focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring active:scale-[.98] aria-pressed:bg-transparent aria-pressed:text-primary-foreground data-[pressed]:bg-transparent data-[pressed]:text-primary-foreground max-[639px]:min-w-[56px] max-[639px]:!px-1"
						aria-controls="link-results"
						onKeyDown={(event) => moveFocus(event, linkKinds.indexOf(kind))}
					>
						{value === kind ? (
							<motion.span
								className="pointer-events-none absolute inset-0 z-0 rounded-[16px] bg-primary shadow-[0_8px_18px_var(--theme-accent-glow)]"
								aria-hidden="true"
								layoutId="links-filter-indicator"
								transition={{ type: "spring", duration: 0.32, bounce: 0.06 }}
							/>
						) : null}
						<span className="relative z-[1]">{kind}</span>
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
