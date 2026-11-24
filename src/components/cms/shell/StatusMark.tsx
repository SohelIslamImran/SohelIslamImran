import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { REDUCED, SPRING_SNAPPY } from "../motion";
import { useLiveReducedMotion } from "./use-live-reduced-motion";

type Phase = "synced" | "saved" | "saving" | "dirty" | "ahead" | "invalid";

function Mark({ phase, reduced }: { phase: Phase; reduced: boolean }) {
	const present = useIsPresent();
	switch (phase) {
		case "synced":
		case "saved":
			return (
				<>
					<circle cx="8" cy="8" r="6.4" />
					{phase === "saved" && !reduced ? (
						<motion.path
							d="m5 8 2 2 4-4"
							initial={{ pathLength: 0 }}
							animate={{ pathLength: 1 }}
							transition={SPRING_SNAPPY}
						/>
					) : (
						<path d="m5 8 2 2 4-4" />
					)}
				</>
			);
		case "saving":
			return (
				<path className={present ? "cms-status-arc" : undefined} d="M8 1.6a6.4 6.4 0 1 1-6.4 6.4" />
			);
		case "dirty":
			return <circle cx="8" cy="8" r="1.7" fill="currentColor" stroke="none" />;
		case "ahead":
			return <path d="m8 2 6 11H2Z" />;
		case "invalid":
			return <path d="m8 1.9 6.5 11.8h-13ZM8 6v3m0 2.3v.1" />;
	}
}

export function StatusMark({ phase }: { phase: Phase }) {
	const reduced = useLiveReducedMotion();
	return (
		<span className="cms-status-mark" aria-hidden="true">
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.svg
					key={phase}
					width="14"
					height="14"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.6"
					strokeLinecap="round"
					strokeLinejoin="round"
					initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={
						reduced
							? { opacity: 0, transition: REDUCED }
							: { opacity: 0, scale: 0.6, transition: { duration: 0.12, ease: [0.55, 0, 1, 0.45] } }
					}
					transition={reduced ? REDUCED : SPRING_SNAPPY}
				>
					<Mark phase={phase} reduced={reduced} />
				</motion.svg>
			</AnimatePresence>
		</span>
	);
}
