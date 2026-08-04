---
id: 46
type: Issue
title: Unify the page on one colour family per mode
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
One colour family for the logo, the accent text and the body copy, taking the
"Connect With Us" colour as the reference.

Supersedes the "leave the logo alone" decision recorded in
[[45-blacklight-glowing-text-reads-as-two-different-gree]] — the logo is now
brought into the family after all.

## Discussion
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision. Both modes now run three steps of one hue, and the two modes are structurally identical:

  | token | blacklight | daylight | role |
  |---|---|---|---|
  | `--bone` | `#d9f2da` — h122 s49 l90 | `#eef2d9` — h70 s49 l90 | brightest: site title, wordmarks |
  | `--accent` | `#57ff5e` — h123 s100 l67 | `#d9ff6b` — h75 s100 l71 | glowing: headings, CTAs, "Connect With Us" |
  | `--muted` | `#73ca76` — h122 s45 l62 | `#b3ca73` — h76 s45 l62 | quiet: body copy, nav links, controls |

- 2026-08-03: `--muted` was the real outlier. At `#8fae8f` it was already the accent's hue but only **16% saturation** against the accent's 100%, which is why it read as grey-green rather than as a dimmer green. Daylight had the same problem at 24%. Both are now 45% — clearly dimmer than the accent, so [[24-blacklight-daylight-text-should-change-colour-with]]'s hierarchy survives, and contrast against `--void` went *up*, not down (~9.9:1 blacklight, ~10.4:1 daylight).
- 2026-08-03: `--bone` only needed fixing in blacklight, where it sat at h109/s18 and read as plain white. Daylight's was already h70/s49 and in family. Blacklight now mirrors it exactly.
- 2026-08-03: **The logo is filtered into the family**, reversing #45's decision. Its artwork is `rgb(0, 253, 0)` — pure green, no red or blue — so `saturate()` below 1 is what adds the red and blue the accent has (desaturating moves a colour toward its luminance grey), and `brightness()` then restores the green channel. Blacklight `saturate(0.55) brightness(1.17)` lands on `rgb(93, 255, 93)` against an accent of `rgb(87, 255, 94)`; daylight `hue-rotate(-40deg) saturate(0.56) brightness(1.3)` lands on `rgb(217, 255, 104)` against `rgb(217, 255, 107)`. The old daylight filter (`hue-rotate(-42deg) saturate(0.85) brightness(0.9)`) got the hue roughly right but left the logo darker and more saturated than the type.
- 2026-08-03: Filter values were not guessed. The image was rendered through `canvas.filter`, which implements the same spec as the CSS `filter` property, and the brightest neon pixel sampled — then a parameter sweep picked the candidate closest to the target accent. Worth reusing if the artwork or the accent ever changes; a CSS filter cannot be read back off a rendered element, so the canvas is the only way to measure one.
- 2026-08-03: Verified on fresh loads in both modes. Every hue lands within 1° of its mode's accent (blacklight h122–123, daylight h70–76), with the three roles separated by saturation and lightness rather than hue.
- 2026-08-03: The footer's square mark (`.sss-footer img.mark`) is a different asset and carries only a `drop-shadow` glow, no colour filter. Left alone — it was not part of the ask, but it is the one remaining image that has not been checked against the family.
- 2026-08-03: **Direction reversed for blacklight.** The user liked the logo's own coloration and wanted the text to come to it, not the reverse. The blacklight logo filter is removed — the lockup renders at its native `rgb(0, 251, 0)` — and `--uranium` is now that exact value, so accent text matches the artwork rather than approximating it. `--bone` and `--muted` moved to h120 to follow (`#d9f2d9`, `#72ca72`), and every hardcoded `rgba(87, 255, 94, …)` went with them: `--line`, `--glow-1`, `--glow-strong`, `--frame-glow`, the page gradient and `.btn-primary:hover`. A grep confirms no `57ff5e` or `87, 255, 94` survives in `src/`.
- 2026-08-03: **Daylight deliberately not reversed.** Matching daylight text to the logo would mean sampling the original daylight filter, which renders `#97b819` — h72 s76 **l41**, a dark olive. That is precisely the "still looks like a dull yellow" Whitney rejected in [[36-blacklight-daylight-brighter-yellow-in-daylight-mo]]. So daylight keeps the bright `#d9ff6b` accent with the logo filtered to it, and blacklight is anchored the other way round. Each mode is still internally one family; only the direction of the match differs. Raised with the user rather than silently picking either.
