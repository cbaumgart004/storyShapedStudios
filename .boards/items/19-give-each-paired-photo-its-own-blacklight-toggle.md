---
id: 19
type: Issue
title: Give each paired photo its own blacklight toggle
state: Closed
tags: needs-triage
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Every image that swaps with the site-wide blacklight toggle should also carry its own switch, so a visitor can flip one piece between daylight and blacklight without changing the rest of the page.

Whitney's ask (2026-08-03): "Each image that gets toggled with the blacklight toggle should also have an individual toggle specific to the image itself."

## Discussion
- 2026-08-03: Built into `UvPhoto` (see [[18-swap-paired-daylight-blacklight-photos-with-the-uv]]). The component keeps a local override: `null` means "follow the site-wide toggle", `true`/`false` means this photo is pinned. State moved off the ancestor `[data-mode]` attribute onto the component's own `.is-lit` class.
- 2026-08-03: Flipping the site-wide toggle clears every override, so the page can't get stuck half-and-half with no way back. Verified both directions in the browser.
- 2026-08-03: The switch uses its own `.uv-mini-switch` class rather than the nav's `.uv-switch`, because the global `.sss-home[data-mode='blacklight'] .uv-switch::after` rule would otherwise drag the knob out of sync with the image it belongs to.
- 2026-08-03: It sits in the caption slot along the bottom of the photo and replaced the hero's `<figcaption>` — the caption named the current state, which would have desynced from a per-image flip.
- 2026-08-03: [Closed] Shipped on branch home-page-layout.
- 2026-08-03: Follow-up from Whitney — the switch moved but kept the page's colours, so a photo flipped to blacklight on a daylight page still showed the citron palette. The mode's colour tokens are now scoped to `.uv-photo` / `.uv-photo.is-lit` as well as `.sss-home[data-mode]`, so the caption switch is dressed in that photo's own state and matches what the nav toggle looks like in that mode. Required splitting the `.sss-home` rule in `Home.css` into a token block (shared with `.uv-photo`) and a page-shell block.
