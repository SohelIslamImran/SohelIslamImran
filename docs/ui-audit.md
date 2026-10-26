# UI audit

## Scope and status

This is a code-level handoff audit of the current working tree. It records the route, filtering, content, CMS, media, and print behavior implemented in the source files. Browser QA was not run for this handoff, so this document does not claim viewport results, interaction results, contrast results, screenshot coverage, a measured print page count, deployed redirects, or deployed response headers.

The following sections describe the model to verify, not a completed browser acceptance pass.

## Final route model

| Route | Public behavior |
| --- | --- |
| `/` | Published home content: hero, two public metrics, selected work, career timeline, capabilities, background, and contact. |
| `/work` | Work index with the URL-backed `group` filter: `all`, `product`, `open-source`, or `experiment`. |
| `/story` | Published story header, chapter anchors, progress navigation, source link, and empty-state recovery. |
| `/field-notes` | Public travel entries only. Private and unlisted entries are removed before content crosses the public boundary. |
| `/resume` | Published résumé with profile, experience, proof, credentials, availability, and print output. |
| `/links` | Curated directory with the URL-backed `kind` filter: `all`, `social`, `contact`, `work`, `story`, or `other`. |
| `/links/:linkId` | Looks up a published profile link, returns `notFound()` for an unknown ID, and otherwise redirects to the stored destination. The route declares `noindex` metadata; deployed response headers were not verified. |
| `/cms` | Owner-only editor. The source routes public `/cms` requests to the CMS hostname and serves the editor at `/cms` on that host. The early deployed redirect remains unverified. |
| `/resume/edit` | Source-level compatibility path with a permanent CMS-host redirect. The deployed result was not verified. |
| `/media/:assetId` | Serves an object only when the asset is published in the optional R2 binding. Unknown or private assets return `404`. |
| `/robots.txt`, `/sitemap.xml`, `/rss.xml` | Static or published-content metadata routes. The sitemap includes the main public routes and published writing paths. |

The root document owns the skip link, primary navigation, mobile menu, theme and accent controls, route transition, and reduced-motion boundary. Public pages are SSR-first. Draft content does not enter their loaders.

## Filter model

Both public filters are controlled by TanStack Router search schemas. Invalid values fall back to `all` instead of reaching the generic error boundary.

- Work uses `group`. `WorkIndex` groups projects into product systems, published-code projects, and experiments. Product systems and published-code projects use cards; experiments use rows. A selected group with no matching records keeps the empty state and offers a return to all work.
- Links uses `kind`. The six values are all, social, contact, work, story, and other. A missing `kind` behaves as `all`; an empty category keeps a recovery action that shows all links.
- Filter changes replace the URL without resetting scroll. Each control is a minimum-height toggle and handles arrow, Home, and End movement in the component.
- The seeded profile directory contains the personal profiles recorded in the verified profile sources, plus the portfolio's story, field-notes, and email destinations. It is a curated set, not a claim that no other account exists.

## Content and CMS model

- The stored document uses schema version 3. `src/content/initial.ts` is the safe seed used when no D1 binding is available or when the original blank revision-one bootstrap is encountered. Only exact legacy versions 1 and 2 enter the upgrade path. Those reads backfill missing public values from the seed, discard unusable profile link records, and quarantine invalid media dimension pairs before v3 validation.
- Public loaders read the published document. `toPublicPortfolioContent` filters non-public travel entries, removes private media keys, and exposes only media referenced by public content.
- The CMS keeps the draft and published JSON in one D1 document. Save and publish are explicit revision operations with optimistic revision checks. Stale-tab writes return the current snapshot instead of overwriting it.
- Owner access is checked in the server layer. Cloudflare Access assertions, audience and issuer checks, the owner email allowlist, origin checks, and CSRF validation protect CMS reads and mutations. The local loopback exception only applies in development with the required owner configuration.
- The editor shows high-value identity, hero, and contact fields alongside the complete JSON document. Validation paths are mapped to inline field errors; the JSON editor remains available for collections and less common fields. `identity.email` is the canonical public email source used by public CTAs and structured data.
- Image upload is optional and stays unavailable when the R2 binding is absent. Uploaded assets remain draft-only until a published document references them.
- Public hero, story, and travel titles are required, non-whitespace strings capped at 240 characters. Media dimensions are positive integers capped at 20,000. Dimensions may be omitted as a pair, but a partial pair is rejected; supplied pairs must stay between 1:4 and 4:1. Consumers use stable image defaults when dimensions are absent.

No live CMS save, publish, or upload request was submitted during this handoff.

## Print model

`/resume` exposes a `Print / save PDF` action. The print stylesheet uses A4 with 10mm margins, hides the site shell, footer, skip link, route scene, filter controls, CMS, and résumé actions, and preserves a compact two-column résumé layout with a 30mm portrait. It removes transforms, transitions, filters, and motion from the résumé subtree. The page count and PDF appearance still require browser print verification.

## Canonical checks

Run these four checks before handoff:

```sh
bun run typecheck
bun run check
bun run test
bun run build
```

`bun run check` runs Oxlint and Oxfmt. Browser and responsive, keyboard, reduced-motion, contrast, and print QA remain separate checks and were not run here.
