---
id: 3
type: Issue
title: Top bar: split nav into two rows
state: Closed
tags: needs-triage
parent: 2
created: 2026-07-22
modified: 2026-08-03
---
Row 1: Library, Glossary, Images. Row 2: Shop, Meet the Artist, blacklight toggle.

## Discussion
- 2026-08-03: SiteHeader nav split into two .sss-navrow divs inside .sss-navlinks (now a right-aligned column). "Collection" relabelled "Shop" to match the notes. No /images route exists, so Images renders as an inert dimmed .sss-navlink-soon placeholder rather than a dead link — swap to a <Link> when the page lands.
- 2026-08-03: Home has no home in Whitney's two rows and #4 (its final placement) is still open, so it sits at the head of row 2 as an interim spot. Revisit under #4.
- 2026-08-03: [Closed] Shipped on branch home-page-layout.
- 2026-08-03: **Superseded the same day by [[23-nav-bar-title-on-top-single-link-row-icons-right]]** — Whitney asked for the bar to follow the reference site instead: title on top, one row of links, icons right. The two `.sss-navrow` divs are gone. Her grouping survives as one row with a divider (Home / Library / Glossary / Images | Shop / Meet the Artist), and the interim Home placement this issue introduced is moot now that the current page's own link is dropped.

