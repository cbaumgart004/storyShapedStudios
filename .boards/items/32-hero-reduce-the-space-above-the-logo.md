---
id: 32
type: Issue
title: Hero: reduce the space above the logo
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Whitney: "Can you make the space above the logo a little smaller so it's more
centered?" Top padding on the hero, above the neon lockup added by
[[10-hero-show-logo-without-the-uranium-glass-jewelry-s]].

## Discussion
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision. `.hero` top padding halved to `clamp(1rem, 3vw, 2.2rem)`; sides and bottom untouched, so the hero now sits nearer the nav without the whole block moving. 35.2px at 1400px, down from 72px.
- 2026-08-03: A second rule had to move with it. `@media (max-width: 860px)` overrides `.hero { padding-top }` separately, so the first fix only applied above 860px and left phones on the old 40px — *more* headroom than the desktop it exists to slightly exceed. Halved that one too, to `clamp(1.25rem, 5vw, 2rem)`: 20px at 400px. Caught by measuring, not by eye.
