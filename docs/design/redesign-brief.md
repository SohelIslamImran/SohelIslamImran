# Redesign brief — "Trace"

This is the shared direction for the full portfolio redesign. Every agent working on
the redesign reads this file completely first, then works only inside the files it
was given.

## 1. Who the site is for, and what it must do

Sohel Islam Imran is a Lead Full Stack Engineer at Kuno. His line is: _"I build every layer of a product, from interface to release."_ Visitors are hiring managers,
founders, engineers evaluating his open source, and people arriving from a social
profile. In ten seconds they should know who he is, what he is good at, and feel
that the site itself was made with unusual care. In two minutes they should be able
to see the work, the path, and how to reach him.

The result must feel like an Apple product page crossed with a hand-built
engineer's tool: calm, generous, precise, with a few moments of real delight.
Not a template. Not a dashboard. Not "glassmorphism everywhere".

## 2. The concept: Trace

One idea runs through the whole site: **a single request traced through every
layer of a product.** Interface → API → Data → Access → Infrastructure → Release.
It is what Sohel actually does, so the design shows it instead of saying it.

The motif appears as:

- **The trace line.** A thin accent-colored line with a small glowing dot that
  travels. It is the hero's centerpiece, the story page's progress rail, the
  section markers, the loading/transition accent. Use it sparingly; it is the
  signature, not wallpaper.
- **Layers.** Soft stacked planes (cards slightly offset in depth) wherever the
  content is about the stack: hero, capabilities, project anatomy.
- **Mono coordinates.** Small monospace labels such as `01 — Work`,
  `23.81°N 90.41°E`, `UTC+6`, `v0.12.0`. They give the calm layout an engineer's
  texture.

## 3. Visual system

Tokens live in `src/styles/tailwind.css` (owned by the foundation agent). Page
agents use tokens and the shared primitives; they do not invent new colors.

- **Canvas.** Truly neutral, Apple-like. Light: near-white paper (`#fbfbfd`),
  ink `#1d1d1f`, muted `#6e6e73`, hairlines at low alpha, pure white raised
  surfaces. Dark: near-black (`#0a0a0c`), ink `#f5f5f7`, muted `#a1a1a6`,
  surfaces `#161618`/`#1c1c1f`. Remove the current blue tint from paper, ink,
  lines, and shadows.
- **Accent.** One accent at a time, chosen by the existing accent switcher (keep
  all six ids and the storage keys and boot script contract). Accent is for the
  trace line, links, focus, one primary button per view, and small highlights.
  Large areas stay neutral. Text on/near accent must pass WCAG AA in both themes.
- **Type.** Geist Variable for everything; Geist Mono Variable for the small
  coordinate labels and code. Display: `clamp(2.6rem, 7.2vw, 6.25rem)`, weight
  ~620, tracking `-0.045em`, leading `0.98`, `text-wrap: balance`. Section titles:
  `clamp(2rem, 4.4vw, 3.5rem)`. Body: 17–19px, leading 1.55, max 62ch,
  `text-wrap: pretty`. Mono labels: 11–12px, uppercase, tracking `0.08em`.
  Numbers use tabular figures.
- **Shape.** Buttons and chips are full pills. Cards 28px radius; large bento
  tiles 32px; inner elements 14–18px (concentric radii). Hairline borders, very
  soft large shadows, an inset top highlight on raised surfaces.
- **Space.** Sections breathe: `clamp(88px, 12vw, 168px)` between major sections.
  Content max width 1200px; reading column 680px.
- **Materials.** Glass (blur + saturation + translucent fill) only for floating
  chrome: the nav dock, the command palette, popovers. Content sits on solid
  surfaces.

## 4. Motion and interaction

- Springs and `cubic-bezier(0.22, 1, 0.36, 1)`. 180–260ms for controls,
  450–700ms for reveals. Nothing bounces more than a hair.
- Scroll reveals: fade + 14px rise + 6px blur clearing, once, staggered 40–70ms.
  Content must be visible without JS and under reduced motion (no "stuck at
  opacity 0" risk: SSR renders visible content; reveal only enhances after
  hydration, or use CSS `animation-timeline: view()` with a static fallback).
- Hover effects only for `pointer: fine`. Press states (`scale .97`) everywhere.
- Cards may use a cursor-following spotlight/border glow (shared primitive).
- Primary CTAs may be subtly magnetic.
- `prefers-reduced-motion`: all movement becomes instant or a plain fade. The
  trace dot stops traveling and just sits lit.
- Remember the AGENTS.md Tailwind v4 rule: `translate-*`/`scale-*`/`rotate-*`
  need `transition-transform` or the longhands listed in `transition-[...]`.
