---
id: 31
type: Issue
title: Footer: add a copyright line
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Whitney asked twice in the notes doc ("Copyright at the bottom?", "Do we add a
copyright?") — treat as a yes.

Goes where "Crafted with love and light" used to sit, removed under
[[21-footer-remove-crafted-with-love-and-light]]. Year should be derived, not
hardcoded, so it does not go stale.

## Discussion
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision. `.footer-note` in `components/SiteFooter.jsx` now reads "© {year} StoryShaped Studios", the year from `new Date().getFullYear()`. Footer is shared, so this lands on every page, not just Home.
