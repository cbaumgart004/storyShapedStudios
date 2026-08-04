---
id: 36
type: Issue
title: Blacklight/daylight: brighter yellow in daylight mode
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Whitney, on the new palette: "It still looks like a dull yellow. Can we do a
brighter yellow?"

Second pass on [[5-blacklight-daylight-use-a-cooler-toned-yellow]], which moved
`--vaseline` to the cool citron `#c6e87a`. She wants brighter, not warmer — the
cool-not-lemon decision from #5 still stands, so raise chroma/lightness rather
than rotating hue back toward gold.

Watch the interaction with [[24-blacklight-daylight-text-should-change-colour-with]]:
`--bone` and `--muted` must stay a real hue shift away from the blacklight
values or text stops visibly tracking the toggle. Also watch `.btn-primary`,
the only rule putting text on an accent background.

## Discussion
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision. `--vaseline` moves `#c6e87a` → `#d9ff6b`. Lightness and chroma are both up; hue moves ~78° → ~75°, which keeps it in the citron family rather than drifting back toward the gold #5 rejected.
- 2026-08-03: Three rules hardcoded the old `rgba(198, 232, 122, …)` instead of reading the token — `--line`, `--glow-1`/`--glow-strong` in the daylight block, and the daylight page gradient. All moved to `rgba(217, 255, 107, …)`; a grep confirms no `c6e87a` or `198, 232, 122` is left anywhere in `src/`.
- 2026-08-03: `--bone`/`--muted` deliberately not touched. [[24-blacklight-daylight-text-should-change-colour-with]] tuned them so type visibly changes hue with the toggle, and brightening the accent does not disturb that — verified the hero tagline still resolves to `rgb(217,255,107)` daylight against `rgb(87,255,94)` blacklight.
