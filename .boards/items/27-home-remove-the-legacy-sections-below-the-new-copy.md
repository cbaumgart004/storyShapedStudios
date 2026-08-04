---
id: 27
type: Issue
title: Home: remove the legacy sections below the new copy
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Whitney, in the notes doc: "please remove everything underneath this, the Pieces
with a Past, Why it Glows and Meet the artist, and all of the photos."

Cuts the three pre-existing bands below the new copy blocks, plus their imagery.
This is the first time the notes have spoken to these sections — `CURRENT_WORK.md`
previously recorded that they were left alone because the notes neither mentioned
nor removed them. That note is now superseded.

Do this before the remaining visual tweaks: [[6-blacklight-daylight-stop-the-filter-from-tinting-p]]
targets `.glow-story .story-img img`, which lives in the markup this issue
deletes. Its other target, `.piece-card img`, does **not** go away — Meet the
Artist reuses `.piece-grid`/`.piece-card` for its gallery, so #6 still has real
work to do after this ships.

## Discussion
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision. Removed the Featured ("Pieces with a past"), Glow story ("Why it glows") and Meet the Artist sections from `pages/Home.jsx`, along with the now-unused `featured` array, the `import.meta.glob` of `assets/coming-soon/PSX_*.jpg`, and the `lit`/`toggle` values from `useUvMode()` — the flip-the-blacklight button in the glow story was their only consumer on this page. The site-wide nav toggle is untouched.
- 2026-08-03: CSS left in place deliberately. `.glow-story`, `.story-img`, `.story-copy`, `.story-link` and `.artist-feature` are now dead rules in `Home.css`, but `.piece-grid`/`.piece-card` are still live via Meet the Artist, so this was not a clean sweep to make. Deleting the dead rules is separate cleanup, not part of a copy change.
- 2026-08-03: The image files under `assets/coming-soon/` are left on disk — [[42-home-featured-collection-and-newly-added-bands]] may want them back.
