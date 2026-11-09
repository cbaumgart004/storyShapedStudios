---
id: 51
type: Issue
title: Editor: save scope on layouts (this element, a class, a new reusable template)
state: New
tags: needs-triage
parent: 
created: 2026-11-09
modified: 2026-11-09
---
`CLAUDE.md` (Editor rules) says every save on a layout element offers this element only, all elements with this class, or save as a new custom template. That three-way choice was never built.

Consequence (read from the code, 2026-11-09): an arrangement made in Arrange on a banner event slide saves for that one Event (`_layout_banner`) and cannot be reused. The owner can pick between the two built-in banner layouts on an events slide, but cannot save her own as a third.

To do:
- Build the three-way choice in Arrange's save.
- A saved template appears as a choice wherever that kind of element is laid out, starting with the banner's Layout select.
