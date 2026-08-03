---
id: 15
type: Issue
title: Add "Our Story" section
state: Closed
tags: needs-triage
parent: 2
created: 2026-07-22
modified: 2026-08-03
---
Section heading is decided. Body copy has now landed in the Google Doc (2026-08-03) — no longer blocked.

## Discussion
- 2026-08-03: Copy is present in the live notes doc. Verbatim: "Long before StoryShaped Studios existed, artisans were crafting jewelry from uranium glass. Whitney discovered that forgotten history in 2018 through a Neiger Brothers necklace, and it was love at first sight. Thousands of hours of research, an international community of collectors, and a passion for preserving these remarkable artifacts eventually led her to teach herself jewelry making during the 2020 pandemic. What began as a personal fascination grew into the world's leading authority on uranium glass jewelry and beads. Today, StoryShaped Studios preserves the history of uranium glass jewelry while creating heirloom-quality pieces that carry that story forward. More on Whitney's personal journey here (hy"
- 2026-08-03: The last sentence is **truncated mid-word** in the doc — "More on Whitney's personal journey here (hy" looks like an unfinished hyperlink, presumably to /meet-the-artist. Confirm the intended link target and final wording before shipping; don't render the fragment.
- 2026-08-03: Was tagged needs-info/BLOCKED; retagged needs-triage now that the copy exists.
- 2026-08-03: [Closed] Shipped on branch home-page-layout as a `.prose-block` section (`#our-story`). The body is verbatim through "...carry that story forward."; the truncated fragment is not rendered. In its place is a "More on Whitney's personal journey" link to `/meet-the-artist` — an **assumed** target. Reopen if she meant an external page.

