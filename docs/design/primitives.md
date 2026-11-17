# Trace primitives

The shared system every page sits in. Read this instead of the source. Tokens
live in `src/styles/tailwind.css`; components in `src/components/ui/*`,
`src/components/motion/*`, and `src/components/chrome/*`.

## 1. Frame you are rendering into

- The root renders: skip link → route progress hairline → **nav dock** →
  `div[data-slot=app-frame]` (your route) → **site footer** → command palette.
- The frame already clears the dock: `padding-top: var(--dock-space-top)`.
  - **≥ 768px (`md`)**: dock is a floating glass pill at the top
    (`top: max(12px, safe-top)`, 52px tall). `--dock-space-top` ≈ 76px. Content
    starts below it; do not add more top padding for the dock.
  - **< 768px**: dock floats at the **bottom** (62px tall, `bottom: max(10px,
    safe-bottom)`). `--dock-space-top` = `max(8px, safe-top)`;
    `--dock-space-bottom` ≈ 88px + safe-bottom. The footer already pads for it.
    Anything you make `position: fixed; bottom: …` on mobile must sit above
    `var(--dock-space-bottom)`.
- `scroll-padding` and `[id] { scroll-margin }` already account for the dock.
- Each route renders exactly one `<main id="main-content" tabIndex={-1}>`
  (use `PageShell`). The root focuses it after client navigation.
- Breakpoints: Tailwind defaults (`sm 640`, `md 768`, `lg 1024`, `xl 1280`).
  The chrome switches at `md`. Test 320px.
- Z-index layers (use `z-(--z-dock)` etc.): `--z-raised 10`, `--z-sticky 30`,
  `--z-dock 40`, `--z-overlay 60` (popovers, route progress), `--z-palette 70`,
  `--z-toast 80`, `--z-skip 100`. Sticky page UI uses `--z-sticky` and
  `top-[calc(var(--dock-space-top)+12px)]` on desktop.

## 2. Tokens

Raw variables (`--theme-*`) change with theme and accent; use the Tailwind
names. Never hard-code hex colors in pages.

| Use | Class | Notes |
| --- | --- | --- |
| Page canvas | `bg-paper` / `bg-background` | `#fbfbfd` / `#0a0a0c` |
| Primary text | `text-foreground` / `text-ink` | `#1d1d1f` / `#f5f5f7` |
| Secondary body text | `text-ink-soft` | `#424245` / `#d2d2d7` |
| Muted / captions | `text-muted-foreground` | AA on paper and muted surfaces |
| Raised content | `bg-surface-solid` (card), `bg-surface-raised` (inner chip/tile on a card) | white / `#161618`, `#1c1c1f` |
| Muted fill | `bg-muted` or `bg-[color-mix(in_srgb,var(--theme-ink)_5%,transparent)]` | the translucent ink mix adapts to any surface |
| Hairlines | `border-line` (default), `border-line-strong`, `bg-line-strong` for 1px rules | low-alpha neutral |
| Accent fill | `bg-primary text-primary-foreground` | one primary button per view |
| Accent text/links | `text-primary-text` | AA on paper, surfaces, and `bg-primary-soft` |
| Accent tint | `bg-primary-soft` | chips, selected states |
| Trace line color | `var(--theme-accent-line)` / `bg-primary-line` | |
| Status | `text-success`, `text-signal`, `text-destructive` | |
| Focus ring | `outline-ring` | global `:focus-visible` is already 2px accent outline, 3px offset |
| Glass (chrome only) | `bg-glass`, `border-glass-border`, or the `glass` utility | |

Six accents (`cobalt` default, `sky`, `azure`, `tangerine`, `violet`, `mint`)
are retuned for AA in both themes; just use the semantic classes.

**Type** (each sets size, leading, tracking, weight; headings already have
`text-wrap: balance`, `p/li` have `pretty`):

| Class | Size | Use |
| --- | --- | --- |
| `text-display` | clamp(2.6rem, 7.2vw, 6.25rem), 620, -0.045em, 0.98 | one per page (hero h1) |
| `text-title` | clamp(2rem, 4.4vw, 3.5rem), 620 | section titles |
| `text-headline` | clamp(1.375rem, 2.1vw, 1.75rem), 600 | card titles |
| `text-lead` | 18–21px, 1.5 | intros under titles |
| `text-body` | 17–19px, 1.55 | reading copy (cap at `max-w-prose` = 62ch) |
| `text-small` / `text-caption` | 15px / 13px | meta |
| `mono-label` | 11.5px Geist Mono, uppercase, 0.08em, tabular | coordinates: `01 — Work`, `UTC+6` |
| `font-mono` | Geist Mono Variable | code, commands |

