# CMS plan review: verdicts and rulings

## Round 1: plan critique (2026-11-21)

All three reviewers returned **approve with changes**.

| Reviewer | Angle |
| --- | --- |
| Codex A (`codex`, gpt-6.2-sol) | architecture, auth, analytics |
| Codex B (`codex-work`, gpt-6.2-sol) | editing model, draft state, form primitives |
| Antigravity (gemini-4-neon) | visual and interaction design |

### Rulings (accepted unless marked otherwise)

**Routing and auth (Codex A)**
- Accepted. The rewrite is confirmed against installed Start source: server functions dispatch before the rewrite, server routes match after it, and SSR uses the request origin. The output rewrite returns a fresh `URL`.
- Accepted. `/media/:id` (public asset route) collides with a `/media` dashboard page. The media library moves to **`/library`**. `/api/collect` is public-host only; it is not a passthrough on the CMS host.
- Accepted. `cms.localhost` must pass the development mutation-origin check too: one shared loopback helper for auth and mutations.
- Accepted. Every private RPC calls `requireOwner` itself; the layout gate is UX, not security. "Return to the public site" links use the absolute public origin.
- Accepted. Successful save, publish, restore, discard, and media edits write `audit_events` rows (event type, revision, actor email, no content).

**Analytics (Codex A)**
- Accepted. Rate-limit `/api/collect` before parsing or touching D1 (Workers rate-limit binding keyed on a Cloudflare-derived client key; fetch current docs first). Stream-cap the body at 2 KB, strict event union, canonical path allowlist, drop query strings, dedupe by client event id.
- Accepted. Range totals are labelled **visitor-days** (daily-unique, summed), with a tooltip. Site-wide daily distinct counts come from raw pageviews, not summed per-path counts.
- Accepted. Domain-separated HMAC keys per UTC day (`visitor` vs `tab`), atomic "insert or ignore then select" for the daily key. Tab keys rotate daily too.
- Accepted. Heartbeats only update presence; engagement is one event per page on `pagehide`/`visibilitychange` (not every 30 s).
- Accepted. Explicit schema with `event_id` primary key, rollup table keyed `(day, dimension, value, metric)` including a site-wide dimension, idempotent per-day rollup replacement, backfill of missed days, prune only finalized raw days. Today and rolling 24h read raw events.
- Accepted. Outbound clicks are counted by one source: a click beacon with `link_id` from the `/links` page and the home links, not the redirect loader (avoids prefetch double counts).
- Noted. D1 Time Travel can retain deleted rows for its window; documented in `docs/CLOUDFLARE.md`.