- 60fps: animate only `transform`, `opacity`, `filter`; no layout thrash; pause
  loops when off-screen.

## 5. Global chrome (foundation agent)

- **Nav dock.** A floating glass pill, centered at the top on desktop, with the
  SI mark, Work / Story / Résumé / Links, a `⌘K` search trigger, and the theme
  control. A sliding indicator follows hover/focus and rests on the current
  route. It condenses slightly after scrolling. On small screens it becomes a
  floating bottom dock within thumb reach (respect safe-area insets), or a
  compact top pill with a sheet menu — whichever is cleaner; keep 44px targets.
- **Command palette (⌘K / Ctrl+K / "/").** Navigate pages, jump to any project,
  open any profile link, switch theme and accent, copy email. Fuzzy filter,
  arrow keys, Enter, Esc, focus trap, restores focus, proper `dialog`/`combobox`
  ARIA. Built with `@base-ui/react` Dialog (already installed) or a native
  `<dialog>`. Data comes from the root loader/public content; keep draft data out.
- **Route transitions.** Short cross-fade/rise (keep the existing focus
  management contract in `__root.tsx` and `src/lib/route-focus.ts`). View
  Transitions API may enhance, never be required.
- **Footer.** A calm closing scene: oversized "Sohel Islam Imran" wordmark (or
  a big "Let's talk" line) with live Dhaka local time, the build credit, the
  source link, and the secondary routes (Field notes, Links, RSS).
- **Status pages.** 404 and error share the trace motif (a line that loses its
  way / a paused dot), with rewritten friendly copy.

## 6. Pages

### Home (`/`)

1. **Hero.** Mono eyebrow with a live status dot (availability + Dhaka local
   time). The headline from `content.hero.title` set very large. Intro. Two
   actions. Small portrait when an avatar exists (`public/images/sohel-linkedin-*.webp`
   is the existing fallback portrait).
   **Signature interactive piece — the Stack Trace:** a tilted stack of six
   translucent layers (Interface, API, Data, Access, Infrastructure, Release).
   A lit dot travels down the trace line through them on a loop. Hovering,
   focusing, or tapping a layer lifts it out of the stack and shows one plain
   sentence about what Sohel does at that layer plus 3–4 tools. The stack tilts
   subtly with the pointer. It is a real, keyboard-operable control (tablist or
   listbox semantics), works by touch, and collapses to a clean vertical list
   under reduced motion and on narrow screens.
2. **At a glance — bento grid.** 6–8 tiles of mixed sizes: animated count-up
   metrics (all four `hero.metrics`, labels keep their dates); "Now" tile
   (current role at Kuno); location tile (Dhaka, UTC+6, live clock, a minimal
   dotted globe or coordinate graphic); open-source tile with a copyable
   `npx expo install expo-in-app-updates` command; the testimonial quote; a
   slow tool marquee built from capabilities.
3. **Selected work.** Three featured projects as large, Apple-style feature
   cards, each with its own generated artwork (see Project posters).
4. **Path.** The career timeline, interactive: a vertical trace line with role
   nodes; the active role expands to show highlights and tools.
5. **How I work.** Capabilities and engineering principles, merged into one
   section that reuses the layer idea rather than two separate grids.
6. **Background.** About copy + link to the story.
7. **Contact.** A large, confident closing block: title, intro, a copy-email
   button with a success state, GitHub/LinkedIn.

### Work (`/work`, new `/work/$slug`)

- Index: keep the URL-backed `group` filter and its keyboard behavior. Product
  and open-source projects as rich cards with posters; experiments as a tighter
  "lab" grid. Smooth layout animation when the filter changes.
- **Project posters.** There are no screenshots, so each project gets a small
  generated, animated, theme-aware artwork in CSS/SVG keyed by project id, with
  a tasteful generic fallback for unknown ids (CMS can add projects):
  `kuno` (learning pathway nodes connecting), `expo-in-app-updates` (a phone
  frame with an update progress ring/"Update available" sheet), `tilleli`
  (ticket stub with perforation and map pin), `portfolio` (browser frame with
  SSR stream lines), `ghosttime` (terminal with an animated ASCII ghost/ANSI
  shimmer), `tailsync` (two devices and a peer-to-peer beam), `android-mac-display`
  (Mac + Android mirrored over a USB line), `expo-import-cost` (editor lines
  with inline size annotations). Decorative: `aria-hidden`, paused off-screen,
  static under reduced motion.