Numbers: `tabular-nums` (already on `time`, `data`, `[data-numeric]`).

**Shape** (concentric): `rounded-tile` 32px (bento tiles) > `rounded-card`
28px (cards) > `rounded-inner` 16px > `rounded-inner-sm` 12px; buttons/chips
`rounded-full`. Inner radius = outer radius − padding.

**Depth**: `shadow-raised` (cards), `shadow-surface` (feature cards),
`shadow-float` (popovers), `shadow-glass` (chrome), `shadow-accent` (rare).
All include the inset top highlight.

**Space and measure**: `py-section` / `mt-section` = clamp(88px, 12vw, 168px)
between major sections; `section-sm` = clamp(56px, 8vw, 104px).
`max-w-page` 1200, `max-w-wide` 1320, `max-w-reading` 680, `max-w-prose` 62ch.
Gutter: `px-gutter` = clamp(1.25rem, 4vw, 2.5rem) (prefer the shell utilities,
which add safe-area insets).

**Motion**: `ease-trace` (cubic-bezier(.22,1,.36,1)), `ease-in-out-soft`,
`ease-spring` (gentle `linear()` spring). Controls 180–260ms, reveals 450–700ms.
Raw CSS: `var(--theme-ease)`, `var(--motion-control)` 220ms,
`var(--motion-reveal)` 620ms. Per AGENTS.md: `translate-*`/`scale-*` need
`transition-transform` or the longhands in `transition-[...]`.

## 3. Utilities (CSS)

| Utility | What |
| --- | --- |
| `shell` / `shell-wide` / `shell-reading` | centered column (1200 / 1320 / 680) + responsive safe-area gutters |
| `glass` | blur + saturate + translucent fill + hairline + shadow. Floating chrome only |
| `surface-card` | solid card: surface, hairline, 28px, `shadow-raised` |
| `mono-label` | coordinate label type |
| `pressable` | transform-safe transitions + `scale .97` on `:active` |
| `hairline-t` / `hairline-b` | 0.5px inset rule |
| `text-accent-gradient` | accent ink gradient for one highlighted word |
| `skeleton` | shimmering placeholder block |
| `mask-fade-x` / `mask-fade-b` | edge fades for strips / long previews |
| `reveal-on-view` | pure-CSS scroll-driven rise (no-op without support or with reduced motion) |
| `animate-trace-y` / `animate-trace-x` | runner travel keyframes (used by `TraceLine`) |
| `animate-marquee`, `animate-shimmer`, `animate-ping-soft`, `animate-rise-in`, `animate-fade-in`, `animate-progress-indeterminate`, `animate-status-draw` | shared keyframes; wrap loops in `motion-safe:` |

Reduced motion: all CSS animation/transition durations collapse globally;
trace dots sit still, marquees become swipeable rows, reveals show instantly.

## 4. Layout and type components — `@/components/ui/portfolio`

```tsx
import { PageShell, SectionHeading, Section, Surface, Tag, TagList, MonoLabel,
  StatusDot, Kbd, Eyebrow, PageHeader, ActionRow, ButtonLink, StatusBadge,
  Rule, EmptyState, MenuSurface, MenuIndicator } from "@/components/ui/portfolio";
```

**PageShell** — the route's `<main>`. Props: `width` `default|wide|narrow|reading`,
`spacing` `default|compact|none` (top padding + bottom rhythm), plus `<main>`
props (`aria-label`, `data-page`, …).
```tsx
<PageShell width="default" data-page="work">
  <PageHeader eyebrow="Work" title="…" description="…" />
</PageShell>
```
For full-bleed sections, use `spacing="none"` and give inner blocks `shell`.

**SectionHeading** — mono `01 — Work` eyebrow, `text-title` heading, optional
lead and actions. Props: `index`, `eyebrow`, `title`, `description`,
`actions`, `level` (2|3), `align` (`start|center`), `id`, `titleClassName`.
```tsx
<Section aria-labelledby="work-title">
  <SectionHeading id="work-title" index="01" eyebrow="Work" title="Selected work"
    description="…" actions={<Link className={buttonVariants({ variant: "ghost" })} …>All work</Link>} />
</Section>
```

