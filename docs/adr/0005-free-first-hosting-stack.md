---
status: accepted
---

# Free-first hosting stack: Amplify, Neon (with Neon Auth), Lambda, S3

The goal is every hosting service at $0. Where free costs functionality or stability, those win and
cost is kept to the minimum. Accepted 2026-09-27 for StoryShaped; it supersedes only the Lightsail half of
[ADR-0001](0001-host-on-aws-amplify-and-lightsail.md), which already anticipates the move: tokens in
Neon free the backend to run on Lambda.

| Component | Tool | Cost |
|---|---|---|
| Front end | Amplify, built from GitHub | $0 within its free allowances |
| Database | Neon Free; Neon Launch once real stock is stored | $0, then usage-based |
| User creation and auth | Neon Auth (managed Better Auth) | $0 up to 60k MAU |
| Admin console | In-house React under `/admin`, content as JSON in Neon | $0 |
| Inventory and Etsy/eBay | Existing Express backend on Lambda, tokens moved into Neon | $0 within Lambda's always-free tier |
| Photos she uploads | S3 behind a CloudFront flat-rate Free distribution | $0 up to 5 GB (plan's S3 credit) |

## Why each choice

- **Amplify, not bare CloudFront.** Amplify runs CloudFront underneath and adds what bare CloudFront
  makes us build: GitHub push builds, a URL per branch, password-protected preview, one-click
  rollback, and a managed certificate and SPA rewrites. ADR-0001's `preview` flow depends on those.
  Bare CloudFront's flat-rate Free plan is the fallback if Amplify ever bills.
- **Neon stays.** It already holds the data, and its Free plan never bills: it suspends at the limit.
  Move to Launch when real stock data goes in, because Free's 6-hour restore window is too short for
  the record the Marketplaces sync from.
- **Neon Auth for logins.** Users live in our own database (`neon_auth` schema). The Data API accepts
  its JWTs and row-level security enforces them, so admin reads and writes need no backend.
- **In-house editor.** TinaCMS is rejected: the client found its editing UI unusable, and it cannot
  carry the site's branding. Content stored in Neon (draft and published) lets the preview site read
  drafts and production read only published.
- **Lambda, not Lightsail.** Lambda's always-free tier replaces a ~$5/mo instance, and there is no
  server to patch. The blocker ADR-0001 names, file-persisted tokens
  (`backend/server/utils/*TokenStorage.js`), is removed by storing them in a Neon table.
- **Uploaded photos in S3, not GitHub or Neon.** In GitHub, every upload is a commit and a rebuild:
  the photo appears minutes later, not at once, spends build minutes, grows the repo permanently, and
  the browser would need a token that can write to the repo. The site does not go down during those
  rebuilds (Amplify deploys atomically); the delay and the write token are the reasons. In S3 a photo
  is live the moment the upload finishes. Neon is too small (0.5 GB storage, 5 GB egress). Design
  images already in `frontend/public/assets/` stay in the repo.
- **Photos are served through a CloudFront flat-rate Free plan** so their storage draws on its 5 GB
  S3 credit. New accounts have no always-free S3: storage bills at about $0.023/GB-month otherwise.

## Findings (read from vendor pages 2026-09-27 unless marked)

**CloudFront flat-rate plans** ([docs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html)):
- Free plan: $0/mo, 1M requests, 100 GB transfer. It covers one distribution and one apex domain, and
  includes a WAF web ACL (mandatory), DDoS protection, Route 53 DNS, a TLS certificate, CloudFront
  Functions and 5 GB of S3 storage credit.
- Up to 3 Free plans per account. Pro is $15/mo: 10M requests, 50 TB, 50 GB of S3 credit.
- No overage charges on any plan. A one-time spike up to 3x the allowance is absorbed. Sustained
  excess over 2 to 3 months slows delivery; it is never billed.
- Staging distributions (continuous deployment) are unsupported on flat-rate plans. Lambda@Edge is
  allowed but billed per use.

**Amplify Hosting** ([pricing](https://aws.amazon.com/amplify/pricing/)):
- Free up to 1,000 build minutes, 5 GB stored and 15 GB served per month. Beyond that: $0.01 per build
  minute, $0.023/GB stored and $0.15/GB served.
- WAF costs $15/mo per app.
- The AWS page does not say whether those allowances are permanent. A third-party guide
  ([toolradar](https://toolradar.com/tools/aws-amplify/pricing)) says they are, separate from the
  new-account credits. Treated as **likely, not confirmed**; an AWS Budget alert at $1 catches it.
- Deploys are atomic: the live site switches only after the whole build finishes, so an update causes
  no downtime ([Amplify docs](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html)).

**AWS account** ([free tier](https://aws.amazon.com/free/)):
- New accounts get $100 in credits, plus up to $100 more for onboarding tasks.
- The Free plan lasts 6 months or until the credits are spent. After that the account must upgrade to
  the paid plan or close.

**Lambda:**
- 1M requests and 400,000 GB-seconds a month, always free (read from third-party pricing guides; the
  AWS page was not read).
- EventBridge Scheduler ([pricing](https://aws.amazon.com/eventbridge/pricing/)): 14M invocations a
  month free, then $1 per million. The page labels it Free Tier and does not say always-free. A sync
  every 15 minutes is about 3,000 invocations a month, so it costs under a cent even if billed.

**S3** (third-party guides, [CloudZero](https://www.cloudzero.com/blog/s3-pricing/)): accounts
created after 2025-07-15 get no standing 5 GB free allowance; S3 draws on the credits instead.

**Neon** ([pricing](https://neon.com/pricing)):
- Free: 100 CU-hours a month (about 400 hours at 0.25 CU), 0.5 GB storage, 10 branches, 5 GB egress,
  60k auth MAU and 6 hours of point-in-time restore. Compute scales to zero after 5 minutes idle and
  never bills; it suspends at the limit.
- Launch: $0.106 per CU-hour, $0.35/GB-month, 500 GB egress, 1M auth MAU and 7 days of restore.
  No commercial-use restriction is listed on either plan.
- Neon Auth ([docs](https://neon.com/docs/auth/overview)) issues a JWT whose `sub` is
  `neon_auth.user.id`. RLS policies read it through `auth.user_id()`, and every table the Data API
  exposes must have RLS enabled.
- The Better Auth admin plugin is supported; admin-plugin customization is "coming soon", and MFA is
  "coming soon" ([roadmap](https://neon.com/docs/auth/roadmap)). **Unverified:** whether the user's
  role reaches the JWT, which RLS would need. The fallback is an `admins` table checked inside the
  RLS policies, which needs nothing from the JWT but the user id.

## Image storage estimate (2026-09-27)

- Repo today: 107 images, 33 MB (excluding the `frontend/dist` build copy). Negligible.
- Etsy shop: 616 listings in the "All" section, 20.1k sales (read from the shop page). Etsy allows up
  to 20 photos per listing. Photos per listing were **not sampled**.
- eBay store: at least 480 active items (10+ pages of 48; exact count not shown, and eBay's bot check
  blocked the browser). It carries the same stock as Etsy (user, 2026-09-27), so each photo is stored
  once and Etsy's count sizes the estimate.
- Photos are scaled before upload to a 1600 px long edge plus a 400 px thumbnail, about 0.3 MB per
  photo together (an assumption, not measured).

| Photos per listing | 616 listings at 0.3 MB |
|---|---|
| 5 | about 0.9 GB |
| 10 | about 1.8 GB |
| 20 (Etsy's maximum) | about 3.7 GB |

This site fits inside the 5 GB credit at any plausible photo count. The remaining room is for growth
and variants, not for more sites.

## Multi-site growth

More client sites are leaving Vercel Hobby (LiveSpiritSeeds included; `LiveSpiritSeedsMk2/vercel.json`), so what scales per site and what is shared per account decides
whether "free" holds past this one.

| Allowance | Scope | Effect on more sites |
|---|---|---|
| Lambda, Amplify, EventBridge free allowances | Per AWS account; shared across an AWS Organization | Every site in one account draws on one allowance |
| CloudFront flat-rate Free plans | 3 per AWS account, one apex domain each | A 4th site in one account needs Pro ($15/mo) or pay-as-you-go |
| Neon Free | Per project, 100 projects per org | Scales well: each site gets its own project and allowances |
| Neon Auth | Per project | Each site has its own users |

- **Decided 2026-09-27: client sites run in Edge of the Map's own AWS account for now.** The
  owner sets up hosting, preview and logins; clients only sign in to the console. Asking a client to
  open and secure an AWS account is setup work they should not carry. Cost: every site draws on one
  account's free allowances, and the 3 flat-rate Free plans are used by StoryShaped, LiveSpiritSeeds
  and Edge of the Map, so a fourth site needs Pro ($15/mo) or a second account. Any bill lands on the
  owner's card.
- ~~**Proposed for later sites:** each client site runs in the client's own AWS account.~~ Rejected
  for now, above. It stays the exit route: a client who leaves can be moved into an account of their
  own. An AWS Organization does not multiply allowances; its members share one free tier
  ([re:Post](https://repost.aws/questions/QUqw-vLvrJQEeW_n8INbFpSA/free-tier-and-aws-organizations-is-free-tier-consolidated-or-only-for-first-aws-account-under-organization)).
- **The admin console becomes the product.** Build it once as a shared package with per-client theme
  tokens, deployed into each site, not a multi-tenant service. Each site stays isolated, and one
  client's outage or data never reaches another.
- Sites follow one of two models, and the shared console is designed in
  [ADR-0006](0006-shared-admin-console.md).

## Consequences

- The file-based token storage is replaced by a Neon table before the backend leaves Railway.
- Etsy and eBay OAuth secrets live in Lambda environment settings, resolved by name.
- Image upload goes through a Lambda that signs S3 upload URLs, so the browser uploads straight to
  S3 with no AWS keys. It is the only server step the editor needs.
- Admin accounts have no MFA until Neon ships it; use a strong password per admin.
- The editor resizes photos in the browser before upload, so no resize service is needed.
- Nothing here changes Go-Live scope: only the front end moves before 2026-10-01.
