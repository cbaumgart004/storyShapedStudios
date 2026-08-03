---
id: 9
type: Issue
title: Add right-side utility icons: search, login, wishlist, cart
state: Closed
tags: needs-triage
parent: 2
created: 2026-07-22
modified: 2026-08-03
---
Notes: "on the right a search icon, login (person) icon, a heart for wish list, and a cart icon." Icons only for now; destinations/behavior per icon may need separate follow-ups.

## Discussion
- 2026-08-03: Shipped as inline SVG in `components/navIcons.jsx`, rendered by `SiteHeader` at the right of the link row behind a thin divider. `currentColor` means they track the UV palette; they are dimmed and inert.
- 2026-08-03: This issue was always "icons only" — the functions behind them are tracked separately as [[22-wire-up-the-nav-utility-icons]].
- 2026-08-03: [Closed] Shipped on branch home-page-layout.
- 2026-08-03: **Preview only.** The icons stay visible on `home-page-layout` so Whitney can see the finished bar, but they must be hidden when this branch merges to `main` — nothing behind them works and main is the live site. `SiteHeader.jsx` has a `UTILITY_ICONS_VISIBLE` constant for exactly this: set it to `false` in the merge commit (it also drops the divider before the icons). Flip it back, or split it per icon, as [[22-wire-up-the-nav-utility-icons]] delivers each feature.

