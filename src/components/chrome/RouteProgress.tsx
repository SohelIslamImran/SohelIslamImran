import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * A hairline trace across the top of the viewport while a navigation waits on
 * its loader. Appears only after 140ms so fast navigations never flicker.
 * Decorative; it never blocks interaction.
 */
export function RouteProgress() {
	const pending = useRouterState({ select: (state) => state.status === "pending" });
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!pending) {
			setVisible(false);
			return;
		}
		const timer = window.setTimeout(() => setVisible(true), 140);
		return () => window.clearTimeout(timer);
	}, [pending]);

	return (
		<div
			data-slot="route-progress"
			aria-hidden="true"
			className={cn(
				"pointer-events-none fixed inset-x-0 top-0 z-(--z-overlay) h-[2px] overflow-hidden transition-opacity duration-300 ease-trace",
				visible ? "opacity-100" : "opacity-0",
			)}
		>
			{visible ? (
				<span className="absolute inset-y-0 left-0 w-1/3 animate-progress-indeterminate bg-[linear-gradient(90deg,transparent,var(--theme-accent-line)_70%,color-mix(in_srgb,var(--theme-accent-line)_40%,white))] shadow-[0_0_10px_var(--theme-accent-glow)] motion-reduce:w-full motion-reduce:animate-none motion-reduce:bg-primary" />
			) : null}
		</div>
	);
}
