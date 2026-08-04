---
id: 44
type: Issue
title: Hero: credit carries the same status as a value name
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Elevate "Created by Whitney Granger, internationally recognized uranium glass
jewelry artist and historian" to the same visual status as a What We Believe
value name ("Preserving History").

Supersedes the sizing done under
[[35-hero-enlarge-the-created-by-whitney-granger-credit]], which only nudged it
from 0.86rem to ~1rem in muted grey. This goes further: same face, weight, size,
tracking, accent colour and glow as `.value h3`.

## Discussion
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision. Implemented as a **shared rule** — `.value h3, .hero-credit { … }` — rather than duplicated declarations, because "the same status" only stays true if a later retune of one moves the other. `.hero-credit` keeps its own layout (`max-width: 46ch`, positioning) and its own `line-height: 1.45`: it is a full sentence rather than a two-word label, so it needs more leading than a value name does. The `margin` stayed on `.value h3` alone.
- 2026-08-03: Verified on fresh loads in both modes — face, weight, size, tracking, colour and text-shadow are identical between the credit and a value name, and both flip with the toggle (`rgb(217,255,107)` / `rgba(217,255,107,0.4) 0 0 1px` daylight, `rgb(87,255,94)` / `rgba(87,255,94,0.7) 0 0 5px` blacklight). 21.6px at desktop, 17.6px at 400px, no overflow.
- 2026-08-03: Left as a `<p>`, not promoted to a heading element. The ask was about visual status; making it an `h3` would insert a heading into the hero outline directly under the `<h1>` logo, which is a different claim about the page structure than the one being made.
