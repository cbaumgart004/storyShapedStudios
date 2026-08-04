---
id: 4
type: Issue
title: Top bar: find a new home for the Home button
state: Closed
tags: needs-info
parent: 2
created: 2026-07-22
modified: 2026-08-03
---
Open design question from the notes: "Is there somewhere else the home button can go so these are more aesthetic across the top?" Needs a decision before the two-row bar is finalized. Blocks/pairs with the two-row nav work.

## Discussion
- 2026-08-03: [Closed] Obsolete, not answered — same fate as [[3-top-bar-split-nav-into-two-rows]]. The question was scoped to "the two-row bar", and that layout no longer exists: [[23-nav-bar-title-on-top-single-link-row-icons-right]] replaced it with the site title on its own line above a single row of links, and Track C then rebuilt that row as `.sss-navitem` cells (a 3-column grid under 760px).
- 2026-08-03: The underlying concern is also handled. Home is now an ordinary nav link that removes itself on the page you are already on, via `useLocation()`, so it never sits there redundantly — which is what "more aesthetic across the top" was asking for. Reopen only if Whitney raises the placement again against the current bar.

