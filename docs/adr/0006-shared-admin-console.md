---
status: accepted
---

# One schema-driven admin console, shared by every client site and branded per client

Every client site needs an owner-facing console. TinaCMS, used by LiveSpiritSeeds
(`LiveSpiritSeedsMk2/docs/adr/0002-tinacms-content-management.md`), is rejected: clients found its UI
unusable and it cannot carry their branding. Accepted 2026-09-27: build one console, once, and deploy
it into each site. Hosting it rests on [ADR-0005](0005-free-first-hosting-stack.md).

## The two site models

Future sites adopt one of these. Both have a front end and a back end.

| | Content and store (LiveSpiritSeeds) | Inventory and marketplace (StoryShaped) |
|---|---|---|
| Front end | Vite/React brochure SPA, pages rendered from content blocks | Vite/React SPA |
| Back end | Next.js store: Supabase (Postgres, Auth, Storage) and Stripe Checkout (`marketplace/`) | Express API: inventory, Etsy/eBay OAuth and sync |
| Database load | Light: pages, products, categories | Heavy: stock items, BOMs, adjustment log, listings and variations |
| Hosting today | Vercel, with TinaCloud for editor login (read from the repo) | Vercel and Railway |

## Decision

- **One console package, many deployments.** It lives in its own repo and each site installs it at
  `/admin`. It is not a multi-tenant service: one client's outage or data never reaches another.
- **Each site declares a schema.** Object types and their fields; the console generates list, edit
  and reorder screens from it. Field kinds: text, rich text, image, daylight/blacklight image pair,
  number, money, date, select, relation, and a block list for page sections.
  - StoryShaped: Page, Library Article, Stock Item, Listing, Variation, UV Photo Pair.
  - LiveSpiritSeeds: Page (blocks), Service, Schedule Entry, Product, Category.
- **Each site declares a brand.** Tokens for colours, fonts, logo, radius and density, applied to the
  console's own UI. LiveSpiritSeeds already keeps `marketplace/brand-settings.json` (`theme`,
  `uiStyle`), which becomes an input to this.
- **One storage path.** Content and records go in the site's Neon project as draft and published rows,
  with Neon Auth for logins and S3 for photos, which the browser resizes before upload. A second
  database vendor would double the console's storage code, so LiveSpiritSeeds' store moves from
  Supabase to Neon when it migrates.
- **Content moves out of git.** The same reason as photos in ADR-0005: every edit committed to git is a
  rebuild, and the owner waits minutes to see it. Rows in Neon are live when saved.

## Open

- **On-page editing.** LiveSpiritSeeds' owner "strongly prefers editing the live site directly"
  (its ADR-0002), and TinaCMS gave her that. The proposal for version 1 is a split view: the form on
  one side, the live page on the other, and clicking a block on the page opens its form. Whether that
  satisfies her is **unconfirmed**.

- **Store size is not a concern.** The store will hold about 30 items at most (user, 2026-09-27),
  far inside Neon Free's 0.5 GB and S3's 5 GB credit.
