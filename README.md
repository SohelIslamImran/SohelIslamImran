<div align="center">
  <img src="./public/images/sohel-linkedin-400.webp" width="128" height="128" alt="Sohel Islam Imran" />
  <h1>Sohel Islam Imran</h1>
  <p><strong>Lead Full Stack Engineer at Kuno</strong><br />Product systems, mobile infrastructure, and delivery from Dhaka for teams everywhere.</p>
  <p>
    <a href="https://sohelislamimran.com">Portfolio</a> ·
    <a href="https://www.linkedin.com/in/sohelislamimran/">LinkedIn</a> ·
    <a href="https://github.com/SohelIslamImran">GitHub</a> ·
    <a href="https://x.com/SohelIslamImran">X</a> ·
    <a href="mailto:sohelislamimran@gmail.com">Email</a>
  </p>
</div>

## What I build

I follow product problems through the whole stack: interface behavior, services, data, authorization, release systems, and the feedback loops that keep software dependable.

At Kuno, I lead full-stack engineering across secure enterprise learning flows, role-aware product behavior, localized interfaces, internal tooling, CI/CD, observability, and platform operations. Public descriptions stay intentionally general where the product itself is private.

### Experience

| Period              | Company   | Role                         |
| ------------------- | --------- | ---------------------------- |
| Mar 2026 — present  | Kuno      | Lead Full Stack Engineer     |
| Jan 2025 — Mar 2026 | Kuno      | Full Stack Engineer          |
| Dec 2023 — Jan 2025 | Kuno      | Mobile Application Developer |
| Jun 2021 — Jan 2024 | Tilleli   | React Native Developer       |
| Jul 2021 — Sep 2021 | Bugfixers | Frontend Developer           |

### Selected public work

- [`expo-in-app-updates`](https://github.com/SohelIslamImran/expo-in-app-updates) — native Android and iOS update flows behind one compact Expo API.
- [`ghosttime`](https://github.com/SohelIslamImran/ghosttime) — a customizable Ghostty-style animation for any terminal.
- [`TailSync`](https://github.com/SohelIslamImran/TailSync) — private iOS transfers to personal Tailscale Taildrop devices.
- [`AndroidMacDisplay`](https://github.com/SohelIslamImran/AndroidMacDisplay) — a local USB path for using an Android phone as a secondary Mac display.

The current toolkit includes TypeScript, React, React Native, Expo, TanStack, ElysiaJS, Bun, PostgreSQL, Redis, Swift, Kotlin, containers, and Cloudflare. The tools change; clear product behavior and safe delivery do not.

## Beyond the code

I started learning on a phone in Bangladesh before I owned a computer. That path now runs through full-stack engineering, open source, mentoring, and a growing wish to work remotely while seeing more of the world.

- [Read the full story](https://sohelislamimran.com/story)
- [Follow the travel journal](https://sohelislamimran.com/field-notes)
- [Find every public link](https://sohelislamimran.com/links)

## This repository

This profile repository contains the source for `sohelislamimran.com`, a Kuno-first portfolio called **Prism Route**. The public surface is intentionally quiet: a white/paper foundation, cobalt route markers, orange signal states, restrained glass, and one keyboard-accessible route-orbit interaction.

### Stack

- **TanStack Start + TanStack Router** — file-based routes, typed loaders/search params, server functions, full-document SSR, and streaming-ready boundaries.
- **React 19 + TypeScript 7** — the UI and shared content contracts.
- **Vite 8 + Bun** — local development and the canonical lockfile.
- **Cloudflare Workers + D1** — edge runtime and revisioned published content; optional R2 media storage remains disabled.
- **Cloudflare Access** — owner-only CMS authentication, currently using Cloudflare's account identity provider.
- **Tailwind CSS 4 + Prism Route tokens** — shared color, type, radius, and motion tokens with authored geometry for the signature route surfaces.
- **Oxlint, Oxfmt, Vitest** — fast static checks, formatting, and focused tests.

Public routes are SSR-first and read published content only. Drafts and private travel entries remain behind the CMS boundary, and public responses never expose R2 object keys.

### Local development

```sh
bun install
bun dev
```

Useful commands:

```sh
bun run build       # production client + SSR/Worker build
bun run typecheck   # Wrangler bindings + strict TypeScript
bun run check       # Oxlint + Oxfmt
bun run test        # focused Vitest tests
bun run preview     # preview the Vite build
bun run deploy      # build, then wrangler deploy
```

Copy `.dev.vars.example` to `.dev.vars` for local values. Never commit Access tokens, CSRF material, database credentials, R2 keys, or contract information.

## CMS and Cloudflare

The portfolio is deployed at `https://sohelislamimran.com`. The `www` hostname redirects to the apex, and `https://cms.sohelislamimran.com` is protected by an owner-only Cloudflare Access policy. The Worker also verifies the Access JWT and owner allowlist, checks origin and CSRF on mutations, and keeps draft/publish revisions safe.

Setup and rollout details live in [`docs/CLOUDFLARE.md`](./docs/CLOUDFLARE.md).

The single production Worker is named `portfolio`; it owns the D1 binding, three custom domains, Access application, and security settings. The CMS uses Cloudflare's account identity provider behind an owner-only email policy; no separate GitHub OAuth credential is required. R2 remains off because the current release uses static media and does not need usage-based object storage.

Production remains on the last verified Worker release while UI and interaction changes are reviewed on this branch. Deploy only after the preview and acceptance checks in [`docs/CLOUDFLARE.md`](./docs/CLOUDFLARE.md) pass.

The zone is on Cloudflare's Free Website plan, and this release did not enable Workers Paid, R2, or paid security add-ons. Free quotas may throttle traffic instead of providing unlimited capacity. Domain renewal is separate, remains enabled, and was not changed by this deployment.

## Privacy and publishing

The public story is generalized and does not publish salary, addresses, signatures, IDs, contract terms, private customer details, or private repositories. The CMS publishes only the validated document revision; public loaders never read drafts. Redirect utilities under `/links/:linkId` are allowlisted and marked `noindex`.

## License

The portfolio content and visual identity are personal. Source code is shared for reference; contact me before reusing personal copy, photographs, or brand assets.
