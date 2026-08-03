---
id: 7
type: Issue
title: Social band: Facebook + Instagram only, drop Etsy/eBay
state: Closed
tags: needs-triage
parent: 2
created: 2026-07-22
modified: 2026-08-03
---
Notes: "Let's just do Facebook and Instagram logos and not etsy/ebay". Affects the Shop-the-Collection social band added in 6a2a46b.

## Discussion
- 2026-08-03: Added a `connectSocials` export to components/socials.js (Facebook + Instagram) and pointed SiteHeader's band at it. The footer still renders the full `socials` list, Etsy/eBay included — the note only covered the band under the nav.
- 2026-08-03: With the marketplace logos gone, "Shop the Collection" no longer described the band, so the featured heading became "Connect With Us" (aria-label updated to match). Copy call — flag if Whitney wants different wording.
- 2026-08-03: [Closed] Shipped on branch home-page-layout.

