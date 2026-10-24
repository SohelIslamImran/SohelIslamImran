---
project: sohelislamimran.com
last_verified: 2026-09-03
repository: https://github.com/SohelIslamImran/SohelIslamImran
---

# Personal portfolio

## Overview

The current portfolio rebuild began in August 2026 and is a TanStack Start application deployed at [sohelislamimran.com](https://sohelislamimran.com/). The public repository itself dates to 2021. The current application combines a public portfolio and resume with an owner-only publishing system.

## My role

Creator and maintainer. The repository and current branch history are authored through Sohel's GitHub identity.

## Problem

The site needs fast public pages, traceable content revisions, private drafts, safe owner publishing, and a clear boundary between public portfolio data and private CMS state.

## Solution

- Full-document SSR with TanStack Start and file-based TanStack Router routes.
- React 19, TypeScript, Vite, Bun, Tailwind CSS, and shadcn-style components.
- Cloudflare Workers runtime with D1 for revisioned content.
- Owner-only CMS protected by Cloudflare Access, server-side token verification, owner allowlisting, CSRF checks, and origin checks.
- Public loaders read published content only. Drafts remain behind the CMS boundary.
- Static media in the current release. R2 upload support remains disabled until needed.

## My contributions

- Rebuilt the portfolio around TanStack Start and Cloudflare.
- Implemented typed content contracts, D1 migrations, draft and publish revisions, media boundaries, SEO metadata, RSS, sitemap, and print-friendly resume output.
- Added responsive interaction, keyboard behavior, reduced-motion support, and a reusable component system.
- Consolidated deployment under one Worker and documented the Access and publishing model.

## Impact

The site is live and provides a current public identity, project record, resume, story, and link directory. No traffic, conversion, or search-ranking metric was verified.

## Evidence

- [Live portfolio](https://sohelislamimran.com/)
- [Public repository](https://github.com/SohelIslamImran/SohelIslamImran)
- [Open portfolio PR #1](https://github.com/SohelIslamImran/SohelIslamImran/pull/1)
- Repository [README](https://github.com/SohelIslamImran/SohelIslamImran/blob/main/README.md)

## Confidence and notes

High confidence in architecture and authorship. The current working branch contains changes newer than the production site, so verify deployment state before describing a feature as live.
