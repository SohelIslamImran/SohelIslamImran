# Portfolio development

`sohelislamimran.com` is a React Router v8 Framework Mode application rendered on Cloudflare Workers. Public content comes from one versioned D1 document. The owner editor saves drafts, publishes explicit revisions, rejects stale-tab writes, and validates every public link before storage.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Company-first portfolio and interactive career line |
| `/work` | Kuno case studies, career history, and the interactive systems orbit |
| `/story` | Long-form career story |
| `/field-notes` | Travel journal and future memories |
| `/resume` | Web and print résumé |
| `/links` | Editable public link directory |
| `/links/:linkId` | Validated, no-store profile redirects |
| `/resume/edit` | Cloudflare Access-protected owner editor |
| `/media/:assetId` | Published R2 media when the optional bucket is enabled |

The app also serves `robots.txt`, `sitemap.xml`, and `rss.xml`. Public routes include canonical URLs, Open Graph and Twitter metadata, and JSON-LD. Private editor pages are `noindex` and `no-store`.

## Local development

```sh
npm install
npx wrangler d1 migrations apply DB --local
npm run dev
```

Run the release checks before pushing:

```sh
npm run typecheck
npm run build
git diff --check
```

The editor intentionally returns `401` without a valid Cloudflare Access assertion. Public routes use `app/content/initial.ts` if D1 is unavailable or still contains the blank bootstrap document.

## Cloudflare resources

- Worker: `sohel-portfolio`
- Production D1: `portfolio-content-production`
- Canonical domain: `sohelislamimran.com`
- `www.sohelislamimran.com` redirects permanently to the apex domain
- Optional private R2 bucket: `portfolio-media-production`

Apply production migrations and deploy with:

```sh
npx wrangler d1 migrations apply portfolio-content-production --remote
npm run deploy
```

Cloudflare Access should protect both `/resume/edit` and `/resume/edit/*`, allowing only the owner email. Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` after the Access application exists. The Worker verifies the Access JWT again before any editor action.

R2 remains optional. The portfolio ships with local placeholder media and runs without it. If R2 is enabled later, add the `MEDIA` binding from the commented template in `wrangler.jsonc`; draft assets stay private until their content revision is published.

## Content boundaries

- Kuno work is generalized. Customer names, private repositories, internal metrics, and confidential implementation details do not belong in public content.
- The contract screenshot is source material only and is not published.
- Travel entries support public, unlisted, and private visibility. Only public entries appear in the journal.
- The profile photo and generated work/travel artwork are replaceable files under `public/images`.