- **Project detail page `/work/$slug`.** A short case-study layout from existing
  fields only: poster hero, title, summary, role/year/status facts, description,
  highlights as an "anatomy" list, metrics, tags, external links, and
  previous/next project navigation. Unknown slug → `notFound()`. Add SEO head,
  JSON-LD, and include the paths in `sitemap.xml`.

### Story (`/story`)

A long-form reading experience. Big chapter numerals, the trace line as a
scroll-progress rail with chapter nodes (keep the existing chapter anchors,
hash handling, and progress logic), the pull quote as a full-width moment, the
`artifact` line of each chapter as a small "takeaway" card, and the source link
at the end. Reading column 680px.

### Résumé (`/resume`)

A crisp document on a raised sheet. Keep the print stylesheet contract (A4,
10mm, hides chrome, two columns, 30mm portrait) and the "Print / save PDF"
action. Screen version gets the new type and spacing, sticky side facts, and
clear hierarchy.

### Links (`/links`)

A personal link hub: profile card (portrait, name, role, one line), featured
links as large tiles, the rest as a tidy list with platform icons, the
URL-backed `kind` filter with smooth filtering (a recent fix restored smooth
links filtering — do not regress it), copy-email affordance.

### Field notes (`/field-notes`)

Currently empty. Design a warm, honest empty state (a quiet illustrated
coordinate/compass scene with the trace line) and keep the entry layout ready
for when entries exist.

### CMS (`/cms`)

Owner tool. Do not redesign its behavior. It should simply inherit the new
tokens and look tidy.

## 7. Copy rules

Applies to `src/content/initial.ts` and any hardcoded UI copy.

- Plain words, short sentences, active voice, first person. A smart 15-year-old
  should understand every line. Lead with what the reader gets.
- Specific over impressive. Name the mechanism ("one API over Play Core and the
  App Store") rather than a claim ("robust solution").
- **Never invent facts.** All facts come from `docs/sohel-profile/` (read its
  `README.md` first) and the existing content. No new employers, dates,
  metrics, technologies, scale, or impact. Kuno stays public-safe and
  generalized. Dated metrics keep their date in the label. Respect the "claims
  to avoid" list in `docs/sohel-profile/portfolio-content.md`. The hardship
  background is told plainly, never as marketing.
- No hype words (passionate, robust, seamless, cutting-edge, leverage,
  world-class). No em-dash pileups. No emoji in body copy.
- **Location is a fact, not a selling point.** Never introduce or position
  Sohel with "based in Dhaka", "Dhaka-based", or "an engineer in Dhaka". Keep
  the city out of headlines, eyebrows, taglines, role lines, and meta
  descriptions. Dhaka appears only where the passage is about his origin or
  where he lives (the story and background), or as plain logistics (résumé
  location field, time zone, local-time clock).
- Do not edit `docs/sohel-profile/`.

## 8. Engineering constraints (all agents)

- Follow `AGENTS.md`. Bun only. TanStack Start SSR: everything must render on
  the server and hydrate without mismatch (no `window`/`Date.now()` in render;
  clocks and pointer effects start in effects).
- **Do not change** the content schema (`src/types/content.ts`,
  `src/lib/validation.ts`), server code under `src/server/`, migrations,
  `wrangler.jsonc`, loaders' data flow, route URLs, search-param schemas, or SEO
  helpers' contracts. Content keeps coming from loader data; hardcode only UI
  chrome copy and sensible fallbacks.
- Public pages must keep handling blank/missing optional content gracefully
  (the current pages do: trimmed strings, fallbacks, empty states). The CMS can
  add/remove projects, links, chapters, metrics.
- Accessibility is not negotiable: skip link, one `<main id="main-content"
  tabIndex={-1}>` per route, heading order, visible focus rings, 44px touch
  targets, AA contrast in light and dark and for all six accents, full keyboard
  operation, sensible ARIA, reduced motion.
- Responsive from 320px to ultrawide; no horizontal scroll; safe-area insets.
- No new dependencies except what the foundation agent adds (Geist Mono).
  `motion` (import from `motion/react`), `@base-ui/react`, Tailwind v4, and
  `tw-animate-css` are available. Icons are inline SVG.
- Other agents edit other files in this same checkout at the same time. Touch
  only the files you own. Never run git commands that change state (no commit,
  stash, checkout, reset, restore). Format only your own files
  (`bunx oxfmt <files>`); tabs for indentation, matching the repo.
- Before reporting done, run `bun run typecheck`, `bun run check`,
  `bun run test`. Fix everything in your files. If a failure is in a file you
  do not own, do not edit it; report it. Update tests you own that assert on
  changed copy or markup.
- Final report: files changed/added/deleted, what was built, anything
  unfinished or uncertain, and any failure you saw in files you do not own.
