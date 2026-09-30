---
status: accepted
---

# The backend uses the console's StoryShaped database; the Preview Site gets a Neon branch

The backend's stock, Import Snapshots, Library view counts and Marketplace tokens go in the same Neon
project that holds StoryShaped's console documents (Pages, Listings, Library entries), not a project of
their own. Decided 2026-09-30 while moving off Railway and Vercel: Railway's database held nothing worth
keeping, and one project lets a Listing's SKU be matched to its Stock Item in one query rather than across
two services. The Preview Site's backend uses a Neon branch of that project, so its stock stays apart from
Production's.

## Consequences

- The two sets of tables must not collide. Today they do not (the console's `documents`,
  `document_revisions`; the backend's `stock_*`, `import_snapshots`, `library_views`,
  `marketplace_tokens`). A collision is resolved when it looks imminent, by renaming or a schema.
- The preview branch also copies the console's documents; the preview backend reads only its own tables.
- The console's connection and the backend's share one project's compute.
