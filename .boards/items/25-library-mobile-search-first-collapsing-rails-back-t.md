---
id: 25
type: Issue
title: "Library on mobile: search first, collapsing rails, back-to-top"
state: Closed
tags: needs-triage
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
On a phone the Library sidebar stacks above the article, so opening an entry
buries it under the search box, Most viewed, and a 35-item Contents list.

Whitney's ask (2026-08-03):

- On open, the search bar is at the top, with suggested autofill that brings up
  the relevant article.
- Once the user selects an article, Most viewed and Contents collapse so the
  user can see the results.
- An overlay in the lower right corner that says "Back To Top".

## Discussion
- 2026-08-03: Autocomplete added to the existing search box. Title matches rank
  above body-only matches (a title hit is nearly always the entry meant), capped
  at 8. It is a real combobox — arrow keys move the cursor, Enter takes the
  highlighted row or the top match, Escape closes. The list is absolutely
  positioned so it overlays the rails rather than reflowing the page under the
  reader's thumb.
- 2026-08-03: Picking a suggestion clears the query. The box sits at the top of
  a phone screen and leaving text in it reads as "you are still looking at
  filtered results" once you are on an article. Reversible if she disagrees.
- 2026-08-03: Most viewed + Contents moved into a `.lib-side-browse` block with
  a "Browse all entries" disclosure. It starts collapsed whenever an article is
  open and re-collapses on every article change. On the index it is not
  rendered at all, because there the rails *are* the page.
- 2026-08-03: Collapse is CSS-driven inside the `max-width: 820px` query rather
  than a JS breakpoint — above 820px the rails always show and the toggle is
  `display: none`, so desktop is untouched and there is no resize listener.
- 2026-08-03: "Back to Top" is a fixed overlay bottom-right, rendered once
  `scrollY > 420` and shown only under 820px. Deliberately not on desktop: the
  sidebar there is sticky, so the search box never leaves the screen. Say the
  word to show it everywhere. It honours `prefers-reduced-motion` (jump instead
  of smooth scroll).
- 2026-08-03: Two adjacent mobile fixes while in here — the search input is
  16px under 820px so iOS stops zooming the page on focus, and the Contents
  list drops from two columns to one under 560px, where two columns left every
  title wrapping over five or six lines.
- 2026-08-03: Verified at 430x900 (Chrome could not be resized below the screen
  width here, so the page was driven inside a 430px iframe, which evaluates the
  media queries the same way). Checked: suggestions filter and overlay, picking
  one navigates and collapses the rails, the toggle re-expands them, the
  overlay appears on scroll. Desktop re-checked at 1911px — toggle and overlay
  both computed `display: none`, rails always shown. Not verified on a real
  phone or on iOS Safari.
- 2026-08-03: [Closed] Shipped on branch library-mobile-update.

## Review round 2 (2026-08-03)

Whitney, after reading the first pass:

- **Suggestion rows need borders on mobile** — there is no hover on a touch
  screen, so the rows had no division of their own. Added a `border-bottom` per
  row inside the 820px query only; desktop keeps the hover-only treatment,
  which she said she likes.
- **Back to Top: sooner, smaller, pinned** — threshold dropped from 420px of
  scroll to 24px so it appears as soon as the page moves, and the pill shrank
  (0.62rem type, tighter padding: ~107x27 instead of ~143x38). It was already
  `position: fixed`; added `env(safe-area-inset-*)` so it clears the iOS home
  indicator and Android gesture bar.
- **Equal left/right padding.** Root cause found, and it was not a padding
  value: there is **no global `box-sizing` reset in this project**, so every
  rule pairing `width: 100%` with horizontal padding (`.lib-shell`,
  `.gl-shell`, `.lib-side-toggle`, `.lib-suggestion`) rendered that padding
  outside the 100% and pushed its right edge past the viewport. `.lib-shell`
  measured 415px inside a 383px page — the right gutter was gone and content
  sat flush to the screen edge while the left kept its inset. Fixed with a
  `box-sizing: border-box` rule scoped to `.library-page` and `.glossary-page`
  rather than made global, because the rest of the site is hand-tuned against
  content-box. **Home and Meet the Artist were left on content-box** — check
  them for the same symptom before assuming they are fine.
- **Nav: pipes and balanced rows.** Each nav item now sits in its own
  `.sss-navitem` cell whose right border draws the pipe — a border rather than
  a `<span>` in the flow, so a wrapped row never ends on a dangling divider.
  The UV toggle moved out of `.sss-nav-utils` and became the last cell of the
  link grid. Under 760px the row is `repeat(3, minmax(0, 1fr))`, giving
  Home | Glossary | Images / Shop | Meet the Artist | toggle / icons. The six
  routed pages minus the current one always leave five links + the toggle, so
  the rows are always full; a page outside `NAV_LINKS` leaves a short third row.
  The toggle had to shrink to fit a third of a 360px bar (0.56rem type, 24px
  switch) — it measured 151px in a 117px cell before.
- **Desktop nav** keeps its arrangement: `margin-left: auto` on the toggle cell
  pushes it back to the right of the bar next to the icons, exactly where it
  was. The only desktop change is that pipes now sit between every item rather
  than only between the two link groups, so the `group` field on `NAV_LINKS`
  is gone.
- **Most viewed is its own collapsed element** (her call, asked directly).
  The single "Browse all entries" disclosure became two independent ones,
  "Most viewed" and "Contents (35)", each collapsed when an article opens and
  each opening without dragging the other along. The list's own eyebrow is
  hidden where a toggle is rendered (`.lib-side-toggle + .lib-side-browse`),
  since the toggle already names it — but kept on the index, where the toggles
  aren't rendered and the heading is the only label.
- Verified at a real 400px viewport this round (the window finally resized),
  not through the iframe: gutters equal at 16px both sides, no horizontal
  overflow (`scrollWidth` 383 = viewport), toggle fits its cell, suggestion
  borders present, overlay 107x27 pinned bottom-right at 60px of scroll, both
  rails collapsing independently. Glossary re-checked at 400px and 1400px.
- 2026-08-03: Rail states visually confirmed at 400px, all three entry paths:
  `/library` shows both rails expanded with their own headings and no toggles;
  a direct load of `/library/:slug` shows both collapsed; picking an entry from
  the index collapses both (`aria-expanded="false"`, both panels
  `display: none`). Desktop re-checked at 1400px on an article page — both
  toggles `display: none`, both panels `display: block` and fully populated
  (5 chips, 35 contents links), both headings visible, no Back to Top. The
  sidebar renders exactly as it did before the mobile work.
- 2026-08-03: Checked Home and Meet the Artist for the same box-model bug, since
  they were left on content-box. Meet the Artist was clean, but Home's
  `.hero-figure` (`width: min(100%, 760px)` + 14px padding + border) was running
  15px past the hero's content box on either side, and 30px wider than the neon
  logo directly above it. The `box-sizing` rule was therefore consolidated: one
  declaration on `.sss-home` and its subtree at the top of `Home.css`, and the
  page-scoped copies in `Library.css` / `Glossary.css` removed — all four pages
  wrap themselves in `.sss-home`, so it is the same element. The hero photo and
  logo now share an edge (both 313→1073 at 1400px; both 24→359 at 400px, in line
  with the tagline). Overflow scan run over every element on `/`,
  `/meet-the-artist`, `/glossary` and `/library/:slug` at 400px and 1400px:
  zero hits on all eight.
