---
status: accepted
---

# Components leave stock at Build, not at Sale

Phase 1 decremented a Product's Components when the Product's count went down (a Sale) and not
when it went up. The studio makes pieces both ahead of time and to order, and a piece on the shelf
already holds its beads, so Component counts ran high until every made piece sold, while the same
beads were also being sold loose (see ADR-0002). Decided 2026-09-27: a Build raises the made Stock
Item's count and lowers its Components' counts per the Bill of Materials; a Sale lowers only the
sold Stock Item. A made-to-order piece is a Build of one followed by its Sale.

## Consequences

- Supersedes the Track A decision "a quantity increase does not consume components" and the
  decrement-on-decrease logic in `PATCH /items/:id/quantity`.
- A Marketplace Sale never touches Components, which keeps the sale path simple.
