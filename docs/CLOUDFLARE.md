# Cloudflare deployment

The portfolio runs as one Cloudflare Worker with three custom hostnames:

- `https://sohelislamimran.com` — canonical public site
- `https://www.sohelislamimran.com` — redirects to the apex hostname
- `https://cms.sohelislamimran.com` — private unified CMS

The Worker is configured for a D1 database named `portfolio-content-production`.
Verify that the database exists in the intended Cloudflare account before the
first production deploy; the TanStack migration preserves the existing binding
shape and versioned migration history, but it does not create Cloudflare
resources on your behalf.

## CMS access

The CMS is protected in two layers:

1. Cloudflare Access protects the `cms.sohelislamimran.com` hostname with a
   default-deny policy that allows only `sohelislamimran@gmail.com`.
2. The Worker verifies the Access JWT, audience, team domain, and owner email
   before allowing draft, publish, or media mutations.

To configure production Access (dashboard action required):

1. In Zero Trust, add GitHub as an identity provider. The GitHub OAuth callback
   is the Access team callback shown by Cloudflare (`/cdn-cgi/access/callback`).
2. Create a self-hosted Access application for `cms.sohelislamimran.com`.
3. Add an Allow policy for `sohelislamimran@gmail.com`; leave the default policy
   deny-by-default and enable MFA if desired.
4. Add the CMS hostname as a custom domain for this Worker. Cloudflare manages
   the DNS record and certificate for a custom domain.
5. Configure the Worker variables and secrets below. Access values are secrets
   or dashboard configuration and must not be committed.

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

Set these as Worker secrets or protected dashboard values:

```sh
wrangler secret put ACCESS_TEAM_DOMAIN
wrangler secret put ACCESS_AUDIENCE
```

Never paste Access JWTs, cookies, contract data, or draft content into logs,
commits, or issue reports.

## Media storage

R2 is optional. The binding is intentionally commented in `wrangler.jsonc` so a
deployment cannot fail because the bucket has not been created. After creating
and verifying the `portfolio-media-production` bucket in the dashboard, enable
the `MEDIA` binding and run:

```sh
bun run cf-typegen
```

Then deploy normally. The application keeps public media reads separate from
owner-only uploads and publishes only media referenced by published content.

## Free-tier guardrails

This configuration does not enable Workers Paid, paid WAF features, or other
billable add-ons. Workers, D1, R2, and Access should remain within their free
plan limits for a personal portfolio. Free plans have usage quotas and may
throttle or reject requests when a quota is exceeded; they do not make the
application immune to limits.

Before deployment, verify in the Cloudflare dashboard that the account and
Worker are on the intended plan and that no paid add-on is enabled. Configure
usage notifications where available. Domain registrar auto-renewal is separate
from Worker billing and is not changed by this project.

## Local development

Copy `.dev.vars.example` to `.dev.vars` and replace Access placeholders with
local test values. Do not commit `.dev.vars`. Local CMS requests can use the
`CMS_ORIGIN` value from the example file; production Access still applies only
to the production CMS hostname.
