import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

interface MagneticProps {
	children: ReactNode;
	/** Fraction of the pointer offset the child follows. Defaults to 0.28. */
	strength?: number;
	/** Maximum travel in px. Defaults to 8. */
	max?: number;
	className?: string;
}

/**
 * Lets a primary CTA lean gently toward the pointer. Mouse/trackpad only,
 * disabled under reduced motion, springs back on leave. Wrap one control.
 */
export function Magnetic({ children, strength = 0.28, max = 8, className }: MagneticProps) {
	const reduceMotion = useReducedMotion() === true;
	const rectRef = useRef<DOMRect | null>(null);
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const springX = useSpring(x, { stiffness: 260, damping: 20, mass: 0.5 });
	const springY = useSpring(y, { stiffness: 260, damping: 20, mass: 0.5 });
	const clamp = (value: number) => Math.max(-max, Math.min(max, value));

	return (
		<motion.span
			data-slot="magnetic"
			className={cn("inline-flex max-w-full", className)}
			style={{ x: springX, y: springY }}
			onPointerEnter={(event) => {
				rectRef.current = event.currentTarget.getBoundingClientRect();
			}}
			onPointerMove={(event) => {
				if (reduceMotion || event.pointerType !== "mouse") return;
				const rect = rectRef.current ?? event.currentTarget.getBoundingClientRect();
				x.set(clamp((event.clientX - (rect.left + rect.width / 2)) * strength));
				y.set(clamp((event.clientY - (rect.top + rect.height / 2)) * strength));
			}}
			onPointerLeave={() => {
				rectRef.current = null;
				x.set(0);
				y.set(0);
			}}
		>
			{children}
		</motion.span>
	);
}
