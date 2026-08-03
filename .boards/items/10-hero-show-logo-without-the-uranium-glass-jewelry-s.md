---
id: 10
type: Issue
title: Hero: show logo without the "Uranium Glass Jewelry" sub-text
state: Closed
tags: needs-triage
parent: 2
created: 2026-07-22
modified: 2026-08-03
---
Notes: "After this my logo without the 'Uranium glass jewelry' underneath it". Needs a logo asset variant without the descender text.

## Discussion
- 2026-08-03: Whitney clarified the scale — the logo should be a **large hero image at the top of the page**, not just the lockup in the nav bar. Treat it as the hero's primary visual, with the tagline (#11) and CTAs (#12) beneath it.
- 2026-08-03: This pairs with the nav work: as the nav moves to hamburger + icons (#8, #9), the big logo carries the branding that the nav bar currently does.
- 2026-08-03: No new asset was needed — `StoryShapedStudiosNeonGlow_Rect.png` (already in `public/assets/`, used by the nav) is the variant without the "Uranium Glass Jewelry" descender. It now heads the hero at `min(94%, 760px)` inside an `<h1>`.
- 2026-08-03: Gotcha found while building: the `<h1>` wrapper must NOT carry `position`/`z-index`. That opens a stacking context and the logo's `mix-blend-mode: screen` then has nothing to blend against, so the art's opaque black box shows. The z-index lives on the `<img>` instead.
- 2026-08-03: [Closed] Shipped on branch home-page-layout.

