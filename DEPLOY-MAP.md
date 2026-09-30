# StoryShaped deploy map

What runs, what it calls, and which settings it needs. Decisions: [ADR-0005](docs/adr/0005-free-first-hosting-stack.md)
(the stack), [ADR-0007](docs/adr/0007-central-console-at-edge-of-the-map.md) (the console). The code map is
[docs/AI_CONTEXT.md](docs/AI_CONTEXT.md).

## Architecture

```
 visitor / Whitney
        │  https://<site>              (preview: preview.di5pjjwi2k9o1.amplifyapp.com)
        ▼
 ┌────────────────────────────── Amplify app: StoryShaped frontend ──────────────────────────────┐
 │  /*            the built React site (frontend/, amplify.yml)                                   │
 │  /api/*   ─┐                                                                                   │
 │  /auth/*  ─┼── rewrite (200) ──► Lambda function URL: storyshaped-api-preview  (preview)       │
 │  /oauth/* ─┘                                  or storyshaped-api          (production, main)  │
 │  /_edit/auth/* ── rewrite ──► console API /auth/* (editor sign-in, ADR-0007)                   │
 └────────────────────────────────────────────────────────────────────────────────────────────────┘
        │ loader.js, editor bundle, public documents          │ backend (Express on Lambda)
        ▼                                                     ▼
 admin.theedgeofthemap.com (Edge of the Map console)    Neon: StoryShaped backend database
   Amplify: loader + editor bundles                        stock_items, stock_bom, stock_movements,
   Lambda eotm-console-api: documents, sign-in,            import_snapshots, library_views,
     /me (who may edit), uploads                           marketplace_tokens
   Neon control + StoryShaped site project:              (a Neon branch per environment)
     pages, theme, listings, Library entries …
   S3 shared photo bucket (sites/storyshaped/),          Etsy API, eBay API (OAuth, listings)
     via CloudFront at MEDIA_BASE_URL
```

- **Today each Amplify branch names its function.** `VITE_API_URL` is set per branch to that branch's
  function URL (decided 2026-09-30, to go live without depending on per-branch rewrites). Later the site can
  call its own address instead: Amplify forwards `/api/*`, `/auth/*` and `/oauth/*` and the build uses
  `VITE_API_URL=same` (`frontend/src/lib/api.js`).
- **Photos do not touch the backend.** The editor uploads straight to the shared bucket through the console
  API's presigned URLs (console README, "Photos"). The backend needs no S3 access.
- **Who may edit is the console's answer.** `/api/inventory/*` asks the console's `GET /me` with the editor
  token (`backend/server/utils/requireEditor.js`); the backend keeps no users.
- **Tokens outlive containers.** Etsy and eBay OAuth tokens are rows in `marketplace_tokens`
  (`backend/server/utils/tokens.js`); the token files remain only for local development without a database.

## Backend on Lambda

| | Preview | Production |
|---|---|---|
| Lambda function | `storyshaped-api-preview` | `storyshaped-api` |
| Deployed from | `preview` branch | `main` branch |
| Frontend in front of it | Amplify branch `preview` | Amplify branch `main` (production domain) |
| Database | Neon branch `preview` of the backend project | Neon main branch |

Runtime Node.js 22 or later, handler `lambda.handler`, 512 MB, 20 s timeout, function URL with auth NONE (the
Amplify rewrite is the way in; the admin routes check the editor token themselves).
`.github/workflows/backend-api.yml` tests and uploads `backend.zip` on every push that touches `backend/`.

### Settings, by name (on each function)

| Setting | Used by | Value |
|---|---|---|
| `DATABASE_PARAM` | `lambda.js` | Parameter Store name of that environment's Neon connection (SecureString), read at cold start ([ADR-0009](docs/adr/0009-backend-shares-the-console-site-database.md)): production `/eotm/sites/storyshaped/database` (the console's StoryShaped project), preview `/eotm/sites/storyshaped/database-preview` (its Neon branch) |
| `EOTM_SITE_API` | `utils/requireEditor.js` | Optional; default `https://admin.theedgeofthemap.com/api/sites/storyshaped` |
| `ETSY_CLIENT_ID`, `ETSY_CLIENT_SECRET` | `server.js` | Etsy app credentials |
| `ETSY_REDIRECT_URI` | `server.js` | `https://<site>/oauth/etsy-callback` |
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | `server.js` | eBay app credentials |
| `EBAY_REDIRECT_URI` | `server.js` | eBay's RuName for `https://<site>/oauth/ebay-callback` |
| `EBAY_ENVIRONMENT` | `server.js` | `sandbox` or `production` |

