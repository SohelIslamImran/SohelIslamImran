# Cloudflare deployment

This guide describes the deployment shape represented by `wrangler.jsonc` and the Worker source. It is not a live Cloudflare account audit. This handoff did not verify a deployed Worker, active hostnames, Access, remote D1 migrations, redirects, or response headers.

## Configured shape

`wrangler.jsonc` names the Worker `portfolio` and points its main entry at `src/server-entry.ts`. It configures these routes:

| Hostname | Configured intent |
| --- | --- |
| `sohelislamimran.com` | Canonical public origin. |
| `www.sohelislamimran.com` | Redirect to the configured public origin. |
| `cms.sohelislamimran.com` | Rewrite the root to `/cms` and redirect other public paths to the public origin. |

The Worker also keeps `workers.dev` and preview URLs disabled. The `DB` binding targets the D1 database named `portfolio-content-production`. The R2 binding is commented out, so media uploads are unavailable in this configuration.

The public origin variables are:

| Variable | Value in `wrangler.jsonc` |
| --- | --- |
| `APP_ORIGIN` | `https://sohelislamimran.com` |
| `CMS_ORIGIN` | `https://cms.sohelislamimran.com` |
| `OWNER_EMAIL` | `sohelislamimran@gmail.com` |
| `ENVIRONMENT` | `production` |

These values are configuration, not proof of remote deployment.

## Host routing

`src/server-entry.ts` contains an early host-routing pass. It redirects the `www` hostname, sends public `/cms` and `/resume/edit` requests to the CMS origin, and keeps CMS runtime paths on the CMS host. The `resume.edit.tsx` compatibility route also contains a permanent redirect.

No live request verified that this redirect chain is deployed. Do not infer production routing or response headers from the checkout. Check the intended hosts directly before describing either behavior as active.

## CMS access

Production CMS access has two application-level checks:

1. Cloudflare Access must protect the CMS hostname. The application expects the owner email allowlist to match the Access identity.
2. The Worker verifies the Access assertion issuer, audience, token type, and owner email. Mutations additionally require the configured origin and matching CSRF cookie and submitted token.

Set the Access configuration as Worker secrets after the Access application exists:

```sh
bunx wrangler secret put ACCESS_TEAM_DOMAIN
bunx wrangler secret put ACCESS_AUDIENCE
```

The source does not prove that the Access application, policy, audience, team domain, or secrets are currently present in the Cloudflare account. The local loopback exception in `auth.server.ts` applies only when `ENVIRONMENT=development`, `OWNER_EMAIL` is set, and the request uses a loopback hostname.

Do not paste Access JWTs, cookies, draft JSON, private media keys, or personal contract data into logs, commits, or issue reports.

## D1 and migrations

The repository keeps SQL migrations explicit under `migrations/`:

- `0001_initial.sql`
- `0002_profile_links.sql`
- `0003_project_categories.sql`

Apply local migrations with:

```sh
bun run db:migrate
```

For a chosen production database, review the pending migrations and run:

```sh
bunx wrangler d1 migrations list portfolio-content-production --remote
bunx wrangler d1 migrations apply portfolio-content-production --remote
```

The command output and the remote database are the source of truth for migration state. This handoff does not claim that any migration has been applied remotely.

The public read path serves the seed when the D1 binding is absent or the original blank revision-one bootstrap is encountered. When D1 is configured, malformed or incomplete stored content is an error. Draft JSON never crosses the public loader.

## Media storage

R2 is optional and is not enabled in this checkout. Static profile and placeholder images are served from the Worker assets. If editable uploads are needed:

1. Create or select the R2 bucket in the intended Cloudflare account.
2. Add the `MEDIA` binding to `wrangler.jsonc`.
3. Run `bun run cf-typegen`.
4. Re-run the canonical checks and deploy deliberately.

The application keeps uploads owner-only and draft-only. `/media/:assetId` returns an object only when the media row is published. Public content references are filtered before SSR, and private object keys are cleared from the public content object.

## Release checks

Run all four canonical checks before handoff:

```sh
bun run typecheck
bun run check
bun run test
bun run build
```

`bun run check` runs Oxlint and Oxfmt. These checks validate the source and build; they do not verify DNS, Access, D1 migration state, deployed routing or headers, browser interaction, responsive behavior, reduced motion, or print output. Perform those checks separately against the intended environment.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, replace placeholders with local values, and keep the file out of version control. Use the local CMS hostname or loopback flow for development. The production Access policy and production secrets are not replaced by local values.