- **Waivers and intake forms stay in OfferingTree.** Her own bookings go through OfferingTree
  (`spiritseedswellnessmelissacarey.offeringtree.com`, every "Book Now" link in
  `content/pages/services.json`). OfferingTree can require a signed waiver before a client books, and
  records who signed on the client's profile
  ([OfferingTree](https://support.offeringtree.com/hc/en-us/articles/360061928732-Manage-Your-Waivers-Create-Edit-Remove-and-See-Who-s-Signed-Your-Waivers)).
  Keeping them there means the move stores no client documents. An intake form holds health
  information, which would bring security and retention duties with it (HIPAA itself likely does not
  apply without insurance billing, per [AccountableHQ](https://www.accountablehq.com/post/hipaa-for-massage-practices-explained-what-applies-what-doesn-t-and-why)).
  Classes she teaches at other studios collect waivers through those studios' platforms (Mindbody,
  Momence, Punchpass). **Unverified:** that she actually uses OfferingTree's waivers, and whether
  anything reaches her by email or paper instead.

## Moving the LiveSpiritSeeds store to Lambda and Neon (reviewed 2026-09-27)

Read from `LiveSpiritSeedsMk2/marketplace` and vendor docs. The store is not live yet: it is "not
linked from the brochure site's navbar" (its README), and the webhook's fulfillment is a `TODO`
(`app/api/stripe/webhook/route.ts`). Whether a deployment exists is **unverified**. If none does,
nobody sees the move, so do it before the store launches.

**Recommendation (not yet decided for LiveSpiritSeeds):** rebuild the store on the StoryShaped model: a Vite storefront, three Lambda
handlers (checkout, Stripe webhook, image-upload signing), and the shared console in place of
`marketplace/app/admin`. Amplify's docs confirm Next.js server rendering only up to version 15, and
the store runs `next` 16.2.10 (`marketplace/package.json`). Once the console replaces the admin, the
store's server work is those three routes. Both site models then share one back-end shape.

### Supabase coupling to remove

| Coupling | Where | Move |
|---|---|---|
| Owner login (`signInWithPassword`, cookie session via `@supabase/ssr`) | `lib/auth.ts`, `app/admin/layout.tsx`, `app/components/LoginForm.tsx` | Replaced by the console's Neon Auth login. One owner, so re-create the account; no password migration |
| Image bucket `product-images`, uploaded with the service-role key | `app/admin/actions.ts` (`uploadImage`) | Copy the objects to S3. **The old URLs are stored in three places:** `products.featured_image`, `products.images[]`, and inline in the markdown `description`. Rewrite all three, or images break |
| `storage.buckets` insert | `supabase/schema.sql` | Drop; Supabase-only |
| RLS for public reads, writes through the service-role key | `supabase/schema.sql`, `lib/supabase/admin.ts` | Storefront reads go through Lambda with a read-only role, or through the Data API with RLS |
| Full-text search (generated `tsvector`, GIN indexes), `pgcrypto` | `supabase/schema.sql` | Plain Postgres; carries over unchanged |
| Data | `products`, `categories` | `pg_dump` of the `public` schema only, restored into a Neon project |

**Reasons to leave Supabase regardless** ([pricing](https://supabase.com/pricing)): the Free plan
pauses a project after a week of inactivity, which is plausible for a small store. It allows 2 active
projects, which caps the multi-site plan, and it includes no backups. Neon also scales to zero, but it
wakes on the next query, and its Free plan keeps 6 hours of restore.

### Stripe

- **No cost change.** Stripe charges per transaction wherever the code runs. The keys stay the same
  and move into Lambda environment settings, resolved by name.
- **The webhook needs a new endpoint.** Each endpoint has its own signing secret, and up to 16 can be
  registered ([docs](https://docs.stripe.com/webhooks)). Register the Lambda URL alongside the old
  one, confirm deliveries on the new one, then remove the old one. Both receive every event while they
  overlap, so fulfillment must skip event IDs it has already processed. Stripe retries a failed
  live-mode delivery for up to three days.
- **Raw body on Lambda.** Signature verification needs the exact bytes Stripe sent. A Lambda function
  URL can deliver the body base64-encoded (`isBase64Encoded`). Decode it before `constructEvent`, or
  every event fails verification.
- **Return 2xx at once**, before any fulfillment work, so a cold start plus a Neon wake-up cannot
  cause a timeout.
- **Redirect URLs** come from `NEXT_PUBLIC_SITE_URL` (`app/api/checkout/route.ts`) and must point at
  the new domain. Checkout also sends `featured_image` to Stripe, so it must already be the S3 URL.

### Cost

| | Now | After |
|---|---|---|
| Hosting | Vercel Hobby, $0, but non-commercial | Amplify and Lambda, $0 |
| Database, auth, images | Supabase Free, $0 (next tier $25/mo flat) | Neon Free and S3, $0 (next tier usage-based) |
| Payments | Stripe per transaction | Unchanged |
