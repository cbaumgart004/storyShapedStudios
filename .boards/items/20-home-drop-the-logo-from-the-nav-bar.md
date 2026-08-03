---
id: 20
type: Issue
title: Home: drop the logo from the nav bar
state: Closed
tags: needs-triage
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
With the logo running as a large hero image (#10), repeating it in the nav bar duplicates the lockup. Whitney asked for it removed from the nav — "at least on the home page".

## Discussion
- 2026-08-03: Implemented as a `hideBrand` prop on `SiteHeader`, passed only by `Home`. Other pages keep the nav lockup, since they have no hero logo to carry the branding. Verified: `/` has no `.sss-brand`, `/meet-the-artist` still does.
- 2026-08-03: `.sss-nav.has-no-brand` switches the bar to `justify-content: flex-end` so the two link rows stay right-aligned instead of being stretched across the full width by `space-between`.
- 2026-08-03: "At least on the home page" leaves the door open — if Whitney wants it gone site-wide, pass `hideBrand` from the other pages too, but they would then have no visible brand mark above the fold.
- 2026-08-03: [Closed] Shipped on branch home-page-layout.
- 2026-08-03: Superseded later the same day by [[23-nav-bar-title-on-top-single-link-row-icons-right]], which answers the "at least on the home page" question: the lockup is now out of the nav **site-wide**, replaced by a text wordmark. The `hideBrand` prop this issue added has been removed as redundant.
