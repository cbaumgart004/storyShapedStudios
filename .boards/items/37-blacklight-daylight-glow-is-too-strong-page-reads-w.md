---
id: 37
type: Issue
title: Blacklight/daylight: glow is too strong, page reads washed out
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Whitney: "I think the glow effect is slightly too high and is making things look
a bit washed out", and when asked, "Yes maybe a little bit".

Applies to the `--glow` / `--glow-strong` text shadows, which
[[24-blacklight-daylight-text-should-change-colour-with]] put on the hero
tagline and the four `h2` rules. Reduce; do not remove — the glow is what sells
the blacklight conceit.

Pairs with [[36-blacklight-daylight-brighter-yellow-in-daylight-mo]]: a brighter
accent under an unchanged glow will read more washed out, not less, so tune the
two together.

## Discussion
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision. `--glow-strong` goes from `4/12/34/70px` to `3/9/22/44px` with the two outer layers' alpha cut from 0.65/0.35 to 0.45/0.2, and `--glow-1` from `6px @ 0.9` to `5px @ 0.7`. The wide low-alpha layers are what bloomed over large type like the hero tagline, so they lost the most; the tight inner layers that read as neon are nearly untouched.
- 2026-08-03: `.btn-primary:hover` hardcoded its own `0 0 55px` halo rather than using the token, so it would have stayed the one blown-out thing left on the page. Pulled in to match.
- 2026-08-03: Daylight glows left alone — they are already 1px, and the washed-out look she described is a blacklight-mode problem.
- 2026-08-03: Tuned together with [[36-blacklight-daylight-brighter-yellow-in-daylight-mo]] as that item warned. Both are matters of taste and easy to nudge further if she wants more or less.
