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
