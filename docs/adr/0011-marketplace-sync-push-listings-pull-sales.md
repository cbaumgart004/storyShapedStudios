---
status: accepted
---

# Marketplace sync: the site pushes Listings and counts, and pulls sales

ADR-0004 and ADR-0008 made the site own the Listing and the count but left the wiring open. Decided
2026-10-14 (user's instruction: an entry Whitney makes must reach both Etsy and eBay and move stock):

- **Push.** A published Listing goes to both Marketplaces through `backend/server/marketplace/sync.js`
  (`pushListing`), after `translate.js` turns it into each one's shape and refuses what that
  Marketplace cannot hold. A problem on one Marketplace skips that one only.
- **Counts.** Every stock movement pushes the new count of each SKU it touched to every Marketplace
  listing that SKU is linked on (`pushQuantities`, called from `POST /api/inventory/stock/:id/movements`).
  A Marketplace failure is reported and never undoes the count.
- **Sales are pulled, not received.** Paid Etsy receipts and eBay orders are polled
  (`POST /api/marketplace/sales/pull`). Each line becomes one `sale` movement, at most once, keyed by
  the Marketplace's line id in `marketplace_sales`, then its new count is pushed to the other
  Marketplace. Polling needs no public webhook endpoint or signature check, and a missed run is
  caught up by the next.
- **Off until Trunk is off.** Nothing is sent unless `MARKETPLACE_SYNC=on`; every call is a dry run
  answering what it would send. Trunk syncs counts today (unverified), and two writers would fight.
- **The Listing holds both shapes (same day).** Shared fields once; what only one Marketplace takes
  in an "Etsy only" or "eBay only" group of the `listing` type; a blank policy or profile id uses the
  shop's default setting. Reverses ADR-0008's "shipping profile stays on each Marketplace": it is an
  optional per-Listing id now. Condition and package size are shared, since both Marketplaces use
  them. "Sell on" names which of the site, Etsy and eBay offer it.
- **Checked before published.** `POST /api/marketplace/listings/:docId/check` runs the translation on
  the saved draft and sends nothing, so the owner sees what each Marketplace still needs while
  writing. eBay's required item specifics for the category are asked of eBay's taxonomy API.
- **Links live in the backend.** Which Marketplace listing holds a SKU is in `marketplace_links`, one
  row per Variation. The push does not write console documents, so a Listing's `etsyListingId` and
  `ebayItemId` stay the import's.

## Consequences

- The tokens need write scopes: Etsy `listings_w` and `transactions_r` (with PKCE, which Etsy
  requires and the old flow sent empty), eBay `sell.inventory`, `sell.account`, `sell.fulfillment`.
  Every existing token must be issued again through `/auth/etsy` and `/auth/ebay`.
- Shipping profile, return policy and eBay business policies, location and condition are not on the
  Listing; they are settings by name (`DEPLOY-MAP.md` once written). One value per shop until a Listing
  needs its own.
- eBay listings made on eBay's website must be migrated to the Inventory API before the site can
  update them (unverified which qualify). Until then the first push creates a new eBay listing.
- A schedule for the pull is not set up. Nothing in the request shapes has been run against Etsy or
  eBay: they are as documented, unverified until tokens exist.
- Two links in `marketplace_links` and the Listing's import fields can disagree. Resolve when the
  Etsy import (E6) is written: it should fill `marketplace_links`, not the document.
