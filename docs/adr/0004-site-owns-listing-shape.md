---
status: accepted
---

# The site owns the Listing shape; each Marketplace's shape is derived from it

Etsy and eBay structure variations differently, so today each listing is built twice by hand, once
per Marketplace, and the two drift. Decided 2026-09-27: the site holds one Listing whose Variations
each point at one Stock Item, and translates it into each Marketplace's variation rules when it
pushes. Before anything is imported or pushed, the models must be able to hold everything Etsy,
eBay and Trunk know: every import is kept as an unmodified Import Snapshot, and each Marketplace
Listing is linked per Variation, not per listing, because one Etsy or eBay listing holds several
SKUs.

## Consequences

- Models land before the Trunk backfill (E6) and before any Marketplace push (E3).
- A Listing that one Marketplace cannot represent (for example more variation properties than it
  allows) must be caught by the translation, not discovered by a failed push.
- Import Snapshots let Reconciliation re-read fields nobody mapped, at the cost of storage.
