---
id: 50
type: Issue
title: Editor: validate every element is in the schema and can be selected, edited and managed
state: New
tags: needs-triage
parent: 
created: 2026-11-09
modified: 2026-11-09
---
The rule in `CLAUDE.md` (Editor rules): every element and setting on Spirit Seeds, StoryShapedStudios and Edge of the Map is reachable in the editor, no exceptions. It has never been checked site by site.

To do, for each site at desktop, tablet and phone width:
- List everything a visitor can see, including anything drawn only by CSS (pseudo-elements, variables, hard-coded spacing).
- Confirm each has a field or class in `console/schema/sites/<site>.json` (Edge of the Map).
- Confirm each can be selected on the page, edited, and saved, and that the save shows on the page.
- Fix what fails in the same pass, or remove the element.

The check is built: `console/scripts/reach-audit.mjs` (Edge of the Map). The known gaps are `console/scripts/reach-baseline/<site>.json`: work that list down to zero. It reads what is marked on the page; it does not yet click each element and save a change, so "can be selected, edited and saved" is still a manual check per element.

Known gaps (2026-11-09, from reading the code):
- Spirit Seeds: the gap between section backgrounds is hard-coded in `src/styles/layout.css`, with no field.
- Spirit Seeds: backgrounds are one class (`sectionBackground`) for all sections, not per section.
- StoryShaped: `storyshaped.json` has none of the banner and background additions made for Spirit Seeds in console 1.36.0. Whether StoryShaped needs each one is **unverified**.

Not reviewed on screen: console 1.36.0's Background button in Arrange's Layers, the banner Layout select, and the picture size and padding fields. Tests and builds passed.
