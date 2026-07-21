# AI Project Context

## Summary

This website hosts information about Uranium Glass, and serves as a locally hosted
marketplace with a complete inventory system that updates components used in crafting
sales items, and serves as the source of truth via API for Etsy and eBay.

Current stage: early but live. The home page (`/`) is the live StoryShaped Studios site
with a site-wide daylight/blacklight UV toggle, and a searchable Library knowledge base
(`/library`) is live. Shop/orders UI is partially scaffolded. Content routes are mounted
at `/api`. Postgres (via Neon) now backs Library view counts; the broader inventory
schema is still to come.

## Existing Documentation

Prefer these as the source of truth; do not duplicate them here.

- `README.md` — one-paragraph overview + getting started.
- `docs/CURRENT_WORK.md` — active objective, current state, next steps.
- `structure.txt` — annotated source tree.
- `CLAUDE.md` — working rules and common commands.

## Layout & Entry Points

- Root `package.json`: `npm run dev` runs frontend + backend together via `concurrently`.
- Frontend (`frontend/`): Vite dev server. Entry `src/main.jsx` -> `src/App.jsx`.
  React 18, react-router-dom 7, `@` alias -> `src`.
- Backend (`backend/`): Express, ESM. Entry `server/server.js`. Listens on port 3000
  (`process.env.PORT || 3000`).

## Major Components

| Component | Responsibility | Location |
|---|---|---|
| Web UI | React storefront. Routed today: `/`, `/meet-the-artist`, `/shop`, `/library`, `/library/:slug`, `/glossary`. | `frontend/src/` (`App.jsx`, `pages/`, `components/`) |
| Home page | Live landing page + daylight/blacklight UV toggle | `frontend/src/pages/Home.jsx`, `styles/Home.css` |
| Meet the Artist | Artist bio page (scaffold): 3 images + text body, shared nav/footer | `frontend/src/pages/MeetTheArtist.jsx`, `styles/MeetTheArtist.css` |
| Library | Searchable knowledge base from Markdown. Index + per-article pages: `/library` lists all entries, `/library/:slug` shows one article on its own shareable URL; shared shell (search + Most-viewed + Contents rail) with copy-link + view counts | `frontend/src/pages/Library.jsx`, `public/library.md`, `public/library-media/`, `scripts/docx_to_library_md.py` |
| Shared UI | Site header/footer + UV-mode context reused across pages | `frontend/src/components/Site{Header,Footer}.jsx`, `context/UvMode.jsx`, `lib/api.js` |
| OAuth / marketplace API | Etsy + eBay OAuth flows and token validation | `backend/server/server.js` |
| Content routes | `/api/*` content endpoints, aggregated by `index.js` and mounted at `/api` | `backend/server/routes/` (`index.js` + siblings) |
| Database | Postgres (Neon) — Library view counts now; inventory later | `backend/server/utils/db.js`, `routes/libraryViews.js` |
| Token storage | File-based persistence of Etsy/eBay access tokens | `backend/server/utils/*TokenStorage.js` |

## API Endpoints (backend, port 3000)

Defined directly in `server.js`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Server status + route index |
| GET | `/auth/etsy` | Start Etsy OAuth |
| GET | `/oauth/etsy-callback` | Etsy OAuth callback (token exchange) |
| GET | `/api/etsy/validate-token` | Validate stored Etsy token |
| GET | `/auth/ebay` | Start eBay OAuth |
| GET | `/oauth/ebay-callback` | eBay OAuth callback (token exchange) |
| GET | `/api/ebay/validate-token` | Validate stored eBay token |
| GET | `/api/ebay/dummy-listing` | eBay item search w/ fallback (`ebayDummyListing.js`) |

Content routes, aggregated by `routes/index.js` and mounted at `/api`:

| Method | Path | Source |
|---|---|---|
| GET | `/api/listings` | `routes/listings.js` |
| GET | `/api/sales` | `routes/sales.js` |
| GET | `/api/about` | `routes/about.js` |
| GET | `/api/faqs` | `routes/faqs.js` |
| GET | `/api/mock/etsy/mock-listing` | `routes/mockListing.js` |
| GET | `/api/library/views` | `routes/libraryViews.js` — all view counts as `{ slug: count }` |
| POST | `/api/library/views/:slug` | `routes/libraryViews.js` — increment one entry, returns `{ slug, count }` |

Each content router uses `/` internally; the path segment (`/listings`, `/sales`, …)
comes from the mount in `index.js`. Any other path returns `404 { error: 'Route not found.' }`.

`/api/library/*` needs `DATABASE_URL` (Neon). Without it the backend degrades gracefully:
`GET` returns `{}`, `POST` returns `503`. The frontend falls back to `localStorage`.

## External Systems

| System | Purpose |
|---|---|
| Etsy API | OAuth (`/auth/etsy`, `/oauth/etsy-callback`), token validate; product/listing source of truth |
| eBay API | OAuth (`/auth/ebay`, `/oauth/ebay-callback`), token validate; sandbox/production via `EBAY_ENVIRONMENT`; dummy listing endpoint |
| Neon (Postgres) | Serverless Postgres via `DATABASE_URL`; backs Library view counts, planned inventory DB |

## Important Constraints

- Don't break existing APIs.
- Do not commit secrets. Etsy/eBay credentials live in `backend/.env` (gitignored).
- Do not commit generated Repomix context files.

## Sources of Truth

- Business behavior: `backend/server/server.js` + `backend/server/routes/`.
- Marketplace data: Etsy and eBay APIs (this app brokers OAuth + acts as intended source of truth).
- Database schema: Postgres (Neon), currently just `library_views (slug, count)`, auto-created
  by `routes/libraryViews.js`; no migration tooling yet.
- API contracts: `backend/server/routes/` (per-router files).
- Deployment: frontend on Vercel (needs `VITE_API_URL` = backend origin, and a SPA rewrite
  via `frontend/vercel.json`); backend on Railway (needs `DATABASE_URL`). Both auto-deploy
  from `main` — after merging, confirm Railway picked up the new commit.

## Known Traps

- Each content router in `routes/` uses `/` internally and gets its path segment from the
  mount in `index.js`. When adding a new content route, add it to `index.js` (don't repeat
  the segment inside the router file, or you'll get a doubled path like `/api/x/x`).
- `server.js` opens auth/validate URLs in a browser at boot, but only in local dev — it
  skips this when `NODE_ENV=production` or `RAILWAY_ENVIRONMENT` is set.
- Scaffolded `pages/Orders/*` exists but is not referenced by the router.
- Frontend↔backend base URL comes from `VITE_API_URL` (`lib/api.js`), baked in at Vite
  build time — it must include the scheme (`https://…`) and needs a redeploy to change.
