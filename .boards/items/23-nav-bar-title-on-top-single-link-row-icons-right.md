---
id: 23
type: Issue
title: Nav bar: title on top, single link row, icons right (per reference site)
state: Closed
tags: needs-triage
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Restyle the nav closer to the reference site in Whitney's notes (satomikawakita.com): the site title alone on the top line, one row of real links beneath it, and the utility icons pushed to the right. Supersedes the two-row link split from [[3-top-bar-split-nav-into-two-rows]].

Also: drop the link for the page you are already on, to keep the row clean.

## Discussion
- 2026-08-03: Reviewed the reference nav directly. Its shape is a centred letterspaced wordmark on line one, then a single row of links with a thin divider before a group of four icons at the right. Ours now matches that structure.
- 2026-08-03: "Just the title of the site at the top" means **text, not the neon lockup** — so the logo image is out of the nav on every page, not just home. `hideBrand` (added for [[20-home-drop-the-logo-from-the-nav-bar]]) is gone; `.sss-wordmark` replaces `.sss-brand`. On home the lockup still runs full size in the hero; elsewhere the wordmark is the only brand mark above the fold. Flag if the other pages should get the lockup back.
- 2026-08-03: Whitney's two link groups survive as one row with a divider between them: Home / Library / Glossary / Images | Shop / Meet the Artist. So [[3-top-bar-split-nav-into-two-rows]] is superseded in layout but its grouping is intact.
- 2026-08-03: Current-page link is filtered out by `useLocation()`. `/library/:slug` counts as being on Library, so article pages hide it too.
- 2026-08-03: "Images" is still the inert dimmed placeholder — there is no `/images` route. It is the one item in the row that is not a real link; say the word and it comes out until the page exists.
- 2026-08-03: `pages/Shop.jsx` renders no `SiteHeader` at all, so `/shop` has no nav. Pre-existing (the page is empty scaffolding), not touched here.
- 2026-08-03: [Closed] Shipped on branch home-page-layout.
