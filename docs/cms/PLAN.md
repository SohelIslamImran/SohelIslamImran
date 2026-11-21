# CMS rebuild: "Control Plane"

Status: plan v1 (2026-11-21). Owner: orchestrator. Reviewed by: Codex A, Codex B, Antigravity (verdicts in `docs/cms/REVIEW.md`).

## 1. Goals

1. Edit every field of `PortfolioContent` (schema v3) with forms: text fields, textareas, dropdowns, switches, chips, reorderable lists. No JSON editor in the main flow. A raw JSON view stays as a read-only "inspect" panel plus an import/export escape hatch.
2. Serve the CMS at the root of `cms.sohelislamimran.com` (`/`, `/analytics`, `/content/projects`), not under `/cms`.
3. A dedicated dashboard shell. The CMS does not render the public NavDock, footer, or command palette.
4. First-party, cookieless analytics: active visitors now, today, 7 days, 30 days, 12 months, all time; page views; top pages, projects, referrers, countries, devices; outbound link clicks; engaged time.
5. Release workflow: autosaved drafts, a per-section diff against what is live, publish, discard, revision history with restore, and an activity log.
6. A distinctive look that still uses the Trace tokens and primitives, so the CMS reads as the same product as the site.

Non-goals: multi-user roles, a WYSIWYG rich-text editor (content is plain strings), third-party analytics SDKs, changing the content schema shape.

## 2. Concept: the portfolio as a deployed system

The public site's motif is one request traced through every layer. The CMS is the operator console for that system:

- **Pipeline bar** (top, persistent): `Draft r42 ── validate ── Live r39`. The trace dot sits at the stage the document is in: unsaved, saving, saved draft ahead of live, live. Validation errors break the line in the destructive color with a count you can click.
- **Layer rail** (left sidebar): content grouped the way the stack is: *Signals* (overview, analytics), *Identity* (site and SEO, identity, hero, about, contact, résumé), *Work* (projects, experience, capabilities, testimonials, credentials), *Writing and story* (writing, story, travel), *Links* (profile links, social), *Assets* (media), *Release* (changes, history, activity). Each item shows a trace mark when its draft differs from live, and an error count.
- **Trace marks**: every field compares its draft value with the published value. Changed fields get a small accent tick in the gutter. Reverting a field to the live value is one click.
- **Mono coordinates**: revision numbers, timestamps, byte counts, paths (`projects[2].title`) in Geist Mono labels.
- **Live pulse**: active visitor count with a soft pulsing dot, polled every 15 s.
- **Command bar** (⌘K): jump to any section or collection item, run save, publish, discard, open the live site.

Visual rules: dark-first (follows the system theme, both themes must pass AA), neutral canvas, one accent per view, solid surfaces for content, glass only for floating chrome (command bar, popovers, the pipeline bar on scroll). Geist and Geist Mono only. No new colors; add a token in `src/styles/cms.css` if something is missing. Motion is transform/opacity only and respects reduced motion.

## 3. Architecture

### 3.1 Host routing

- `src/router.tsx` gets a `rewrite` pair. On a hostname that starts with `cms.` (production `cms.sohelislamimran.com`, local `cms.localhost`), input maps `/x` → `/cms/x`, output maps `/cms/x` → `/x`. Passthrough prefixes are never rewritten: `/_serverFn`, `/__tsr`, `/assets/`, `/images/`, `/media/`, `/favicon`, `/api/`, `/robots.txt`.
- Because the rewrite runs in the router on both server and client, SSR and hydration see the same internal path (this is what the old "redirect, don't rewrite" comment in `server-entry.ts` was avoiding).
- `server-entry.ts`: on the CMS host, `/cms` and `/cms/*` redirect 308 to the stripped path (old bookmarks); every other path is served by the app; `robots.txt` on the CMS host returns `Disallow: /`. On the public host, `/cms*` and `/resume/edit*` redirect to the CMS origin. All CMS-host responses keep `private, no-store`, `noindex`, `no-referrer`.
- Local dev without a subdomain still works at `http://127.0.0.1:5190/cms` because no rewrite applies there.

### 3.2 Layout split

- `__root.tsx` keeps the document, theme/accent boot script, and `MotionConfig`. It renders the public chrome (skip link, route progress, NavDock, footer, command palette provider) only when the matched routes are not under `/cms`. CMS routes get a bare document.
- `src/routes/cms.tsx` becomes a layout route: loader `getCmsSnapshot()` (auth gate), renders the access screens when not authorized, otherwise `<CmsDraftProvider>` + `<CmsShell>` + `<Outlet/>`.
- Routes (internal path → CMS URL):
  - `cms/index.tsx` → `/` Overview
  - `cms/analytics.tsx` → `/analytics`
  - `cms/content.$section.tsx` → `/content/:section` (section registry; collections use `?item=<id>`)
  - `cms/media.tsx` → `/media`
  - `cms/release.tsx` → `/release` (changes vs live, publish, discard)
  - `cms/history.tsx` → `/history` (revisions, restore)
  - `cms/activity.tsx` → `/activity` (audit events)
