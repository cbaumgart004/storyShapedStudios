---
id: 43
type: Issue
title: Home: section names become the headings
state: Closed
tags: ready-for-agent
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Whitney, in the notes doc: "Remove this and put 'Our story' in this font. Same
with 'A space for makers' underneath that".

The comment is anchored to a screenshot that does not survive text extraction,
but the reading is well supported by what was on the page: each `.prose-block`
carried a small-caps eyebrow with the section name **and** an `h2` holding a
phrase pulled out of the body copy ("Long before StoryShaped Studios existed",
"Over 200 unique bead designs"). "Remove this" is the pulled phrase; "put 'Our
story' in this font" is the section name promoted into the `h2` style.

Result: no eyebrow, and the `h2` is just the section name.

## Discussion
- 2026-08-03: [Closed] Shipped on branch 260803_Customer_Layout_Revision. Applied to all four body sections, not only the two she named — Our Jewelry and What We Believe are new and were built to the same pattern from the start, and leaving Our Story bare while its neighbours kept eyebrows would have looked like a bug.
- 2026-08-03: This is an inference from an unrecoverable screenshot anchor, unlike [[39-nav-hide-the-site-title-on-home-show-it-on-other-p]], which was left blocked. The difference is blast radius: this one is cosmetic, confined to Home, and trivially reversible, whereas #39 would silently change the header on every page. Worth a sentence to Whitney to confirm.