**Section** — `<section>` with half the section rhythm on each side (two
adjacent sections = one full `section` gap). `spacing` `default|compact|none`.

**PageHeader** — page h1 block (`text-display`), `level` 1|2, `eyebrow`,
`description`, `children`. **Eyebrow** — mono accent label `<p>`.
**SectionIntro** — legacy two-column intro (kept for old pages; prefer `SectionHeading`).

**Surface** — content card. `variant` `solid` (default, `shadow-raised`),
`glass` (kept for compatibility; renders as a solid `shadow-surface` card),
`quiet` (flat tinted). Inherits shadcn `Card` (`size`, `CardHeader`, …).
```tsx
<Surface className="p-6 md:p-8"><h3 className="text-headline">…</h3></Surface>
```

**Tag / TagList** — neutral pills for tools. `<TagList items={project.tags} />`.
**StatusBadge** — `tone` `neutral|accent|success|signal`.
**MonoLabel** — `<span>` with `mono-label`; `tone` `muted|accent|ink`.
**StatusDot** — live dot; `tone` `success|accent|muted`, `pulse`.
```tsx
<MonoLabel className="flex items-center gap-2"><StatusDot /> Available · <LocalTime timeZone="Asia/Dhaka" /></MonoLabel>
```
**Kbd** — key cap. **ActionRow** — wrapping row of actions (`mt-8 gap-3`).
**ButtonLink** — `<a>` with `buttonVariants` (external links). For internal
routes: `<Link className={buttonVariants({ variant: "outline" })} to="/work" search={{ group: "all" }}>`.
**Rule**, **EmptyState** (`title`, `description`, `level`, children actions).
**MenuSurface** (glass panel) / **MenuIndicator** (sliding pill; give siblings
one `layoutId`).

### Buttons — `@/components/ui/button`

`buttonVariants({ variant, size })`. Variants: `default` (accent — one per view),
`ink` (neutral high-contrast primary), `outline` (neutral secondary),
`secondary` (tinted), `ghost`, `destructive`, `link`. Sizes: `default` 44px,
`sm` 36px (dense desktop only), `lg` 52px, `xs`, `icon` 44px, `icon-sm`,
`icon-lg`. All pills with press scale and accent focus outline.
```tsx
<Magnetic><Link className={buttonVariants({ size: "lg" })} to="/work" search={{ group: "all" }}>See the work</Link></Magnetic>
```

Other shadcn primitives (`badge`, `card`, `input`, `textarea`, `label`,
`field`, `popover`, `toggle`, `toggle-group`, `separator`, `alert`, `empty`)
keep their APIs and are restyled to the tokens (pill toggles, 28px cards,
glass-ready popovers).

## 5. Motion primitives — `@/components/motion`

All are SSR-safe (server HTML is final and visible), reduced-motion aware, and
decorative parts are `aria-hidden`.

**Reveal** — fade + 14px rise + 6px blur clearing, once, on scroll-in. Only
elements below the fold at hydration are hidden first, so no flash or stuck
content. Props: `as` (`div|section|article|li|ul|p|span|…`), `delay` ms, `y` px.
```tsx
<Reveal as="section" delay={60}>…</Reveal>
```

**Stagger** — reveals direct children in sequence. Props: `as`, `step` ms
(default 55), `maxSteps` (10), `delay`, `y`.
```tsx
<Stagger as="ul" className="grid gap-4 md:grid-cols-3">{items.map((i) => <li key={i.id}>…</li>)}</Stagger>
```
Don't nest Reveal inside Stagger children; don't wrap whole pages.

**SpotlightCard / useSpotlight** — cursor-following glow + border light,
mouse/trackpad only. `SpotlightCard` props: `as`, `variant`
(`surface` 28px | `tile` 32px | `plain`), `size` px. Or spread `useSpotlight()`
onto your own element (needs a border-radius).
```tsx
<SpotlightCard as="article" className="relative p-7">
  <h3 className="text-headline"><Link to="/work" search={{ group: "all" }} className="after:absolute after:inset-0">Kuno</Link></h3>
</SpotlightCard>
```

**Magnetic** — wraps one CTA; leans up to `max` px (8) toward the pointer
(`strength` 0.28). Primary CTAs only.

