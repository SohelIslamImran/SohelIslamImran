# Cloudflare deployment

The portfolio runs as one Cloudflare Worker named `portfolio` with three custom
hostnames:

- `https://sohelislamimran.com` — canonical public site
- `https://www.sohelislamimran.com` — redirects to the apex hostname
- `https://cms.sohelislamimran.com` — private unified CMS

## Production status

The TanStack Start build is deployed to the `portfolio` Worker. The former
duplicate Worker was removed after its domains and settings were migrated. The
apex,
`www`, and CMS custom domains are active. The
`portfolio-content-production` D1 database exists, both migrations are applied,
and the public site reads the published revision.

The production zone currently has:

- the Free Website plan
- Full (strict) SSL mode
- Always Use HTTPS, TLS 1.2 minimum, TLS 1.3, HTTP/3, Brotli, and Browser
  Integrity Check enabled
- 0-RTT disabled to avoid replaying state-changing CMS requests
- DNSSEC enabled and awaiting automatic DS publication by Cloudflare Registrar
- no public `workers.dev` or preview hostname for the production Worker

## CMS access

The CMS is protected in two layers:

1. Cloudflare Access protects the `cms.sohelislamimran.com` hostname with an
   owner-only policy that allows `sohelislamimran@gmail.com`. Requests without
   a valid Access session never reach the Worker.
2. The Worker verifies the Access JWT, audience, team domain, and owner email
   before allowing draft, publish, or media mutations.

The self-hosted Access application, owner policy, custom domain, Access audience,
and team-domain secrets are configured. It uses Cloudflare's account identity
provider by owner choice, so no separate GitHub OAuth app or persistent client
secret is created.

The old `/resume/edit` path remains an application compatibility path and should
redirect to the CMS hostname. The public apex never serves draft content.

## Variables

Non-secret production variables are in `wrangler.jsonc`:

| Variable      | Production value                  |
| ------------- | --------------------------------- |
| `APP_ORIGIN`  | `https://sohelislamimran.com`     |
| `CMS_ORIGIN`  | `https://cms.sohelislamimran.com` |
| `OWNER_EMAIL` | `sohelislamimran@gmail.com`       |
| `ENVIRONMENT` | `production`                      |

These are configured as Worker secrets and must not be committed:

```sh
wrangler secret put ACCESS_TEAM_DOMAIN
wrangler secret put ACCESS_AUDIENCE
```

Never paste Access JWTs, cookies, contract data, or draft content into logs,
commits, or issue reports.

## Media storage

R2 is optional and remains disabled. Static profile and placeholder media ship
with the Worker assets, so the public site and CMS content editor do not need R2
for the current release. The binding is intentionally commented in
`wrangler.jsonc`; this also avoids activating usage-based R2 billing merely for
unused storage.

If editable media uploads become necessary, enable R2 deliberately, create the
`portfolio-media-production` bucket, enable the `MEDIA` binding, and run:

```sh
bun run cf-typegen
```

Then deploy normally. The application keeps public media reads separate from
owner-only uploads and publishes only media referenced by published content.

## Free-tier guardrails

The zone was verified on the Free Website plan before this deployment. This
release did not enable Workers Paid, R2, paid WAF rules, or another paid add-on.
Workers, D1, and Access remain within their free-compatible product shapes for
this personal portfolio. Free quotas can still throttle or reject requests when
exceeded; application configuration cannot guarantee account-wide billing.

Cloudflare Registrar renewal is separate from Worker usage. Domain auto-renewal
remains enabled and was not changed; it is currently scheduled against the
domain's 2028 expiration date. Change that only as an explicit registrar
decision, not as part of an application deployment.

## Local development

Copy `.dev.vars.example` to `.dev.vars` and replace Access placeholders with
local test values. Do not commit `.dev.vars`. Local CMS requests can use the
`CMS_ORIGIN` value from the example file; production Access still applies only
to the production CMS hostname.
