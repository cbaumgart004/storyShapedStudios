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

- **The site calls its own address.** Amplify forwards `/api/*`, `/auth/*` and `/oauth/*` to the backend
  Lambda, so the frontend is built with `VITE_API_URL=same` (`frontend/src/lib/api.js`): no CORS, no backend
  URL baked into the build, and one build works in front of either function.
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
| `DATABASE_URL` | `utils/db.js` | That environment's Neon connection string. Kept on the function, never in the repo |
| `EOTM_SITE_API` | `utils/requireEditor.js` | Optional; default `https://admin.theedgeofthemap.com/api/sites/storyshaped` |
| `ETSY_CLIENT_ID`, `ETSY_CLIENT_SECRET` | `server.js` | Etsy app credentials |
| `ETSY_REDIRECT_URI` | `server.js` | `https://<site>/oauth/etsy-callback` |
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | `server.js` | eBay app credentials |
| `EBAY_REDIRECT_URI` | `server.js` | eBay's RuName for `https://<site>/oauth/ebay-callback` |
| `EBAY_ENVIRONMENT` | `server.js` | `sandbox` or `production` |

On Amplify, each branch's build needs `VITE_API_URL=same` (today: `none` on the preview).

### One-time setup (AWS, us-east-1, the account running the console)

1. **Neon.** In the backend's Neon project (the one Railway's `DATABASE_URL` names today), create a branch
   `preview`. Copy both connection strings. **Unverified:** which Neon project that is; read it from Railway's
   settings, not from here.
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
