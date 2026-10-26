# Portfolio development

`sohelislamimran.com` is a TanStack Start application with file-based routes, full-document SSR, streaming boundaries, and a Cloudflare Workers runtime. Public pages read one published D1 document. The owner CMS keeps drafts, published revisions, and optional media metadata behind a separate server boundary.

## Routes and filters

| Path | Purpose |
| --- | --- |
| `/` | Home page with the published hero, selected work, career timeline, capabilities, background, and contact sections. |
| `/work` | Work index with the `group` search parameter set to `all`, `product`, `open-source`, or `experiment`. |
| `/story` | Long-form story with chapter anchors, progress navigation, and the published source link. |
| `/field-notes` | Public travel journal. Only entries with `visibility: "public"` are shown. |
| `/resume` | Web résumé and print/PDF view. |
| `/links` | Curated directory with the `kind` search parameter set to `all`, `social`, `contact`, `work`, `story`, or `other`. |
| `/links/:linkId` | Published link redirect. Unknown IDs use the shared not-found state. |
| `/cms` | Owner-only editor. The public host redirects here; the CMS host serves the editor. |
| `/resume/edit` | Compatibility redirect to the CMS host. |
| `/media/:assetId` | Published R2 media when the optional `MEDIA` binding exists. |

The app also serves `robots.txt`, `sitemap.xml`, and `rss.xml`. Public routes provide canonical URLs, Open Graph and Twitter metadata, and JSON-LD. CMS and redirect responses are marked private and no-store, with no-index directives.

Work and links filters are URL-backed. Their Zod schemas replace unknown values with `all`. Filter changes replace the search string without resetting scroll, and the components provide keyboard movement across the visible controls. Work groups projects into product systems, open source, and experiments. The link directory is a curated set based on the verified public profiles, plus the site's story, field-notes, and email destinations; it is not a claim that the list covers every account.

## Content and publishing

The content contract is schema version 3. `src/content/initial.ts` is the safe public seed used when no D1 binding is available or when the blank bootstrap document is read. Applying `0001`, `0002`, and `0003` to an empty database leaves a revision-one document whose JSON still declares `schemaVersion: 2` with empty collections and a blank hero title, so that row is treated as the bootstrap document and hydrated with the seed. A configured database whose document carries owner collections, an unsupported or fractional schema version, or any other malformed JSON is an error rather than a silent seed fallback.

The D1 document stores draft JSON, published JSON, revision numbers, update timestamps, and the actors responsible for changes. Public loaders call the published-content path. The public conversion step removes private travel entries and clears media object keys before the document reaches SSR. `identity.email` is the canonical public email source; the home CTA, résumé CTA, and structured data use it, so public email copy must not be derived from `contact.email`.

The CMS provides:

- structured controls for the site, identity, hero, and contact fields;
- a complete JSON editor for collections and fields without a dedicated control;
- inline validation errors and disabled actions while the document is invalid or a mutation is pending;
- explicit save and publish actions with optimistic revision checks;
- a local revert action and a navigation blocker for unsaved edits;
- an optional image upload flow that requires alt text and keeps new objects draft-only.

Kuno copy stays generalized. Do not publish private repositories, customer details, internal measurements, credentials, or confidential implementation details. Only the public personal profiles recorded in `docs/sohel-profile/identity.md` should be used as profile destinations. Volatile metrics must keep their measurement date or period in the label.

## Local development

Use Bun and copy the example environment file without committing it:

```sh
bun install
cp .dev.vars.example .dev.vars
bun dev
```

`bun dev` applies pending migrations to the local D1 database before starting Vite. The equivalent explicit migration command is:

```sh
bun run db:migrate
```

The `shadcn` package is a development dependency. It is the component authoring CLI behind `components.json` and is never imported by application or Worker code, so it stays out of `dependencies` and out of the deployed bundle. Regenerate `bun.lock` with `bun install --lockfile-only` after any dependency change.

The local CMS can bypass Access only when `ENVIRONMENT=development`, `OWNER_EMAIL` is set, and the request hostname is loopback. Production CMS reads and mutations require a valid Access assertion and the server-side owner checks. Do not put Access tokens, cookies, draft content, or private media keys in logs or commits.

## Cloudflare configuration

`wrangler.jsonc` defines the `portfolio` Worker, the `DB` binding for `portfolio-content-production`, the three configured hostnames, and the public variables `APP_ORIGIN`, `CMS_ORIGIN`, `OWNER_EMAIL`, and `ENVIRONMENT`. It keeps `workers.dev` and preview URLs disabled. The R2 binding is intentionally commented out; the current checkout uses static images and does not require R2.

The repository contains explicit migrations under `migrations/`:

- `0001_initial.sql`
- `0002_profile_links.sql`
- `0003_project_categories.sql`

The production migration command is:

```sh
bunx wrangler d1 migrations apply portfolio-content-production --remote
```

That command is an operator step, not evidence that the remote database has been migrated. Confirm the target account and inspect the command output before deploying. This checkout does not establish the remote Worker, D1, Access, DNS, or migration state.

Cloudflare Access must protect the CMS hostname in production. Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUDIENCE` as Worker secrets after the Access application exists:

```sh
bunx wrangler secret put ACCESS_TEAM_DOMAIN
bunx wrangler secret put ACCESS_AUDIENCE
```

The Worker verifies the Access assertion, owner allowlist, request origin, and CSRF token. `/resume/edit` and the public `/cms` path redirect to the CMS hostname. R2 can be enabled later by adding the binding to `wrangler.jsonc` and running `bun run cf-typegen`; do not infer remote bucket state from the commented configuration.

## Print and motion

`/resume` renders a `Print / save PDF` action. The print stylesheet uses A4 with 10mm margins, hides the shared header, footer, skip link, route scene, filters, CMS, and résumé actions, and preserves a compact two-column layout with a 30mm portrait. It disables transforms, transitions, filters, and motion in the résumé subtree. Measure the final page count and PDF appearance in a browser before release.

The root uses `MotionConfig reducedMotion="user"`. Tailwind v4 transform utilities are transitioned with the matching `transform`, `translate`, `scale`, and `rotate` longhands. Browser checks for responsive layout, keyboard behavior, reduced motion, contrast, and print output remain separate from static checks.

## Canonical checks

Run all four checks before handoff:

```sh
bun run typecheck
bun run check
bun run test
bun run build
```

`bun run check` runs Oxlint and Oxfmt. These checks do not replace browser QA or a remote Cloudflare status review.
