---
id: 22
type: Issue
title: Wire up the nav utility icons (search, sign in, wishlist, cart)
state: New
tags: needs-info
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
The four utility icons are in the nav bar but inert — Whitney asked for them to be visible now, with the functions marked as to-dos. Each is a real feature that does not exist yet.

To-dos behind the icons:

- **Search** — no site search exists. The Library has its own local filter (`pages/Library.jsx`); a global search would need to decide what it covers (library entries, glossary terms, products) and whether it runs client-side or against the API.
- **Sign in** — no accounts, no auth, no session anywhere in the app. This is the largest of the four; note that `/admin/inventory` also still has no auth (see Track A).
- **Wishlist** — needs a place to persist per-visitor picks. `localStorage` would work before accounts exist; after accounts it wants a table.
- **Cart** — no cart, checkout, or payment path. Today "buy" means the Etsy/eBay listings. Decide whether the site sells directly at all before building this.

## Discussion
- 2026-08-03: Icons shipped as placeholders on branch home-page-layout — `components/navIcons.jsx` (inline SVG, `currentColor` so they follow the UV palette) rendered by `SiteHeader` as `aria-disabled` buttons labelled "… — coming soon". Buttons rather than links so nothing 404s.
- 2026-08-03: Whitney named three ("sign in, shop, wishlist"); the fourth, search, comes from her notes doc, which lists "a search icon, login 'person' icon, a heart for wish list, and a cart icon". Shipped all four on that basis — drop search if she meant only three.
- 2026-08-03: Each of these probably deserves splitting into its own issue once one is actually scheduled; they share nothing but the icon row.
- 2026-08-03: The icons ship **hidden on `main`** — `UTILITY_ICONS_VISIBLE` in `SiteHeader.jsx` is `true` on the preview branch and gets set to `false` in the merge commit (see [[9-add-right-side-utility-icons-search-login-wishlist]]). So this issue now also owns un-hiding them: each feature landing should flip its icon back on rather than the whole row at once.
