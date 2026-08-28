import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced";
import { easeOut } from "./motion";

export function PageEnter({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.32, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}
