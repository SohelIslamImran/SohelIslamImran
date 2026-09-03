# UI audit

The portfolio was reviewed locally with the in-app Browser and Computer Use. The review covered the public routes, the owner CMS, keyboard and pointer interactions, and the rendered states at 320, 375, 390, 414, 768, 834, 1024, 1280, and 1440px wide.

## Findings resolved

| Area | Finding | Resolution |
| --- | --- | --- |
| Routing | Missing public link IDs rendered a blank document and hydration errors | Use TanStack Router `notFound()` and the shared not-found state |
| Search state | Invalid `focus` and `kind` values opened the generic error page | Normalize invalid values to `identity` and `all` |
| Responsive layout | Work cards broke between 768 and 799px | Stack cards below the shared 840px card breakpoint |
| Mobile navigation | Collapsed links stayed keyboard-reachable | Render the mobile navigation only while open and restore focus on dismissal |
| Motion and SSR | Reduced-motion hydration produced mismatched Motion attributes | Centralize reduced motion with `MotionConfig` and SSR-stable initial output |
| Theme | Several accent colors failed light-theme contrast | Separate accent fill and text tokens, then validate all selectable accents |
| Composition | Route markup repeated glass, button, tag, and typography styles | Use Tailwind tokens, shadcn primitives, CVA variants, composable `MenuSurface`/`MenuIndicator` primitives, and the `cn` package |
| Content | Public pages ignored several CMS fields | Render hero, project, story, travel, contact, and résumé metadata from content |
| Empty states | Empty link categories and travel notes had little context | Add reusable empty-state compositions and recovery actions |
| CMS safety | Dirty navigation, invalid JSON, and upload feedback were weak | Add inline validation, navigation blocking, revert, current status, and safe upload responses |
| Material and motion follow-up | The first Tailwind pass flattened the link rail, removed icon lift/rotation, and made shadows too hard | Restore the compact moving rail, soft glass gradients, spring-like hover lift, rotating icon, and pale accent shadow |
| Shell and corners | Desktop chrome stretched too far and rounded corners used the default curve | Restore the hosted capped shell with a quiet hairline and apply progressive continuous `superellipse` corners to rounded utilities |
| Dark appearance | Accent-colored shadows became luminous against dark surfaces | Use neutral dark depth shadows and keep only a low-opacity accent halo for controls |
| Print résumé | The two-column grid fragmented across pages, leaving large blank areas and producing three pages | Keep the normal left/right hierarchy in print with compact A4 spacing; the measured document is now two pages with the systems column aligned beside experience |
| Work rail | The Base UI default fixed the tab list at 32px while the composed triggers were 44px, creating a clipped blue indicator and a ghost pill | Let the shared tab list size from its content and keep the indicator aligned to the full trigger height |
| Card surfaces | The generated Card radius and ring overrode the portfolio Surface radius, creating inconsistent corners and a heavier edge | Make the shared Card use the portfolio surface radius and remove the redundant ring |
| Hero regression | The Tailwind migration dropped the previous profile depth, inner image inset, and safe clipping; hyphenated CMS headlines could break at a soft hyphen | Restore the measured `translateZ(42px) rotate(2deg)` profile treatment, clip the image inside its continuous inner curve, and protect hyphenated headline tokens |
| Theme popover | Base UI unmounted the portal before an exit frame could render; View Transition captures can suppress a second pointer event mid-reveal | Keep the portal mounted through its ending state, use Base UI transition attributes, and make the exact reveal window explicit by disabling theme controls until the active transition settles |
| Mobile navigation | The previous per-link active styles made focus look like a hard border and gave each item independent motion | Use one shared, zero-bounce sliding pill with stable labels, active-route focus, a borderless tinted glass panel, and equal vertical insets |
| Menu material | Theme and mobile menus used different background recipes and shadow tokens | Compose both from the same borderless glass surface with matching blur, continuous radius, soft depth shadow, and dark-mode neutral shadow values |
| Transform transitions | Tailwind v4 emitted `translate`, `scale`, and `rotate` longhands that some custom transition lists omitted | Include all transform longhands in shared interactive transitions and verify the generated computed transition properties on hover, active, focus, and data-state controls |
| Theme reveal finish | The reveal stayed visually busy at the end while controls re-enabled with a separate opacity change | Shorten the reveal to a 420ms sequence, keep controls visually stable while temporarily disabled, and clear the transition state only after the reveal finishes |
| Content emphasis | The initial public metric and several copy strings promoted repository count and working from Dhaka | Replace the seed metric with product-engineering experience, remove promotional location phrasing, and retain location only in personal/origin contexts |
| CMS fields | Structured inputs showed document errors only in the advanced JSON editor | Map schema paths into inline field errors with `aria-invalid` and keep the existing dirty-state/revert guard |

## Interaction inventory

| Surface | Checked interactions and states |
| --- | --- |
| Shared shell | Skip link, active navigation, mobile open/close, outside dismissal, Escape focus restoration, appearance popover, theme modes, six accents, route crossfade |
| Home | Content-driven hero actions, hash navigation, route-stop buttons, keyboard stop movement, pointer tilt, swipe handling, work tabs, proof links, contact links |
| Work | Controlled URL-backed focus tabs, keyboard tab movement, explicit project focus metadata, project proof links, responsive card layout |
| Story | Chapter anchors, sticky contents navigation, active chapter progress, source link, back-to-top link, image fallback, empty chapter state |
| Field notes | Empty journal state, origin copy, public-entry rendering, region and media fields, private-entry filtering |
| Links | All six filters, URL state, roving keyboard focus, empty-category recovery, accessible link cards, redirect targets |
| Résumé | Print action, all-links navigation, email link, updated date, public proof links, empty collection states, print-specific layout selectors |
| CMS | Structured fields, invalid JSON state, disabled actions, dirty navigation blocker, revert, upload validation, safe status messages. Live save, publish, and upload mutations were not submitted against the local database. |
| Error states | Generic route error, not-found route, malformed search recovery, CMS access/configuration states |

## Browser evidence

The raw screenshots and interaction captures are stored outside the repository in the Codex visualization artifact directory. Representative post-refresh captures include:

- `after-home-desktop.png`
- `after-home-mobile.png`
- `after-work-tablet.png`
- `after-story-desktop.png`
- `after-links-empty.png`

A clean 99-case light-mode matrix and 22-case dark-mode smoke matrix reported zero horizontal overflow cases, duplicate `h1` cases, unnamed visible controls, hidden app tabbables, or local app console errors. The `/resume/edit` compatibility redirect was checked separately and correctly reached its Cloudflare Access boundary. Print-media verification now measures a two-page content flow with the résumé copy and systems column aligned side by side. The route transition was inspected mid-flight to confirm overlapping old/new content instead of a blank wait state; popup enter/exit frames were checked with explicit durations and easing; theme switching was checked in normal, reduced-motion, and rapid-input conditions. After the menu composition refactor, the theme and mobile surfaces were rechecked at 390px and 1280px in both themes: their computed blur, radius, border, and depth shadow remain identical, while the popover keeps its single transform source during exit. The raw evidence set contains public route snapshots, interaction-state snapshots, print-media captures, and a redacted CMS control inventory. No CMS draft contents or private storage keys were written to the evidence set.
