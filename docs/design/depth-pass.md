# Depth pass — second design round

Read `docs/design/redesign-brief.md` and `docs/design/primitives.md` first. This
file adds to them. Where they disagree, this file wins.

## Why this round exists

The owner reviewed the "Trace" redesign. It is clean, but he wants more: more
unique, more creative, more interactive, with real depth (3D) in places, and
creativity that is **about his actual skills and career**, not decoration.

New hero line: **"I build every layer of a product, from interface to release."**
The site should prove that sentence. The front of things is the interface (a web product, never called "screen"); behind
it are the API, data, access rules, cloud, and release. "Behind" is literal:
use depth, layers, and things you can look behind.

## Who he is (use this, never invent beyond `docs/sohel-profile/`)

- Self-taught. First code late 2020. React Native from 2021 (nearly three years
  on one events app at Tilleli). Kuno since Dec 2023: mobile → full stack → Lead
  Full Stack Engineer (Mar 2026).
- Works across React/TanStack interfaces, Bun + Elysia services, PostgreSQL/Redis,
  auth and authorization, AWS + Terraform, CI/CD, release tooling, Playwright.
- Open source: `expo-in-app-updates` (Kotlin + Swift + TypeScript Expo module),
  `ghosttime` (terminal animation CLI), `expo-import-cost`, TailSync (Swift).
- Kuno details stay public-safe. No private metrics, no invented numbers. Dated
  metrics keep their dates. All facts come from CMS content props
  (`src/content/initial.ts` is the seed) — do not hardcode new facts in JSX.

## Creative directions (ideas, not a checklist — pick what is best, invent more)

- **Depth = the stack.** Layered planes in real CSS 3D (`perspective`,
  `transform-style: preserve-3d`), pointer/gyro tilt, an exploded stack you can
  pull apart, a request pulse that travels front to back.
- **Not mobile-specific.** For more than a year his work at Kuno has been web
  and full stack. Mobile is history and one open-source project, not the
  identity. Never use a phone as the symbol for him or for "the screen"; the
  interface is a web product. A phone may appear only inside the
  `expo-in-app-updates` project itself.
- **The terminal.** `ghosttime` is a terminal toy; a small real terminal you can
  type in (whoami, ls, open …) is skill-true.
- **The release.** Pipelines, checks going green, a rollback switch, a deploy
  button that actually "ships" something on the page.
- **Going deeper.** The career is a descent: screens (2021) → services → data →
  cloud → release (2026). Scroll can be depth.
- Tilt/parallax on project artwork, scroll-driven reveals, shared-element and
  view transitions, magnetic and spring micro-interactions, cursor light,
  keyboard easter eggs, satisfying copy/toggle feedback.

Restraint still matters: Apple-like calm, one accent, generous space. One or two
"wow" moments per page, and every other element quietly excellent. No effect
without a reason tied to the content.

## Hard rules

- No new npm dependencies (no three.js). CSS 3D, SVG, canvas 2D, and
  `motion/react` are enough. Keep JS small; lazy-mount heavy interactive pieces.
- SSR-safe: no `window` at render; no hydration mismatches; content readable
  with JS off.
- `prefers-reduced-motion`: every animation has a still fallback. No autoplay
  motion that cannot be ignored. Pointer effects need a touch and keyboard
  equivalent or must be purely decorative (`aria-hidden`).
- Keyboard and screen reader: interactive widgets have roles, labels, focus
  rings. WCAG AA contrast in light and dark, all six accents.
- 60fps: animate only `transform`/`opacity`; use `will-change` sparingly; pause
  off-screen loops (IntersectionObserver).
- No horizontal overflow at 390px. Works at 390, 768, 1440.
- Tailwind v4: `translate-*`/`scale-*`/`rotate-*` need `transition-transform`
  or the longhands (see AGENTS.md).
- Stay inside the files you own. Other agents are editing other files at the
  same time; never revert or "fix" files you do not own, and expect transient
  type errors from them. If you need a shared primitive, create a new file in
  your own folder. `src/styles/tailwind.css` is shared: re-read it right before
  each edit and only append/modify one block fenced by a comment naming your
  area.
- Do not commit, push, or stash. Do not edit `docs/sohel-profile/` or `cms.tsx`.

## How to check your work

- `bun run typecheck`, `bun run check` (oxlint + oxfmt; tabs), `bun run test`,
  `bun run build` before you finish. Report failures honestly, and say which
  come from files you do not own.
- Visual QA with Playwright (already cached, do not install):
  `import { chromium } from '/Users/sohelislamimran/.bun/install/cache/playwright-core@1.65.0@@@1/index.mjs'`
  (if no browser binary is found, use `channel: 'chrome'`).
  Start your own dev server on your own port:
  `bunx vite dev --port <port> --strictPort`, open `http://localhost:<port>`
  (not 127.0.0.1). Theme: `localStorage['portfolio-theme'] = 'light' | 'dark'`.
  Take screenshots at 1440 and 390, light and dark, look at them (Read the PNG),
  and fix what looks wrong. Check the console for errors and hydration warnings.
  Stop your server when done. Put scripts and screenshots in your scratch dir,
  not in the repo.

## Final report (keep it under 300 words)

What you changed (files), the main new interactions, what you verified, what you
could not verify, anything you left unfinished.
