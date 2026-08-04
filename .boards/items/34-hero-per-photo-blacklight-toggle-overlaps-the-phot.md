---
id: 34
type: Issue
title: Hero: per-photo blacklight toggle overlaps the photo
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Whitney: "The blacklight toggle Is partially covering the photo."

The per-image switch added by [[19-give-each-paired-photo-its-own-blacklight-toggle]]
sits in the caption slot of `components/UvPhoto.jsx` and is riding over the
image edge. Viewport where she saw it is unknown — check both phone and desktop.

## Discussion
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision. Cause was literal: `.uv-photo-toggle` was `position: absolute; bottom: 0`, deliberately overlaying the bottom strip of the image as a scrim caption. She read that as the toggle covering the photo, which it was.
- 2026-08-03: Fix needed a DOM change, not just CSS. The lit image is `position: absolute; inset: 0` against `.uv-photo`, so simply putting the button back in normal flow would have stretched the blacklight shot over the button too. Added a `.uv-photo-frame` wrapper around the two stacked images; the overlay now resolves against that, and the button sits under it in flow. Measured after: the switch's top edge is exactly at the photo's bottom edge, no overlap, still inside the `.hero-figure` deco border at both 400px and 1400px, and the lit image still covers the base image to the pixel (0,0,0,0 on top/left/width/height).
- 2026-08-03: Hover background changed with it. The old near-opaque `--void` fill was a scrim over the photo; below the photo it read as a black bar flashing in, so it is now the faint accent wash `.btn-ghost:hover` uses.
