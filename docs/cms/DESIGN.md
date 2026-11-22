# CMS design pass: brief

The CMS works, but it reads as a skeleton. This pass makes every page and control feel modern, alive, and calm: simple and minimal, with Apple-level craft. Owner feedback: "navigating through the rail feels like the full page jumps or re-renders", "the UI seems so basic and just skeleton", "add life to it".

## Diagnosis: the rail navigation jump

The shell does not remount (checked with a MutationObserver: rail, top bar and `<body>` persist; `main` swaps one child). The jump has these causes:

1. Route content is replaced instantly, with no transition, so heights and headings snap.
2. The window scroll resets to the top in one frame, and the document height changes abruptly.
3. The active rail item jumps from link to link: the highlight `<span>` is removed from one link and inserted into the next.
4. With "always show scrollbars" on macOS, the whole layout shifts sideways when a page becomes tall enough to scroll. `scrollbar-gutter: stable` now ships in `src/styles/cms/motion.css`.
5. In development, a lazy route chunk can hold the old page for a beat with no pending feedback.

## Principles

- **Simplicity, not minimalism.** Strip noise; keep hierarchy obvious through order, spacing, weight, and contrast. Fewer borders, more space. One primary action per view.
- **Response.** Feedback on pointer-down (`.cms-press`). No artificial delays on the input path. Hover states on every interactive element (pointer: fine only).
- **Continuity.** Things move from where they are. Shared indicators slide (Motion `layoutId`), not teleport. Route content cross-fades with a 6px rise (`.cms-enter`) while the shell stays still.
- **Springs.** Use the presets in `src/components/cms/motion.ts`: critically damped by default, bounce only after a drag. CSS transitions for simple hover and color changes, using the duration and curve tokens in `motion.css`.
- **Spatial consistency.** Popovers and menus scale from their trigger (`transform-origin` at the trigger). Drawers exit the way they came in.
- **Materials.** Translucent glass only for floating chrome (top bar when scrolled, command bar, drawers, popovers). Content panels stay solid. Never glass on glass.
- **Typography.** Geist. Large headings tighten (`-0.02em`), body near 0, small labels slightly positive. Use `tabular-nums` for every number that changes.
- **States.** Every control has default, hover, pressed, focus-visible (`--cms-ring`), disabled, invalid, and loading states. Every async view has a skeleton (`.cms-skeleton`) and a designed empty state, not bare text.
- **Life, not confetti.** Small, purposeful moments: a number that ticks when it changes, the save status that morphs Saving → Saved, a publish that sweeps the pipeline bar, a row that settles into place after reorder. Nothing loops except live indicators, and none faster than about 1 Hz.

## Hard constraints

- Reduced motion: replace movement with a short opacity cross-fade (`REDUCED` preset, `@media (prefers-reduced-motion: reduce)`). Respect `prefers-reduced-transparency` on glass.
- Animate only `transform`, `translate`, `scale`, `rotate`, and `opacity` (plus colors). No layout-property animation except the existing rail grid column. In Tailwind v4, `translate-*`/`scale-*` emit longhands: use `transition-transform` or list the longhands (see `AGENTS.md`).
- Both themes are first class; all six accents must work. Never use hue alone for state.
- Touch targets at least 44px on coarse pointers. Keyboard: visible focus everywhere, no focus loss after an animation, Escape closes the topmost layer.
- Phone width 390px: no horizontal scroll.
- Keep the existing behavior and tests: draft store, save queue, validation, release, history, analytics. This is a visual and interaction pass, not a data-model change.
- No new dependencies. `motion` (Motion for React) and `@base-ui/react` are already installed.
- Copy rules in `AGENTS.md` still apply.

## Workstreams and file ownership

Each workstream edits only its files, plus its own stylesheet. `src/components/cms/motion.ts`, `src/styles/cms/motion.css`, `src/styles/cms.css`, and `src/components/ui/*` are shared: change them only if unavoidable, and say so in the report.

| Workstream | Owns | Stylesheet |
| --- | --- | --- |
| **Shell** | `src/components/cms/shell/*`, `src/routes/cms.tsx`, route transition, rail, top bar, pipeline bar, command bar, dialogs, access screen, mobile drawer and action bar | `src/styles/cms/shell.css` |
| **Fields** | `src/components/cms/fields/*`, `src/components/cms/sections/*`, `src/routes/cms/content.$section.tsx` | `src/styles/cms/fields.css` |
| **Pages** | `src/routes/cms/{index,analytics,release,history,activity,library}.tsx`, `src/components/cms/analytics/*`, `src/components/cms/release/*` | `src/styles/cms/pages.css` |

### Shell hooks for pages

- `#release-gate` (`RELEASE_GATE_ID` in `src/components/cms/shell/CmsShell.tsx`): put this id on the Changes page's publish gate. On `/cms/release`, the top-bar Publish, the phone action bar, and the command bar's Publish scroll to the gate and focus it instead of opening a second publish dialog. Without the id they fall back to the dialog.
- After a command-bar navigation, focus moves to the destination's first `h1` inside `#main-content` (or to `main`), so every page should render one `h1`.

## Review loop

Every builder's branch is reviewed by an agent from a different builder, page by page and control by control, against this brief, with screenshots in both themes at 1440px and 390px. Findings go back to the builder; the loop repeats until a review returns no findings at the "must fix" or "should fix" level. Rounds are recorded in `docs/cms/REVIEW.md`.
