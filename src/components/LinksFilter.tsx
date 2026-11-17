import type { KeyboardEvent } from "react";
import { motion } from "motion/react";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

export const linkKinds = ["all", "social", "contact", "work", "story", "other"] as const;
export type LinkKind = (typeof linkKinds)[number];

export const linkKindLabels: Record<LinkKind, string> = {
	all: "All links",
	social: "Social",
	contact: "Contact",
	work: "Work",
	story: "Story",
	other: "Other",
};

export function LinksFilter({
	value,
	onChange,
	counts,
}: {
	value: LinkKind;
	counts?: Record<LinkKind, number>;
	onChange: (value: LinkKind) => void;
}) {
	// Kinds with nothing in them are noise on a phone; keep "all" and the current one.
	const kinds = linkKinds.filter(
		(kind) => kind === "all" || kind === value || !counts || counts[kind] > 0,
	);
	const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		const next =
			event.key === "ArrowRight"
				? index + 1
				: event.key === "ArrowLeft"
					? index - 1
					: event.key === "Home"
						? 0
						: event.key === "End"
							? kinds.length - 1
							: -1;
		if (next < 0 || next >= kinds.length) return;
		event.preventDefault();
		event.stopPropagation();
		const target = Array.from(event.currentTarget.parentElement?.querySelectorAll("button") ?? [])[
			next
		] as HTMLButtonElement | undefined;
		onChange(kinds[next]);
		target?.focus({ preventScroll: true });
		const scroller = target?.parentElement;
		if (target && scroller) {
			const bounds = scroller.getBoundingClientRect();
			const item = target.getBoundingClientRect();
			if (item.left < bounds.left) scroller.scrollLeft -= bounds.left - item.left;
			else if (item.right > bounds.right) scroller.scrollLeft += item.right - bounds.right;
		}
	};

	return (
		<div
			data-slot="links-filter"
			className="glass w-full max-w-full overflow-hidden rounded-full border border-glass-border p-1"
		>
			<span id="links-filter-label" className="sr-only">
				Filter links by category
			</span>
			<ToggleGroup
				value={[value]}
				onValueChange={(next) => {
					const kind = next[0];
					if (kind && linkKinds.includes(kind as LinkKind)) onChange(kind as LinkKind);
				}}
				aria-labelledby="links-filter-label"
				className="flex w-full min-w-0 flex-nowrap items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				spacing={0}
			>
				{kinds.map((kind) => (
					<ToggleGroupItem
						key={kind}
						value={kind}
						className="relative isolate h-auto min-h-11 min-w-0 flex-1 basis-0 rounded-full! border-0 bg-transparent !px-3.5 text-center text-[13px] font-medium text-muted-foreground transition-[color,transform,translate,scale,rotate] duration-220 ease-route hover:bg-transparent hover:text-foreground focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:scale-[.98] aria-pressed:bg-transparent aria-pressed:text-primary-foreground aria-pressed:shadow-none! data-[pressed]:bg-transparent data-[pressed]:text-primary-foreground max-[639px]:flex-auto max-[639px]:basis-auto max-[639px]:!px-2.5"
						aria-controls="link-results"
						onKeyDown={(event) => moveFocus(event, kinds.indexOf(kind))}
					>
						{value === kind ? (
							<motion.span
								className="pointer-events-none absolute inset-0 -z-1 rounded-full bg-primary shadow-[0_8px_18px_var(--theme-accent-glow)]"
								aria-hidden="true"
								layoutId="links-filter-indicator"
								transition={{ type: "spring", duration: 0.32, bounce: 0.06 }}
							/>
						) : null}
						<span className="relative z-[1] inline-flex items-center gap-2 whitespace-nowrap">
							{kind === "all" ? "All" : linkKindLabels[kind]}
							{counts ? (
								<span className="font-mono text-[11px] tabular-nums opacity-75">
									{counts[kind]}
								</span>
							) : null}
						</span>
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
