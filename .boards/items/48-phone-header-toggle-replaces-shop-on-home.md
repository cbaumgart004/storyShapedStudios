---
id: 48
type: Issue
title: Phone header: blacklight toggle replaces Shop on Home, centred elsewhere
state: Closed
tags:
parent: 2
created: 2026-10-08
modified: 2026-10-08
---
Customer request: on the Home page the blacklight toggle replaces the Shop
item in the header to save space; on every other page it is centred, on
phones.

With the live menu (seven links) the toggle fell alone onto a third row,
flush left, on every page.

## Discussion
- 2026-10-08: At 760px and below, Home hides the header's `/shop` link
  (`.sss-navitem-home-shop`, SiteHeader.jsx) and the toggle takes its cell, so
  the bar is two rows; the hero keeps its own Shop button. Other pages: the
  toggle spans the last row and centres. Desktop unchanged. Shop is matched by
  its `/shop` URL, so renaming its URL in the console brings it back on Home.
- 2026-10-08: [Closed] Shipped to preview and production.
