/**
 * Spring presets for the CMS (Motion). See docs/cms/DESIGN.md.
 * Critically damped by default; bounce only after a gesture that carried
 * momentum (a drag release). Use with `useReducedMotion()` and fall back to
 * `REDUCED` (an opacity-only cross-fade) when it returns true.
 */
import type { Transition } from "motion/react";

/** Small state changes: toggles, indicators, chips. */
export const SPRING_SNAPPY: Transition = { type: "spring", bounce: 0, duration: 0.28 };
/** Moving or resizing something on screen: active rail pill, tab underline, row reorder. */
export const SPRING_MOVE: Transition = { type: "spring", bounce: 0, duration: 0.4 };
/** Surfaces arriving: popovers, dialogs, drawers, sheets. */
export const SPRING_SURFACE: Transition = { type: "spring", bounce: 0.12, duration: 0.36 };
/** After a drag release only. */
export const SPRING_MOMENTUM: Transition = { type: "spring", bounce: 0.2, duration: 0.4 };
/** Reduced motion: a short cross-fade, no movement. */
export const REDUCED: Transition = { duration: 0.15, ease: "linear" };
