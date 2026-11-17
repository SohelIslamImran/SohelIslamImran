import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { prefersReducedMotion } from "@/components/motion";
import { cn } from "@/lib/utils";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Open disclosures per group, so opening one can close the others smoothly. */
const groups = new Map<string, Set<HTMLDetailsElement>>();
const closers = new WeakMap<HTMLDetailsElement, () => void>();

/**
 * A native `<details>` that opens and closes with a height animation in every
 * browser. Without JavaScript it is a plain disclosure; find-in-page still
 * opens it. Disclosures that share a `group` behave as an accordion. Under
 * reduced motion the change is instant.
 */
export function SmoothDetails({
	group,
	defaultOpen = false,
	summary,
	children,
	className,
	summaryClassName,
	contentClassName,
	onOpenChange,
}: {
	group?: string;
	defaultOpen?: boolean;
	summary: ReactNode;
	children: ReactNode;
	className?: string;
	summaryClassName?: string;
	contentClassName?: string;
	onOpenChange?: (open: boolean) => void;
}) {
	const detailsRef = useRef<HTMLDetailsElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const animation = useRef<Animation | null>(null);
	const direction = useRef<"open" | "close" | null>(null);

	useEffect(() => {
		const details = detailsRef.current;
		if (!details) return;
		const close = () => {
			if (!details.open) return;
			animate(false);
		};
		closers.set(details, close);
		if (group) {
			const set = groups.get(group) ?? new Set();
			set.add(details);
			groups.set(group, set);
		}
		return () => {
			closers.delete(details);
			if (group) groups.get(group)?.delete(details);
		};
	});

	const animate = (opening: boolean) => {
		const details = detailsRef.current;
		const content = contentRef.current;
		if (!details || !content) return;
		const from = details.open ? content.getBoundingClientRect().height : 0;
		animation.current?.cancel();
		if (prefersReducedMotion() || typeof content.animate !== "function") {
			details.open = opening;
			return;
		}
		if (opening) details.open = true;
		const to = opening ? content.scrollHeight : 0;
		direction.current = opening ? "open" : "close";
		const run = content.animate(
			[
				{ height: `${from}px`, opacity: from === 0 ? 0 : 1 },
				{ height: `${to}px`, opacity: opening ? 1 : 0 },
			],
			{ duration: opening ? 520 : 380, easing: EASE },
		);
		content.style.overflow = "clip";
		animation.current = run;
		run.onfinish = () => {
			animation.current = null;
			direction.current = null;
			content.style.overflow = "";
			if (!opening) details.open = false;
		};
		run.oncancel = () => {
			content.style.overflow = "";
		};
	};

	const onSummaryClick = (event: MouseEvent<HTMLElement>) => {
		const details = detailsRef.current;
		if (!details) return;
		event.preventDefault();
		const opening = !details.open || direction.current === "close";
		if (opening && group) {
			for (const other of groups.get(group) ?? []) {
				if (other !== details && other.open) closers.get(other)?.();
			}
		}
		animate(opening);
	};

	return (
		<details
			ref={detailsRef}
			open={defaultOpen}
			onToggle={(event) => onOpenChange?.(event.currentTarget.open)}
			className={className}
		>
			<summary
				onClick={onSummaryClick}
				className={cn("list-none [&::-webkit-details-marker]:hidden", summaryClassName)}
			>
				{summary}
			</summary>
			<div ref={contentRef} className={contentClassName}>
				{children}
			</div>
		</details>
	);
}