- `resume.edit.tsx` keeps redirecting.

### 3.3 Draft state (client)

`src/components/cms/draft/` — a context owned by the layout so the draft survives navigation between sections.

- State: `draft`, `saved` (last saved draft), `published`, `draftRevision`, `publishedRevision`, timestamps, `csrfToken`, `status` (`idle | dirty | saving | saved | conflict | error`), `issues` (`validatePortfolioContent(draft)`, memoized), `lastError`.
- Actions: `update(path, value)`, `updateWith(path, fn)`, `save()`, `publish()`, `discard()` (draft := published, then save), `replaceDraft(content)` (restore/import), `revertField(path)`.
- Autosave: 1.5 s after the last edit when the draft is valid; ⌘S saves now. Saves are serialized (one in flight). Optimistic concurrency uses the existing `expectedRevision`; a conflict shows a merge prompt (keep mine and overwrite / load theirs).
- `beforeunload` guard while dirty or saving.
- Paths use the validator's format (`projects[2].metrics[0].label`) so field errors map 1:1. Helpers: `getAt`, `setAt` (immutable), `issuesAt(path)`, `issuesUnder(prefix)`, `changedAt(path)`.

### 3.4 Form primitives

`src/components/cms/fields/` — every field takes `path`, `label`, optional `description`, and reads value, issues, and trace mark from the draft context. Controls reuse `src/components/ui/*` and `@base-ui/react`.

- `TextField`, `TextAreaField` (auto-grow, character count, optional soft limit), `UrlField`, `EmailField`, `NumberField`
- `SelectField` (Base UI Select), `SegmentedField` (toggle group), `SwitchField`
- `TagsField` (chips, Enter/comma to add, Backspace to remove, paste splits on commas)
- `StringListField` (paragraphs/highlights: add, remove, reorder with buttons and Alt+↑/↓)
- `RepeaterField<T>` (array of objects: collapsible rows, add, duplicate, remove with undo toast, reorder), with `LinkRow`, `MetricRow` presets
- `MediaField` (pick from the media library or clear)
- `CollectionEditor<T>` — master/detail for top-level collections: searchable list with status chips (featured, current, visibility), detail form on the right, `?item=` in the URL, new item gets a generated `id` and, for projects, a slug derived from the title.

### 3.5 Section registry

`src/components/cms/sections/registry.ts` maps a section id to `{ id, label, group, path (content key), icon, Editor }`. The shell, command bar, release diff, and router all read it. Sections: `site`, `identity`, `hero`, `about`, `contact`, `resume`, `projects`, `experience`, `capabilities`, `testimonials`, `credentials`, `writing`, `story`, `travel`, `profileLinks`, `social`.

### 3.6 Server additions (owner-only, `requireOwner` + CSRF on mutations)

New typed server functions, kept out of `cms.functions.ts` so parallel work does not collide:

- `src/server/cms-history.functions.ts` + storage helpers in `cms-storage.server.ts`:
  - `listRevisions({ kind?, limit, before? })` → `{ id, kind, revision, changedBy, changedAt, bytes }[]` (no content)
  - `getRevision({ id })` → content (owner-only)
  - `restoreRevision({ id, expectedRevision, csrfToken })` → writes it as a new draft revision
  - `discardDraft({ expectedRevision, csrfToken })` → draft := published as a new draft revision
  - `listAuditEvents({ limit, before? })`
  - `listMedia()`, `updateMediaAlt({ id, alt, csrfToken })`
- `src/server/analytics.functions.ts` + `analytics.server.ts`: `getAnalyticsSummary({ range })`, `getLiveVisitors()`.

### 3.7 Analytics

Data stays in D1, first-party, no cookies, no third-party script.

