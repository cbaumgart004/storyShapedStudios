# StoryShaped Studios

The public site for StoryShaped Studios' uranium glass work, and the inventory system that owns
the studio's stock and publishes it to the marketplaces.

## Language

### Launch

**Go-Live**:
The first public launch of the Brochure Site on the production domain. It does not include
selling on the site or Marketplace wiring.
_Avoid_: launch, release

**Brochure Site**:
The public pages that inform rather than sell: Home, Library, Meet the Artist, Glossary.
_Avoid_: storefront, splash page

**Production Site**:
The public site on the StoryShaped Studios domain, deployed from `main`.
_Avoid_: live site, prod

**Preview Site**:
The password-protected copy of the site the client reviews before a change reaches Production,
with its own stock data kept apart from Production's.
_Avoid_: staging, test site, dev site

### Inventory and selling

**Source of Truth**:
This site's inventory. Stock and listing data are authored here and pushed outward; a Marketplace
never overrides it.
_Avoid_: master, system of record

**Stock Item**:
Anything the studio keeps a count of, with its own SKU: a bead, a charm, a bracelet. One Stock
Item can be a Product, a Component, or both.
_Avoid_: record, inventory item, part

**Product**:
A Stock Item in its role of being listed for sale, e.g. a bracelet, or a bead sold loose.
_Avoid_: piece

**Listing**:
The site's single description of something for sale (title, description, photos), offering one
or more Variations. Authored here and pushed to every Marketplace in the shape it requires.
_Avoid_: post, ad

**Variation**:
One option a buyer can pick within a Listing, standing for exactly one Product. Carries the price,
which a Marketplace Price Override can replace on one Marketplace.
_Avoid_: option, variant

**Marketplace Price Override**:
A price for one Variation on one Marketplace, replacing the Variation's price there only, e.g. to
cover eBay's higher fees.
_Avoid_: eBay price, markup

**Marketplace Listing**:
A Listing as it exists on one Marketplace, identified by that Marketplace's own ids.
_Avoid_: Etsy listing, eBay item (in prose)

**Import Snapshot**:
An unmodified copy of what Etsy, eBay or Trunk returned at one import, kept so later
Reconciliation can read fields that were never mapped.
_Avoid_: dump, cache

**Component**:
A Stock Item in its role of being used in another Stock Item's Bill of Materials, e.g. a bead
inside a bracelet. Counted in its own unit, which may be fractional.
_Avoid_: material, supply

**Bill of Materials**:
The Stock Items and quantities that make one unit of another Stock Item, e.g. 3 of one bead and
8 of another for one bracelet.
_Avoid_: recipe, BOM (in prose), build list

**Build**:
Making units of a Stock Item from its Bill of Materials. The made item's count goes up and its
Components' counts go down at that moment, whether the piece is made ahead or to order.
_Avoid_: assembly, production run

**Sale**:
A Product leaving stock because it sold. It lowers only that Product's count; its Components
already left at Build.
_Avoid_: order, sell-through

**Physical Count**:
A hand count of stock on the shelf, entered whenever needed rather than on a schedule.
_Avoid_: stocktake, audit

**Previous**:
The quantity from the most recent Physical Count; the baseline everything since is measured from.
_Avoid_: opening balance, last quantity

**Calculated**:
Previous plus every recorded change since it (sales, component consumption, restocks). Derived,
never typed in.
_Avoid_: expected, system quantity, on hand

**Actual**:
The quantity a new Physical Count finds. Entering it overrides Calculated and becomes the new
Previous.
_Avoid_: counted, real

**Count Correction**:
The difference between Actual and Calculated at a Physical Count, recorded so shrinkage and
bookkeeping drift stay visible.
_Avoid_: adjustment, write-off

**Reconciliation**:
Comparing Actual against Calculated at each Physical Count; the share that match measures how
trustworthy the recorded changes are.
_Avoid_: sync, true-up

**Marketplace**:
An external sales channel (Etsy, eBay) that receives listings from the Source of Truth and reports
sales back to it.
_Avoid_: channel, platform, store