**CountUp** — `<CountUp value="79,185" />`, `"280k"`, `"5 years"`, `"99.9%"`.
Counts from 0 when first scrolled into view; already-visible instances show the
final value (no flash). Width is reserved by the final value. Prop `duration` s.
Non-numeric strings render as-is.

**TraceLine** — the signature line + glowing dot. Props: `orientation`
(`vertical` default | `horizontal`), `progress` (number or `MotionValue` 0–1;
omit for the looping travel), `duration` s (3.2), `delay` s, `restAt` (0–1, the
reduced-motion rest point), `track` (hairline, default true). Size via classes
(`h-full w-3` / `w-full h-3` defaults). Pauses off-screen.
```tsx
const { scrollYProgress } = useScroll({ target: ref });
<TraceLine progress={scrollYProgress} className="absolute inset-y-0 left-4" />
<TraceLine orientation="horizontal" duration={5} />
```
Use sparingly: hero, story rail, section boundaries, transitions.

**LocalTime / useLocalTime** — live clock for an IANA zone. Props:
`timeZone`, `seconds`, `hour12`, `showOffset` ("14:05 UTC+6"), `placeholder`.
Renders `--:--` on the server, real time after mount. Use
`content.identity.timezone` with a `"Asia/Dhaka"` fallback.

**CopyButton / useCopyToClipboard** — copies `value`, morphs icon to a
check, announces via a polite live region. Props: `value`, `label` (`null` =
icon only, then pass `aria-label`), `copiedLabel`, `failedLabel`,
`announcement`, `onCopied`, `variant`, `size`, `className`.
```tsx
<CopyButton value="npx expo install expo-in-app-updates" label={null} aria-label="Copy install command" variant="ghost" size="icon-sm" />
```

**Marquee** — infinite strip; pauses on hover, focus, and off-screen; static
swipeable row under reduced motion. Props: `duration` s (40), `gap` CSS length,
`reverse`, `pauseOnHover`, `fade`, `aria-label`. Content must be wider than
the viewport (repeat items if short).

Hooks: `useHydrated`, `useMediaQuery(query, serverValue)`,
`usePrefersReducedMotion`, `usePointerFine`, `useOffscreenPause(ref)`
(sets `data-paused`), `useEnterViewportOnce(ref, cb)`.
`motion/react` stays available for bespoke work; `MotionConfig
reducedMotion="user"` is set at the root.

## 6. Chrome — `@/components/chrome/*`

- **NavDock** — owned by the root; pages never render nav.
- **Command palette** — ⌘K / Ctrl+K anywhere, `/` outside text fields.
  `useCommandPalette()?.open()` opens it from any page (returns null outside
  the provider). Projects currently go to `/work`; flip
  `PROJECT_DETAIL_ROUTE_READY` in `CommandPalette.tsx` when `/work/$slug` exists.
- **SiteFooter**, **StatusScene** (`lost` | `paused` trace illustration),
  **icons.tsx** (20px stroke icons + `Monogram`), `useRoutePublicContent()`
  (published content from the current public route's loader; never CMS data).
- Appearance API (`@/components/AccentSwitcher`): `useAppearance()` →
  `{ theme, resolvedTheme, accent, transitioning }`, `applyThemeMode(mode,
  originEl?)`, `applyAccent(id)`, `accentOptions`, `themeColors`.

## 7. Do / don't

- Do compose pages as `PageShell` → `Section` + `SectionHeading` → content.
  Don't invent new section spacing; use `py-section`/`Section`.
- Do use solid `Surface`/`SpotlightCard` for content; don't use `glass` or
  backdrop blur on content.
- Do keep one accent-filled button per view; others `outline`, `ink`, `ghost`.
- Do use `mono-label` for metadata and coordinates, never for sentences.
- Do keep targets ≥ 44px on touch (`size="default"` buttons; `sm` is desktop-dense only).
- Do gate hover effects with `pointer-fine:` / `hover:` and motion with
  `motion-safe:`; animate only `transform`/`translate`/`scale`/`opacity`/`filter`.
- Don't render things with `opacity-0` waiting for JS; use `Reveal`.
- Don't read `window`/`Date` during render; use effects or `LocalTime`.
- Don't hard-code colors; if a color is missing, ask for a token.
- Résumé print contract (A4, 10mm, two columns, 30mm portrait, hidden chrome)
  lives in `tailwind.css` `@media print` and keys off the existing
  `data-slot="resume-*"` / `data-page="resume"` hooks — keep those attributes.
