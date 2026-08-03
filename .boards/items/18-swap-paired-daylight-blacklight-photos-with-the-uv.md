---
id: 18
type: Issue
title: Swap paired daylight/blacklight photos with the UV toggle
state: Closed
tags: needs-triage
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Where the site shows the same piece photographed twice — once in daylight, once under blacklight — the photo itself should swap when the UV toggle flips, instead of a CSS filter being applied to a single shot.

Whitney's ask (2026-08-03): "some images are the same image, one in blacklight, one in daylight. She would like these images to toggle based on toggle setting."

## Discussion
- 2026-08-03: Today `UvMode` only drives CSS custom properties and filters; nothing in the app can swap an image `src` per mode. This needs a small paired-photo model — at minimum `{ daylight, blacklight, alt }` instead of a bare image import — plus a shared component that reads `useUvMode()` and picks the right source.
- 2026-08-03: Related to Whitney's separate complaint that the daylight filter tints the photos as well as the chrome (#6). A true paired photo makes the filter unnecessary for those images, so #6 and this issue should be resolved together for any image that has both states.
- 2026-08-03: #13 is the hero-specific instance of this (both states of the floral-drop necklace are in the notes doc). This issue covers the general mechanism and any other paired sets across the site.
- 2026-08-03: Open question for Whitney — which images beyond the hero have both states shot? That determines whether this is a one-off component or something the eventual inventory/product schema needs a field for.
- 2026-08-03: Built as `frontend/src/components/UvPhoto.jsx`. Both photos render stacked and the blacklight one crossfades in on top, so there is no flash of unloaded image on the first toggle and both states are preloaded. Driven entirely by the ancestor `.sss-home[data-mode]` attribute — no hook, no JS state.
- 2026-08-03: Takes asset paths **without** the width suffix and builds the srcset itself, matching what `resize_asset.py` writes (`-900.jpg` / `-1600.jpg`).
- 2026-08-03: Neither state gets the daylight `saturate`/`brightness` filter the rest of the page applies to photos — filtering a photograph that is already correct is exactly the complaint in #6.
- 2026-08-03: [Closed] Mechanism shipped on branch home-page-layout and in use on the hero (#13). Applying it beyond the hero still needs Whitney's list of paired shots.
