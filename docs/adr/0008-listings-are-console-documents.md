---
status: accepted
---

# Listings are console documents, linked to Stock Items by SKU

ADR-0004 gave the site one Listing per thing for sale but did not say where it is stored. Stock
Items live in the site's own tables (ADR-0002) because counts move with every Sale and Build. A
Listing is authored text and photos that Whitney edits, with a draft and a publish, and its photos
carry the Light and Dark index the blacklight toggle reads. That is what the console already does
(`photos` with `indexes`). Decided 2026-09-29: a Listing is a `listing` document in StoryShaped's
console schema (`schema/sites/storyshaped.json` in the console repo). Each Variation names its
Stock Item by SKU; the count stays in the Stock Item tables.

The same day, tags and categories became site-owned (the user's instruction), reversing the
2026-09-27 field-ownership decision that left them on each Marketplace. A Listing carries its
Etsy shop section, Etsy category path, an optional eBay category id, and up to 13 tags.

## Consequences

- A Listing publishes only with at least one photo (at most 10), a section, an Etsy category, 1 to
  13 tags in Etsy's alphabet, and a priced SKU on every Variation (console `maxItems`, `pattern`).
- Photos under one index only (no Dark, or no Light) publish after a warning the owner confirms
  (console `warnMissingIndex`, changed the same day from a hard rule at the user's instruction).
  The site's blacklight toggle then filters the photo it has (`UvPhoto`, `is-single`).
- A Variation's SKU must match a Stock Item before a Marketplace push; nothing checks it at save,
  because the two live in different databases. The push must.
- Etsy's category is held as its path text; the push maps it to Etsy's taxonomy id. Unverified:
  the `whenMade` values against Etsy's current list (the `2020_2026` range moves each year).
- Etsy listings today carry 5 to 8 photos mixing daylight, blacklight, half-and-half and scale
  shots, not only one pair; half-and-half and scale shots are labelled Light.
