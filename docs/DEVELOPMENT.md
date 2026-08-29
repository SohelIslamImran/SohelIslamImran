# Portfolio development

`sohelislamimran.com` is a TanStack Start application rendered on the `portfolio` Cloudflare Worker. Public content comes from one versioned D1 document. The owner editor saves drafts, publishes explicit revisions, rejects stale-tab writes, and validates every public link before storage.

## Routes

| Path              | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `/`               | Company-first portfolio and interactive career line                  |
| `/work`           | Kuno case studies, career history, and the interactive systems orbit |
| `/story`          | Long-form career story                                               |
| `/field-notes`    | Travel journal and future memories                                   |
| `/resume`         | Web and print résumé                                                 |
| `/links`          | Editable public link directory                                       |
| `/links/:linkId`  | Validated, no-store profile redirects                                |
| `/cms`            | Cloudflare Access-protected owner editor                             |
| `/media/:assetId` | Published R2 media when the optional bucket is enabled               |

The app also serves `robots.txt`, `sitemap.xml`, and `rss.xml`. Public routes include canonical URLs, Open Graph and Twitter metadata, and JSON-LD. Private editor pages are `noindex` and `no-store`.

## Local development

```sh
bun install
bunx wrangler d1 migrations apply DB --local
bun dev
```

Run the release checks before pushing:

```sh
bun run typecheck
bun run build
git diff --check
```

Local development can open `/cms` without an Access token only when
`ENVIRONMENT=development`, `OWNER_EMAIL` is configured, and the request uses a
loopback hostname. Production still requires a valid Access assertion on every
CMS read and mutation. Public routes use `src/content/initial.ts` if D1 is
unavailable or still contains the original blank revision-1 bootstrap document.

## Cloudflare resources

- Worker: `portfolio`
- Production D1: `portfolio-content-production`
- Canonical domain: `sohelislamimran.com`
- `www.sohelislamimran.com` redirects permanently to the apex domain
- Planned R2 bucket, not currently created: `portfolio-media-production`

Apply production migrations and deploy with:

```sh
bunx wrangler d1 migrations apply portfolio-content-production --remote
bun run deploy
```

Cloudflare Access protects `cms.sohelislamimran.com`, allowing only the owner email. Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUDIENCE` after the Access application exists. The Worker verifies the Access JWT again before any editor action, and `/resume/edit` redirects to the CMS hostname.

R2 remains optional. The portfolio ships with optimized local media and runs without it. If R2 is enabled later, add the `MEDIA` binding from the commented template in `wrangler.jsonc`; draft assets stay private until a public content revision references them.

## Content boundaries

- Kuno work is generalized. Customer names, private repositories, internal metrics, and confidential implementation details do not belong in public content.
- The contract screenshot is source material only and is not published.
- Travel entries support public, unlisted, and private visibility. Only public entries appear in the journal.
- The profile photo and generated work/travel artwork are replaceable files under `public/images`.
