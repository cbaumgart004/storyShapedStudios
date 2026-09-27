---
status: accepted
---

# One Stock Item table; Product and Component are roles, not record types

Phase 1 split inventory into `inventory_items` (sellable) and `inventory_components` (supplies),
each with its own SKU and count. The studio sells Components on their own (loose beads) as well as
inside Products, so one bead would exist as two records with two counts, and every sale path would
leave one of them wrong. Decided 2026-09-27, before the Trunk backfill makes the change expensive:
merge into a single Stock Item table with its own SKU, a decimal count and a sellable flag, and a
Bill of Materials that links Stock Items to other Stock Items. A Product is a sellable Stock Item;
a Component is any Stock Item used in another's Bill of Materials; one Stock Item can be both.

## Consequences

- Replaces the Phase 1 tables and every `/api/inventory/*` route; the admin page follows.
- Nested assemblies (a charm made of beads, used in several bracelets) need no extra structure,
  so the Bill of Materials must reject cycles.
- Only sellable Stock Items are pushed to a Marketplace.
