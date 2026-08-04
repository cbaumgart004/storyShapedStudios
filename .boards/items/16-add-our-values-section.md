---
id: 16
type: Issue
title: Add "What We Believe" section (was "Our Values")
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-07-22
modified: 2026-08-03
---
Section heading is decided; body copy is marked "Text pending" in the notes. BLOCKED on copy from Whitney.

**Unblocked 2026-08-03** — copy has landed and the heading is "What We Believe", not "Our Values". Seven named values, full copy in the notes doc: Preserving History, Education Through Research, Honoring the Material, Restoration & Renewal, Authenticity, Curiosity & Discovery, Caring for Every Collector.

## Discussion
- 2026-08-03: Re-checked the live notes doc — still "Text pending". Our Story (#15) got its copy in the same pass, so this is the only body section still waiting.
- 2026-08-03: Copy landed in the same doc revision that produced #27-#42. Heading renamed to "What We Believe"; filename keeps the old slug so existing links do not break. Seven values is a lot of stacked text for a splash page and three of them overlap — raised with Whitney under [[41-copy-review-grammar-and-redundancy-notes-for-whitn]], but shipping all seven as written until she rules.
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision as `#what-we-believe`, first section under the hero. Values live in a `values` array at the top of `pages/Home.jsx` rather than inline markup, since seven near-identical blocks inline would bury the page structure. New `.values-grid`/`.value` rules in `Home.css`. `.value h3` takes the same accent + glow + 0.6s transition as the `h2` rules so the names track the UV toggle; the face is `Poiret One`, already the site display font, so no new type was introduced.
- 2026-08-03: Shipped first on CSS grid with `repeat(auto-fit, minmax(16rem, 1fr))` and `justify-items: center`, which was wrong and the visual pass caught it: at 1400px the seventh card sat hard against the left edge of the last row. `auto-fit` collapses a track only when that track is empty across the *whole* grid, so a partial final row still places its one item in column 1. Rebuilt on `flex-wrap` with `justify-content: center`, where a short last row centres by itself. Measured after the fix: rows of 3/3/1 at 1400px with the final row's left and right gaps equal at 414px, and 7 centred rows of 1 at 400px.

