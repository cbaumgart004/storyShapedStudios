---
id: 13
type: Issue
title: Hero: add image that swaps with the blacklight toggle
state: Closed
tags: needs-triage
parent: 2
created: 2026-07-22
modified: 2026-08-03
---
Notes: "Followed by this image. If the image can change with the blacklight toggle that would be awesome." Both states of the image now exist in the Google Doc — they still need extracting into `public/assets/`.

## Discussion
- 2026-08-03: The notes doc holds **both** states of the same piece — a floral-drop necklace shot under blacklight (teal/green on deep blue) on page 2, and the same necklace in daylight (emerald on a linen bust) on page 3. So this is a genuine paired asset, not a CSS filter: the daylight photo is the base and the blacklight photo replaces it when the toggle flips.
- 2026-08-03: Assets are still only inside the doc. They need downloading, running through `python scripts/resize_asset.py SRC --preset NAME`, and committing to `public/assets/` before this can be built.
- 2026-08-03: Whitney reiterated the ask directly — where the site has the same piece shot in both states, the photo itself should swap with the toggle. That is broader than the hero, so the paired-photo data model (see CURRENT_WORK Track A next-step 5) is the real dependency here; today `UvMode` only drives CSS filters and cannot swap a `src`.
- 2026-08-03: Assets extracted from the doc (exported it as .docx, pulled `word/media/`) and run through `resize_asset.py --preset hero`: `hero-necklace-daylight-{900,1600}.jpg` and `hero-necklace-blacklight-{900,1600}.jpg` in `frontend/public/assets/`.
- 2026-08-03: [Closed] Shipped on branch home-page-layout using the new `UvPhoto` component from #18. Verified in the browser: the photo crossfades in both directions with the toggle.

