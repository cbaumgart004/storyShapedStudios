---
status: accepted
---

# The admin console is served from admin.theedgeofthemap.com as pinned versions and runs inside each customer's own page

Accepted 2026-09-27. Supersedes the deployment half of [ADR-0006](0006-shared-admin-console.md):
the console is no longer a package each site installs and builds in. ADR-0006's schema, brand tokens,
field kinds, draft/published rows and S3 photos all stand. Hosting still rests on
[ADR-0005](0005-free-first-hosting-stack.md).

## Context

ADR-0006 built the console into each site, so every console fix meant a rebuild and redeploy of every
customer site. The platform plan in `edgeOfTheMap/docs/editing-without-tina.md` has since decided on
published self-serve tiers (its §9), which makes multi-tenancy a phase-0 requirement (its §2), and
its §4.1 requires the editor to be an overlay on the customer's real page, not a separate admin
panel. The console is Edge of the Map's product, so its code lives on that domain.

## Decision

- **Source and builds live with Edge of the Map.** The console is built and published to
  `admin.theedgeofthemap.com` as immutable versioned bundles (`/console/<version>/`). A published
  version is never rewritten.
- **It runs inside each customer's page.** A customer site carries only a small loader. The loader
  fetches the console bundle only when an owner opens the editor, so visitors never download it (the
  plan's §10 open question). The console then mounts on the live page, and a draft edit renders in
  place before it is published, which is the real-time preview.
- **Each customer is pinned to a version.** The `sites` row holds the pinned version and the bundle's
  integrity hash. Publishing a new version changes no customer; moving one is a change to that row,
  with no customer rebuild. A customer can be offered a newer version to preview before it becomes
  their pin.
- **Logins live in Edge of the Map's own Neon project** (Neon Auth), with a `site_members` table
  (`site_id`, `user_id`, `role`) deciding which sites a login may edit. The `sites` table holds each
  customer's slug, schema, brand tokens, pinned version, allowed origins and the *name* of its
  connection setting, never the value.
- **Each customer's records stay in that customer's own Neon project.** The console's API (Lambda,
  under `admin.theedgeofthemap.com`) checks the login and `site_members`, then resolves that site's
  connection by name. One customer's outage, load or leaked credential reaches no other customer.
- **Connection strings are AWS SSM Parameter Store SecureStrings**, one per site, not Lambda
  environment variables, because self-serve signup adds sites without a redeploy.
- **Supabase is out.** The plan's §3.1 assumes Supabase auth; Neon Auth replaces it, as ADR-0006
  already required for LiveSpiritSeeds.

## Rejected

- **Built into each site (ADR-0006 as written).** Every console change becomes N rebuilds, and
  customers drift onto whatever version they last built.
- **A separate admin app on Edge of the Map's domain, with the customer's page in an iframe.** The
  plan's §4.1 rejects it: it is the "separate admin panel that approximates the result" that
  `/keeper` criticises.
- **Every customer always on the latest bundle.** One bad release breaks every customer's editor
  at once, and nobody can preview a change before it reaches them.
- **One shared database with a `site_id` on every row** (the plan's §3.1). A missed filter leaks one
  customer's data to another, and StoryShaped's inventory load would share compute with brochure
  sites.

## Consequences

- **Edge of the Map's domain can run code on every customer's page.** A compromised bundle or
  `sites` row reaches every owner who opens the editor. Mitigations: immutable versions, the pinned
  integrity hash checked by the loader, and the loader loading nothing for visitors.
- **Customer sites must allow the script.** Any Content-Security-Policy on a customer site needs
  `admin.theedgeofthemap.com` in `script-src` and `connect-src`.
- **Login crosses origins.** The console runs on the customer's domain and calls an API on
  `admin.theedgeofthemap.com`, where browsers block third-party cookies. The API takes a bearer
  token rather than a cookie, and its CORS allowlist comes from each site's allowed origins.
  **Unverified:** that Neon Auth issues bearer tokens usable this way.
- **Unverified:** whether a Lambda can check a Neon Auth session from Edge of the Map's project and
  then connect to a customer's project with its own role, so no login exists in customer projects.
- **Signup must create a Neon project through Neon's API** and write its connection string to SSM.
  **Unverified:** how many projects Neon's Free plan allows per account.
- **The console's CSS shares a document with the customer's.** The plan's §4.1 rule applies: a
  sealed prefix, and the console never reads a site token except the brand tokens it is given.
- **Photos:** the upload-signing Lambda is central, but each customer keeps its own S3 bucket. The
  3 free CloudFront flat-rate plans per AWS account (ADR-0005) are used by StoryShaped,
  LiveSpiritSeeds and Edge of the Map.
