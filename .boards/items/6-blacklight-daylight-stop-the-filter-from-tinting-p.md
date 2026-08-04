---
id: 6
type: Issue
title: Blacklight/daylight: stop the filter from tinting photos
state: New
tags: needs-triage
parent: 2
created: 2026-07-22
modified: 2026-07-22
---
Notes: "it's putting a filter on the whole site even the photos". Scope the daylight filter to site chrome/background so images render untinted.

## Discussion
- 2026-08-03: Still open, but half the original scope is gone. Of the two rules that tint photos in daylight, `.glow-story .story-img img` is now dead — [[27-home-remove-the-legacy-sections-below-the-new-copy]] deleted the markup that used it, though the rule itself is still sitting in `Home.css`. The other, `.piece-card img` (`saturate(0.72) brightness(0.94)`), is **still live**: Meet the Artist reuses `.piece-grid`/`.piece-card` for its gallery, so this issue did not become moot when Home lost its Featured band.
- 2026-08-03: `components/UvPhoto.jsx` already sidesteps the problem for genuinely paired shots — it renders two real photographs and applies no filter to either. That is the pattern to extend, not a filter to retune.

