---
id: 33
type: Issue
title: Hero: bolder text on the CTA buttons
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Whitney: "The 'Learn about uranium glass' needs to be a bit more bold I think.
It's a little hard to see." Restated later as "a little more bold text on the
green buttons", so it applies to both CTAs from
[[12-hero-add-learn-about-uranium-glass-and-shop-the-co]], not just the first.

Weight only. She confirmed on 2026-08-03 that the fonts themselves are right as
they are — do not change a family, size or tracking.

## Discussion
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision. `font-weight: 700` on `.btn`, so both CTAs get it. Verified size (13.12px) and tracking (3.1488px) are byte-for-byte what they were, per her "the fonts are right as they are".
- 2026-08-03: Worth knowing — Poiret One ships a single 400 weight, so this is a browser-synthesised bold, not a real bold cut. That is already what `.hero-tagline` and the four `h2` rules do with this face, so it matches the site rather than introducing a new trick. If she ever wants true weight contrast it needs a second family, which is a bigger conversation.
