---
status: accepted
---

# A section can be Free; its layout lives in the section; phones stack it

The console could arrange whole sections on a 12-column grid (`layout` field, `Layout.jsx`) and
drag a few marked widths (`data-eotm-size`), but nothing smaller than a section could be moved.
Decided 2026-10-04, at the user's instruction: drag-and-drop editing with move, resize and
opacity handles, snap-to-grid or free-hand, modelled on Framer and Webflow's designer.

## Decision

- **The page stays a flow of sections** on the 12-column grid. Inside one, the owner chooses
  **Flow** (the site's own arrangement, as now) or **Free**: each marked part (heading, text,
  photo, buttons, added field) is placed on a canvas the section's size.
- **The arrangement is data inside the section**, `_layout: { mode, height, parts: { <part>:
  { x, y, w, h?, z?, opacity? } } }`, so it saves, publishes, undoes and travels in a saved
  template with the section. `x` and `w` are % of the section's width; `y`, `h` and `height` are
  also % of its width, so a free section keeps its proportions at every width (CSS container
  query units). A part with no `h` grows to fit its text.
- **Below 820px a Free section stacks**: its parts fall into one column ordered by `y`, then `x`.
  Per-phone positions are a later, optional addition.
- **Or it keeps its desktop arrangement** (`phone: "scale"`, added 2026-10-04 at the user's
  request): the section is drawn at its desktop width and zoomed down whole, text included
  (`ScaleBox`, CSS `zoom`), a small preview of the desktop page. The owner chooses per section.
  While arranging on a phone, the editor suggests turning it to landscape, which is closer to the
  desktop width.
- **A part's text size is its own** (`fs`, % of the site's): a corner drag or a two-finger pinch in
  Arrange resizes the box and its text together, as Canva does; a side handle changes only the
  width and lets the text reflow.
- **The page's code order stays the content order.** Free placement changes what is seen, never
  what a screen reader or a search engine reads.
- **Arranging is a separate mode** in the editor (Arrange). Outside it a click edits content, as
  in console 1.2.3; inside it a click selects and shows handles.

## Rejected

- **Absolute positions for the whole page (Wix).** A page placed freely at desktop width has no
  correct phone form; every such editor ships a second, hand-made mobile layout that drifts.
- **Positions in a separate layout document** (as `pageLayout` keeps section order). A saved
  template would lose its arrangement, and a section copied to another page would arrive
  unarranged. The section is the unit the owner reuses, so it carries its own.
- **Click to select, double-click to type (Canva).** It would undo 1.2.3's one-click editing, which
  the owner asked for; a mode keeps both.

## Consequences

- Every site component marks its parts once (`data-eotm-part`, through the site's frame helper);
  an unmarked part cannot be moved. StoryShaped's sections are marked; library entries, glossary
  terms and the footer are not yet.
- Between 820px and roughly 1100px a free section scales down whole; large text can crowd it.
- A scaled section on a phone has desktop-sized text shrunk to fit, so small print can become too
  small to read; that is the owner's trade, which is why stacking stays the default. The design
  width is approximate (`DESIGN_WIDTH`, 1200px times the section's share of 12 columns).
- Validation is generic (`schema/schema.js`, `checkFrame`): any section, row or document may carry
  `_layout`, held to ranges, with no schema field declaring it.