**Draft model and editors (Codex B)**
- Accepted and built in the foundation: one serial queue for save, publish, restore, discard, and conflict overwrite. A save captures the submitted document and revision; in-flight edits schedule the next save. Publish saves first, then publishes the revision that save produced. Conflict pauses autosave, keeps local edits, and offers "load theirs" or "overwrite" (checked against the server's new revision).
- Accepted. `useSyncExternalStore` store with narrow selectors, created per layout mount; validation is indexed once per draft change with stable per-path arrays.
- Accepted. Change marks and revert match id-bearing rows by `id` (`correspondingPath`), so reordering does not mark every row. New rows have nothing to revert to.
- Accepted. Media: the library alt is the default for new attachments; each embed edits its own alt in the draft. Show where an asset is used; block removal while referenced. Travel `unlisted` is labelled as hidden from public pages (current public reads include only `public`).
- Accepted. Shared validation limits surfaced inline (character counts, list caps, required). Hrefs use text inputs with hints (HTTPS, root-relative, `mailto:`, `tel:`). Project slug uniqueness is checked in the editor.
- Accepted. `social` gets an inline repeater inside the Links section (tab), not its own rail item.

**Design (Antigravity)**
- Accepted. CMS density tier in `src/styles/cms.css`: panels 18px, nested 12px, inputs and rows 10px; no `py-section` or 32px tiles in the dashboard.
- Accepted. Theme follows the existing accent/theme boot script (`auto` by default); `AccentSwitcher` is mounted in the shell because the CMS host has its own storage. The plan's "dark-first" wording is replaced by "both themes are first-class".
- Accepted. Pipeline bar as a five-state machine (synced, dirty, saving, draft ahead, invalid). Rail: 248px at ≥1280, collapsible to a 56px icon rail at 1024–1279, drawer on phones with a bottom action bar while dirty.
- Accepted. Never use hue alone for state: tangerine and mint accents sit close to destructive and success. Every state pairs color with an icon, dash pattern, or text.
- Accepted. CMS shell keeps a skip link and exactly one `<main id="main-content" tabIndex={-1}>`.
- Accepted. Command bar opens on ⌘K/Ctrl+K and a top-bar button only (no bare `/`).
- Accepted. Release diff groups by section, matches rows by id, shows Added / Edited / Removed / Reordered, word-level diff for prose, chip diff for tags.
- Accepted. Live visitor polling stays out of `aria-live`; no `CountUp` replays on poll.
- Accepted. Analytics map reuses `remote-map.ts` projection plus a static ISO-2 centroid table; no home arcs or Dhaka framing.
- Accepted. Zero-data state renders the real layout with flat tracks and a "no visits recorded yet" strip.
- Could, deferred to polish: shortcut legend in the command bar footer, publish sweep animation.

## Round 2: cross-review of the implementations (2026-11-21)

| Branch | Builder | Reviewer | Verdict |
| --- | --- | --- | --- |
| `t3/first-party-analytics` | Codex A | Codex B | approve with changes |
| `t3/cms-shell-release-workflow` | Antigravity | Codex A | **reject** (4 blockers, reproduced against local D1) |
| `t3/cms-content-editors` | Codex B | Antigravity | approve with changes (2 blockers) |

All three branches are merged on the integration branch; fixes land on top.

### Orchestrator QA found before the reviews landed
- **Blocker, fixed** (`5bcf99a`): the pipeline bar's selector returned a fresh object per call and looped `useSyncExternalStore`, crashing the dashboard into the "unavailable" screen. `useDraftSelector` now caches per state and keeps shallow-equal results.
- Fixed: command bar "Clear" wrapped onto two lines.

### Analytics (Codex B on Codex A): all accepted, sent to a Codex fixer
1. Blocker: `/work/<slug>` paths and outbound link ids were only syntax-checked; resolve against published content or drop.
2. Search/hash-only navigations counted as new pageviews.
3. Engagement stopped at the first hide; accumulate per view, one event id, collector keeps the max.
4. `mailto:` profile link clicks were never attributed.
5. Deltas compared a partial day with full days.
6. Breakdown queries trimmed in JS instead of SQL; projects ranked separately.
7. Presence heartbeat 30 s → 60 s.
8. Range selector used color alone.
9. Copy: "No visits in this period" for empty ranges.
Also assigned: wire live visitors into the rail pulse slot.

### Shell and release (Codex A on Antigravity): all accepted
- Blocker: restore and discard bypassed the store queue and could race autosave. → store-level `restore`/`discard` through the queue.
- Blocker: discard could restore a superseded live revision. → require the published revision in the atomic update.
- Blocker: a rejected restore could still write a success audit row. → gate history and audit inserts on the mutation's own update for save, publish, restore, discard.
- Blocker: uploaded assets never reached the attachment pickers (they read `draft.media`). → pickers source new attachments from the owner-only library.
- Should-fix: publish confirmation could promote a draft edited after review. → capture the reviewed draft, invalidate on edits.
- Should-fix: one insertion marked every row "reordered"; duplicate ids made diff and revert disagree. → relative order among shared ids; enforce per-collection id uniqueness.
- Should-fix: revision byte size read JSON bodies. → `octet_length`.
- Should-fix, **fixed by orchestrator** (`ce41fad`): phone drawer stayed modal after resizing to desktop.
- Nit, **fixed by orchestrator** (`ce41fad`): 36–40px touch targets raised to 44px on coarse pointers.

### Content editors (Antigravity on Codex B): all accepted
- Blocker: `profileLinks[].id` is the public `/links/:id` slug but was a UUID and not editable. → derive a unique slug from the label, editable field with a URL-change warning.
- Blocker: `story.chapters` allowed more than 30 rows; the validator silently truncates. → `max={30}` and reject overflow in validation.
- Should-fix: Alt+↑/↓ in repeaters dropped focus; collection-root errors could not be focused; project slug rules lived only in the editor (move pattern and uniqueness into `validation.ts` so they gate save and publish); whole-list re-render per keystroke; mobile Back bar offset and history `replace`; malformed `?item`/`?tab` threw; profile link href hint mentioned `#` anchors the validator rejects.
- Nits: `window.confirm` for delete, tag chip focus on removal, empty-library hint copy, `DateField` legacy toggle.

## Round 3: fixes merged (2026-11-21)

- `t3/fix-analytics-review-findings` (Codex): all 10 analytics items fixed, including the live visitor count in the rail.
- `t3/fix-cms-review-round-two` (Codex): all 17 shell, release, and editor items fixed, with fixed-clock D1 race tests for audit integrity.

Integration branch: `typecheck`, `check`, `test` (221 passed), and `build` pass.

Orchestrator browser QA (headless Chromium, the in-app preview produced no frames): edit → autosave → release diff → publish (public home served the new headline) → activity log rows → restore r3 as a new draft → discard to live → restore and republish the original; light and dark; 1440px and 390px with no horizontal scroll; phone drawer; command bar search; no console errors.

Not verified: production Cloudflare Access on the `cms.` hostname, the Workers rate-limit binding, the cron trigger, and R2 uploads (R2 is not bound in this repo).

## Design pass: build, cross-review, and fix rounds (2026-11-22 to 2026-11-23)

Brief: `docs/cms/DESIGN.md`. Owner feedback: rail navigation felt like the full page jumped or re-rendered; the UI read as a basic skeleton. Each area was built by one agent, reviewed by a different agent, fixed, and reviewed again until the verdict carried no must-fix or should-fix items. Reviewers measured in a real browser: paused view-transition frames, scroll and position traces, contrast across both themes and all six accents, coarse-pointer target sizes, 390px overflow, axe, console and hydration.

### Root cause of the "page jump"
The shell never remounted. The jump came from an instant content swap, a one-frame scroll reset, a teleporting active highlight, scrollbar-width shifts, a route-dependent content width (28px toolbar shift), a shared view-transition name that drew the outgoing page at the incoming page's position after scrolling, a rail mode applied after first paint, and route snapshots painting above the phone drawer. Each was fixed and verified frame by frame.

### Rounds
| Area | Builder | Reviews (verdicts) | Fixers |
| --- | --- | --- | --- |
| Shell and navigation | Codex | r1 reject, r2 reject ×2, r3 reject, r4 reject, r5 reject, r6 approve with changes, final approve with changes | Codex, Codex Work, Claude, orchestrator |
| Form controls and 15 editors | Codex Work | r1 reject, r2 reject, r3 reject, r4 reject, r5 reject, r6 approve with changes, r7 approve with changes, final reject | Codex Work, Claude, Codex |
| Dashboard pages | Antigravity | r1 reject, r2 reject, r3 approve with changes, r4 approve with changes, final approve with changes | Claude, Grok, Codex, orchestrator |

All final-cycle findings were fixed and merged. Highlights of what changed:
- **Navigation:** scroll settles before the incoming paint; the outgoing snapshot keeps its scrolled position and fades while the new page rises 6px; one shared content width; rail mode applied before first paint; drawer, action bar, banners, and popovers stay above route snapshots; reduced motion uses a 150ms fade.
- **Editors:** iOS Settings-style rows, grouped collection detail, single-line fields, delayed validation with settled counts across field, section, pipeline and rail, one keyed Undo per removed item across item switches, keyboard and touch reordering, phone slide-in detail, 44px targets, focus never obscured by sticky bars.
- **Pages:** no repeated facts; one compact traffic row on Overview; one breakdown panel on Analytics; one in-page publish gate with a receipt; word-level diffs labelled like the editor; deduplicated History; server-side Activity filters; consistent headers, dialogs, and focus rings; refreshes on save and publish.
- **Accessibility:** WCAG AA text and non-text contrast in both themes and six accents, forced-colors focus outlines, axe-clean command bar and pipeline bar, live reduced-motion handling.

### Orchestrator QA on the final integration build
- typecheck, check, test (262), and build pass on the upgraded dependencies.
- All 21 CMS routes at 1440×900 and 390×844: no horizontal overflow, one `h1` each, no console errors or warnings.
- Rail navigation from scrollY 700: toolbar x constant, scroll to 0 in one step behind the transition, Back restores 700.
- Collapsed rail reload: width 56px on every frame, no layout shifts.
- Publish from Overview: Recent activity updates in place; the public site serves the new text; original content restored and republished.

Not verified locally: R2-backed media upload and thumbnails (no `MEDIA` binding), production Cloudflare Access sign-in.
