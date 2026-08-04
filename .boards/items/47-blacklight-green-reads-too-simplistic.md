---
id: 47
type: Issue
title: Blacklight: the green reads too simplistic
state: New
tags: needs-info
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
User, on the blacklight palette shipped in
[[46-unify-the-page-on-one-colour-family-per-mode]]: "the green looks too
simplistic."

**Daylight is explicitly out of scope — "leave the yellow alone for now."** The
citron `#d9ff6b` from
[[36-blacklight-daylight-brighter-yellow-in-daylight-mo]] stays as it is. This
issue is blacklight only.

## Why it reads that way

Two causes, and they compound:

1. **The accent is a single-channel primary.** `--uranium` is now `#00fb00` —
   `rgb(0, 251, 0)`, with **zero** red and zero blue. That is the most
   elementary green a screen can produce, which is why it reads as default
   terminal green rather than as something glowing. The `#57ff5e` it replaced
   carried `r87 b94`; that small lift off the primary is what made it read as
   *lit* rather than as flat ink. The value came straight off the logo artwork,
   which is where the simplicity originates.
2. **The ramp is strictly monochromatic.** #46 put `--bone`, `--accent` and
   `--muted` on exactly one hue (h120), separated only by saturation and
   lightness. That was the literal ask — "one colour family" — but a single-hue
   ramp is flat by construction. Nothing on the page varies in hue any more, so
   there is no colour interest left anywhere.

Worth naming the tension: the mismatch complaint and the simplistic complaint
pull against each other. The page looked richer when the hues disagreed; it
looks unified now and therefore duller. The answer is almost certainly an
**analogous** ramp — a few degrees of hue spread across the steps — rather than
either a return to mismatched colours or a flat single hue.

## Options, none chosen

- **Lift the accent off the primary.** Add a little red and blue back so the
  green stops being `rgb(0, x, 0)`, while staying close enough to the logo that
  the [[46-unify-the-page-on-one-colour-family-per-mode]] match still reads.
  Smallest change; keeps the logo as the anchor.
- **Spread the ramp into analogous hues.** Let `--bone` sit slightly
  yellow-green and `--muted` slightly blue-green either side of the accent, so
  the page has a hue gradient rather than one flat hue. Keeps "one family" true
  in the normal design sense while restoring depth.
- **Give the glow spectral spread.** Real fluorescence is not one colour —
  make `--glow-strong`'s inner layer slightly yellow-green and its outer layers
  deeper green, so the halo shifts hue as it falls off. This is the reverse of
  the change made in
  [[45-blacklight-glowing-text-reads-as-two-different-gree]], which flattened
  the glow to a single colour to fix a *different* complaint — so it needs care,
  and the pale mint `--halo` should not simply come back.
- **Decouple the logo from the type again.** Accept a deliberate small gap
  between artwork and text, which is what existed before #46.

BLOCKED on which direction to take — "too simplistic" does not fix a target.
Worth putting the options in front of the user side by side rather than picking
one.
