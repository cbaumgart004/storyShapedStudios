---
id: 45
type: Issue
title: Blacklight: glowing text reads as two different greens
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Reported as a colour mismatch between the logo, "Connect With Us" and the rest
of the page. All blacklight-oriented text to match the "Connect With Us" colour.

## Discussion
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision. **The colours were already identical** — `.sss-social-head`, `.hero-tagline`, `.hero-credit`, the `h2` rules and `.value h3` all computed to `rgb(87, 255, 94)` before the change, because they all read `var(--accent)`. Nothing was mismatched in `color`.
- 2026-08-03: The real cause was the glow. `--glow-strong`'s innermost layer was `--halo` (`#b9ffbc`, a pale mint), so anything wearing it — the hero tagline above all — bloomed toward white and read as a lighter, whiter green than text wearing the plain `--glow-1`. Removed `--halo` entirely; every layer of `--glow-strong` is now `--uranium`. Its two other consumers, `.btn-primary:hover` and the (unreferenced) `flicker` keyframe, moved with it so nothing reintroduces the pale layer.
- 2026-08-03: Verified on a fresh blacklight load — all five accent elements match `.sss-social-head` exactly, and no text-shadow contains a pale layer. Fresh loads rather than a toggle click, per the hidden-tab transition trap in `CURRENT_WORK.md`.
- 2026-08-03: **The logo still does not match, by decision.** Sampled from the artwork, its neon strokes are `rgb(0, 253, 0)` — pure green, no red or blue — against text at `rgb(87, 255, 94)`. That is baked into the PNG and no text rule can close it. Options put to the user were to filter the logo toward the text, move `--uranium` toward the logo, or leave it; **leave it** was chosen, so the artwork stays a harder green than the type.
- 2026-08-03: `--muted` body and nav copy (`rgb(143, 174, 143)`) deliberately not touched — it is a different colour family from the accent, and turning it green would undo the hierarchy [[24-blacklight-daylight-text-should-change-colour-with]] tuned. Raised with the user; no change requested.
- 2026-08-03: Button weight extended alongside this. Both `.btn` CTAs already carried `font-weight: 700` from [[33-hero-bolder-text-on-the-cta-buttons]] — they are the only two `.btn` elements in the codebase — so the unbold controls were the ones outside that class: `.uv-toggle` (nav) and `.uv-photo-toggle` (per-photo switch), both at 400. Both now 700. On `.uv-toggle` the declaration must sit **after** its `font: inherit` shorthand or the shorthand resets it.
- 2026-08-03: Left at 400 and not treated as buttons: `.prose-link` (a text link with an arrow, not a control) and the nav links. Library and Glossary controls also untouched — out of scope for a Home review, but they are the obvious next candidates if the bold treatment should be site-wide.
