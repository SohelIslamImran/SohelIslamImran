import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced";
import { enterMotionEnabled } from "@/lib/enter";
import { easeOut } from "./motion";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const play = !reduced && enterMotionEnabled();
  return (
    <motion.div
      className={className}
      initial={play ? { opacity: 0, y: 8, filter: "blur(4px)" } : false}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.48, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

export function RevealIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const play = !reduced && enterMotionEnabled();
  return (
    <motion.div
      className={className}
      initial={play ? { opacity: 0, y: 14 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.5, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}