- **Collector**: server route `src/routes/api/collect.ts` (POST, `text/plain` JSON body ≤ 2 KB so `sendBeacon` needs no preflight). Accepts only the public origin (and loopback in development). Rejects bots by user agent. Derives country from `request.cf.country`, device and browser family from the user agent; the raw UA and IP are never stored or logged.
- **Visitor identity**: `visitor_hash = sha256(daily_salt ‖ ip ‖ user-agent)`, truncated. The salt is random per UTC day in `analytics_salts` and deleted after two days, so a hash cannot be linked across days. A random `session_id` lives in `sessionStorage` (tab-scoped, not a cookie).
- **Events**: `pageview` (path, referrer host), `engagement` (visible time since last ping, sent on `visibilitychange`/`pagehide` and every 30 s while visible), `outbound` (link id for `/links/:id`, or destination host).
- **Presence**: `analytics_presence(session_id, path, last_seen)` upserted on pageview and ping. Active now = `last_seen` within the last 2 minutes.
- **Counting**: visitors in a range = distinct `visitor_hash` per day, summed (same as Plausible's cookieless model; the UI labels it "visitors" with a tooltip that returning visitors on different days count again). Page views = count of `pageview`. Engaged time = median of per-session sums.
- **Tables** (`migrations/0004_analytics.sql`): `analytics_events`, `analytics_daily` (rollup per day × path × metric for fast ranges), `analytics_presence`, `analytics_salts`.
- **Retention**: a cron trigger (`scheduled` in `server-entry.ts`, daily) rolls yesterday into `analytics_daily`, deletes raw events older than 90 days, presence older than 1 day, salts older than 2 days. Rollups are kept.
- **Client beacon**: `src/components/analytics/Beacon.tsx` rendered by the public root only. Sends on route resolve, ignores the CMS host, honors `navigator.doNotTrack === "1"` and a local opt-out flag (`?analytics=off` sets it; the CMS links to it so the owner can exclude their own browser).
- **Dashboard**: Overview shows the pulse, today/7d/30d/all-time cards with sparklines, top pages, and content health. Analytics page: range switcher (24h, 7d, 30d, 90d, 12m), visitors and views chart (SVG, hand-drawn, no chart library), top pages, top projects (`/work/:slug`), referrers, countries on the existing world dot map, devices and browsers, outbound clicks per profile link, engaged time.

CSP already allows `connect-src 'self'`.

## 4. Work split

The orchestrator builds the foundation first and commits it. Then three agents work in parallel, each in its own worktree on its own branch, touching only the files they own. Everyone may read everything.

| Owner | Scope | Owns |
| --- | --- | --- |
| Orchestrator (foundation) | host rewrite, server-entry, root chrome split, CMS layout route + bare shell, draft provider, path helpers, field primitives v1, section registry skeleton with the `site` editor as the reference | `src/router.tsx`, `src/server-entry.ts`, `src/routes/__root.tsx`, `src/routes/cms.tsx`, `src/components/cms/draft/**`, `src/components/cms/fields/**` (v1), `src/components/cms/sections/registry.ts` |
| Codex A (`codex`) | analytics end to end | `migrations/0004_analytics.sql`, `wrangler.jsonc` (cron), `src/routes/api/collect.ts`, `src/server/analytics*.ts`, `src/components/analytics/**`, `src/components/cms/analytics/**`, `src/routes/cms/index.tsx`, `src/routes/cms/analytics.tsx`, the `scheduled` export and Beacon mount (two small edits in files above) |
| Codex B (`codex-work`) | every content editor and the collection editor | `src/components/cms/sections/**` (except registry wiring), `src/components/cms/fields/**` (extends v1), `src/routes/cms/content.$section.tsx` |
| Antigravity | shell design, command bar, release workflow, history, activity, media | `src/components/cms/shell/**`, `src/styles/cms.css`, `src/routes/cms/{release,history,activity,media}.tsx`, `src/server/cms-history.functions.ts`, additions to `src/server/cms-storage.server.ts` and `media.server.ts`, `src/components/cms/release/**` |

`src/routeTree.gen.ts` is regenerated after merging; do not hand-edit it.

## 5. Review protocol

1. Plan critique: each agent critiques this plan from a different angle; the orchestrator records the verdict and changes in `docs/cms/REVIEW.md`.
2. Implementation in parallel.
3. Cross-review: Codex A reviews Antigravity's branch, Codex B reviews Codex A's, Antigravity reviews Codex B's. Findings are ranked (blocker, should-fix, nit) with file and line.
4. The orchestrator rules on each finding, fixes or delegates, merges, regenerates the route tree, and runs `typecheck`, `check`, `test`, `build`, plus browser QA (desktop, 390px, keyboard, reduced motion, both themes).

## 6. Risks

- **Rewrite and server routes**: confirm TanStack Start server routes and server functions bypass the rewrite via the passthrough list. Covered by a test of the rewrite pair.
- **D1 write volume**: one insert per pageview plus a presence upsert every 30 s per open tab. Fine at portfolio scale; the collector caps events per session per minute.
- **Autosave vs conflicts**: serialized saves and revision checks; conflict UI never silently drops edits.
- **Privacy**: no IP, no raw UA, no cookies, daily salt rotation, DNT honored. Never log draft content, Access JWTs, cookies, or media keys.
- **Copy rules**: CMS UI copy follows AGENTS.md (no "based in Dhaka" framing in any default or placeholder).