On Amplify (app `di5pjjwi2k9o1`), each branch overrides the app's `VITE_API_URL=none` with its function URL:
`preview` → `storyshaped-api-preview` (set 2026-09-30). `main` is added at the Go-Live gate
(docs/CURRENT_WORK.md).

### Created (2026-09-30, AWS CLI, us-east-1)

- Role `storyshaped-api-role`: basic Lambda logging, plus `ssm:GetParameter` on the two parameters above and
  `kms:Decrypt` through SSM only.
- Functions `storyshaped-api` and `storyshaped-api-preview`: Node.js 24, `lambda.handler`, 512 MB, 20 s,
  public function URLs. Verified: both answer `GET /`; production wrote a Library view to Neon; preview
  answers 503 on database routes until `database-preview` exists.
- Role `storyshaped-backend-deploy` (GitHub OIDC, this repo's `preview` and `main`), and the repo variable
  `AWS_DEPLOY_ROLE_ARN`.

Still to do: the Neon preview branch and its parameter (step 1 below), Etsy and eBay settings, the rewrites
(later), and monitoring.

### One-time setup (AWS, us-east-1, the account running the console)

1. **Neon.** In StoryShaped's Neon project (the one `/eotm/sites/storyshaped/database` names), create a branch
   `preview` and store its connection string, from your own PowerShell, never in a file:
   `aws ssm put-parameter --profile eotm --name /eotm/sites/storyshaped/database-preview --type SecureString --value '<connection string>'`
2. **Functions.** Lambda → Create function `storyshaped-api-preview`: Node.js 22.x, new execution role with basic
   logging only. Handler `lambda.handler`, memory 512 MB, timeout 20 s. Configuration → Function URL → Auth type
   NONE. Configuration → Environment variables → the settings above. Repeat for `storyshaped-api` when
   production follows.
3. **Deploy role.** The console's GitHub OIDC provider already exists. IAM → Roles → Create role → Web identity:
   that provider, audience `sts.amazonaws.com`, organization `cbaumgart004`, repository `storyShapedStudios`,
   branches `preview` and `main`. Name it `storyshaped-backend-deploy`. One inline policy:
   `lambda:UpdateFunctionCode`, `lambda:GetFunction`, `lambda:GetFunctionConfiguration` on both functions' ARNs.
4. **GitHub.** Repo → Settings → Secrets and variables → Actions → Variables → `AWS_DEPLOY_ROLE_ARN` = that role's
   ARN. The next push touching `backend/` deploys; or run the workflow by hand.
5. **Amplify rewrites** (StoryShaped app → Hosting → Rewrites and redirects), before the SPA catch-all, each
   status 200, each pointing at that branch's function URL: `/api/<*>` → `<function URL>/api/<*>`,
   `/auth/<*>` → `<function URL>/auth/<*>`, `/oauth/<*>` → `<function URL>/oauth/<*>`. Rewrites are per app, not
   per branch: production's function gets its own entries once the production domain is its own app or
   branch-specific rules are set. **Unverified:** whether Amplify's rewrites can differ per branch; if not, the
   preview and production frontends need separate Amplify apps.
6. **Build setting.** Amplify → Environment variables → `VITE_API_URL` = `same` for the branch, then redeploy.
7. **Load the stock.** `API_URL=https://<site> EOTM_TOKEN=<token from Manage> node backend/scripts/import-trunk.mjs trunk.json`
   (PowerShell: set `$env:API_URL` and `$env:EOTM_TOKEN` first).
8. **Reconnect Etsy and eBay.** Update each app's redirect URL to the site's `/oauth/...-callback`, then open
   `https://<site>/auth/etsy` and `/auth/ebay` once each; the tokens land in `marketplace_tokens`.

### Not verified

- The Lambda handler is tested with a function-URL-shaped event locally, not on AWS.
- `marketplace_tokens` has not run against Neon; the stock tables are tested against PGlite only.
- Railway's backend stays up until the Lambda answers on production; the Etsy/eBay tokens there are files and do
  not move, so step 8 is a fresh authorization, not a copy.
