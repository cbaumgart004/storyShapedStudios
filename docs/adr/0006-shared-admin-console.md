---
status: accepted, deployment superseded by ADR-0007
---

# One schema-driven admin console, shared by every client site and branded per client

Every client site needs an owner-facing console. TinaCMS, tried on an earlier client site, is
rejected: clients found its UI unusable and it cannot carry their branding. Accepted 2026-09-27: build one console, once, and deploy
it into each site. Hosting it rests on [ADR-0005](0005-free-first-hosting-stack.md).

## The two site models

Future sites adopt one of these. Both have a front end and a back end.

| | Content and store | Inventory and marketplace (StoryShaped) |
|---|---|---|
| Front end | Vite/React brochure SPA, pages rendered from content blocks | Vite/React SPA |
| Back end | A small store and checkout | Express API: inventory, Etsy/eBay OAuth and sync |
| Database load | Light: pages, products, categories | Heavy: stock items, BOMs, adjustment log, listings and variations |

## Decision

- ~~**One console package, many deployments.** It lives in its own repo and each site installs it at
  `/admin`. It is not a multi-tenant service: one client's outage or data never reaches another.~~
  **Superseded by [ADR-0007](0007-central-console-at-edge-of-the-map.md):** the console is
  served from `admin.theedgeofthemap.com` as pinned versions and runs inside each site's own page;
  isolation is kept by giving each client its own Neon project.
- **Each site declares a schema.** Object types and their fields; the console generates list, edit
  and reorder screens from it. Field kinds: text, rich text, image, daylight/blacklight image pair,
  number, money, date, select, relation, and a block list for page sections.
  - StoryShaped: Page, Library Article, Stock Item, Listing, Variation, UV Photo Pair.
- **Each site declares a brand.** Tokens for colours, fonts, logo, radius and density, applied to the
  console's own UI.
- **One storage path.** Content and records go in the site's Neon project as draft and published rows,
  with Neon Auth for logins and S3 for photos, which the browser resizes before upload. A second
  database vendor would double the console's storage code, so a site on another vendor moves to Neon
  when it migrates.
- **Content moves out of git.** The same reason as photos in ADR-0005: every edit committed to git is a
  rebuild, and the owner waits minutes to see it. Rows in Neon are live when saved.
