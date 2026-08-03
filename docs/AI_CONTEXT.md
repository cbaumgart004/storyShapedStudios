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
- Whitney's **"Website notes" Google Doc** — the design source of truth for the
  splash/home redesign. Live and edited in place, so re-read it rather than
  trusting a stale summary:
  <https://docs.google.com/document/d/16BztwhEvCqGlkO16mVmG_yOBt_bPJ4P5_ei1MH6_dDc/edit?tab=t.0>
  (Google login required — `WebFetch` returns 401; read it in the browser.)

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
| Home page | Live landing page + daylight/blacklight UV toggle. Hero is the big neon logo, tagline, two CTAs, a paired daylight/blacklight photo and Whitney's credit; then the Our Story / A Space for Makers copy blocks | `frontend/src/pages/Home.jsx`, `components/UvPhoto.jsx`, `styles/Home.css` |
| Meet the Artist | Artist bio page (scaffold): 3 images + text body, shared nav/footer | `frontend/src/pages/MeetTheArtist.jsx`, `styles/MeetTheArtist.css` |
| Library | Searchable knowledge base from Markdown. Index + per-article pages: `/library` lists all entries, `/library/:slug` shows one article on its own shareable URL; shared shell (search + Most-viewed + Contents rail) with copy-link + view counts | `frontend/src/pages/Library.jsx`, `public/library.md`, `public/library-media/`, `scripts/docx_to_library_md.py` |
| Shared UI | Site header/footer + UV-mode context reused across pages. The nav is a text wordmark on its own line, then one row of links (current page's own link filtered out) with the UV toggle and four inert utility icons at the right. The social band under it is Facebook + Instagram only (`connectSocials`), while the footer keeps the full `socials` list | `frontend/src/components/Site{Header,Footer}.jsx`, `components/navIcons.jsx`, `components/socials.js`, `context/UvMode.jsx`, `lib/api.js` |
| OAuth / marketplace API | Etsy + eBay OAuth flows and token validation | `backend/server/server.js` |
| Content routes | `/api/*` content endpoints, aggregated by `index.js` and mounted at `/api` | `backend/server/routes/` (`index.js` + siblings) |
| Inventory API | Items, components/supplies, bill-of-materials (BOM), and quantity-adjustment (with component decrement + low-stock detection) — Phase 1 of the self-built inventory system | `backend/server/routes/inventory.js`, `utils/notifyLowStock.js` |
| Admin UI (minimal) | Internal, unauthenticated page to manage items/components/BOM and adjust quantities | `frontend/src/pages/Admin/Inventory.jsx`, routed at `/admin/inventory` |
| Database | Postgres (Neon) — Library view counts, inventory (items/components/BOM/adjustments) | `backend/server/utils/db.js`, `routes/libraryViews.js`, `routes/inventory.js` |
| Token storage | File-based persistence of Etsy/eBay access tokens | `backend/server/utils/*TokenStorage.js` |
| Asset pipeline | Downscales designer-supplied art to the sizes the site serves, before it lands in `public/assets/`. Output widths live in one `PRESETS` table | `scripts/resize_asset.py` |

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
| GET/POST | `/api/inventory/items`, `/api/inventory/items/:id` (PATCH/DELETE too) | `routes/inventory.js` — sellable items |
| PATCH | `/api/inventory/items/:id/quantity` | `routes/inventory.js` — the only quantity-change entry point: `{ delta?, quantity?, reason? }`, runs as a transaction, decrements linked components (and logs an `inventory_adjustments` row) only when the change is a **decrease** |
| GET/POST | `/api/inventory/components`, `/api/inventory/components/:id` (PATCH/DELETE too) | `routes/inventory.js` — raw components/supplies |
| GET | `/api/inventory/components/low-stock` | `routes/inventory.js` — components at/below their threshold; **must stay registered before `/components/:id`** or Express matches `low-stock` as the id param |
| GET/POST | `/api/inventory/items/:id/bom`, `DELETE /api/inventory/items/:id/bom/:componentId` | `routes/inventory.js` — bill-of-materials links (which components + qty go into one item) |

Each content router uses `/` internally; the path segment (`/listings`, `/sales`, …)
comes from the mount in `index.js`. Any other path returns `404 { error: 'Route not found.' }`.

`/api/library/*` and `/api/inventory/*` need `DATABASE_URL` (Neon). Without it the backend
degrades gracefully: `GET` returns `{}`/`[]`, writes return `503`. The frontend falls back to
`localStorage` for Library views; the inventory admin UI has no offline fallback.

`/api/inventory/*` and `/admin/inventory` have **no authentication** — anyone with the URL can
read/write inventory data. Acceptable while building out the CRUD/decrement logic, but flagged
as a hard blocker before real stock data goes live (see Known Traps).

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
- Database schema: Postgres (Neon). `library_views (slug, count)` plus the inventory tables
  (`inventory_items`, `inventory_components`, `inventory_bom`, `inventory_adjustments`),
  auto-created by `routes/libraryViews.js` / `routes/inventory.js`; no migration tooling yet.
- API contracts: `backend/server/routes/` (per-router files).
- Deployment: frontend on Vercel (needs `VITE_API_URL` = backend origin, and a SPA rewrite
  via `frontend/vercel.json`); backend on Railway (needs `DATABASE_URL`). Both auto-deploy
  from `main` — after merging, confirm Railway picked up the new commit.

## Known Traps

- Each content router in `routes/` uses `/` internally and gets its path segment from the
  mount in `index.js`. When adding a new content route, add it to `index.js` (don't repeat
  the segment inside the router file, or you'll get a doubled path like `/api/x/x`).
- `server.js` can open the auth/validate URLs in a browser at boot, but it is **opt-in**:
  set `OAUTH_AUTO_OPEN=true` (local dev only). Left off, boot makes no outbound Etsy/eBay
  calls — which is what you want unless the session is specifically about OAuth. It is
  always skipped when `NODE_ENV=production` or `RAILWAY_ENVIRONMENT` is set.
- Scaffolded `pages/Orders/*` and `pages/Shop/{Category,ProductPage,Sales}.jsx` exist but are
  empty and not referenced by the router — do not confuse with the inventory admin work, which
  is deliberately separate (`pages/Admin/Inventory.jsx`).
- Frontend↔backend base URL comes from `VITE_API_URL` (`lib/api.js`), baked in at Vite
  build time — it must include the scheme (`https://…`) and needs a redeploy to change.
- In `routes/inventory.js`, `GET /components/low-stock` must be declared before
  `GET /components/:id` or Express treats `low-stock` as an `:id`.
- Postgres `NUMERIC` columns (component quantities, BOM ratios) come back from `pg` as JS
  strings, not numbers — wrap in `Number(...)` before arithmetic (see the decrement transaction
  in `routes/inventory.js`).
- No auth exists on `/api/inventory/*` or `/admin/inventory` yet — do not treat this as
  production-ready for real stock data until an admin-auth gate is added.
- `UvMode` itself only drives CSS custom properties and filters. For a piece photographed in
  both states, use `components/UvPhoto.jsx` instead — it stacks the two photos and crossfades
  between them, and takes asset paths *without* the width suffix
  (`/assets/hero-necklace-daylight`), building the srcset from what `resize_asset.py` writes.
  Neither state gets the daylight photo filter, on purpose. Each instance also carries its own
  switch: state lives on the component's `.is-lit` class, not on `.sss-home[data-mode]`, and
  flipping the site-wide toggle clears every per-image override.
- The mode colour tokens in `Home.css` are declared on **two** selector pairs — `.sss-home` /
  `.uv-photo.is-lit` for blacklight, `.sss-home[data-mode='daylight']` / `.uv-photo` for
  daylight — so a single photo flipped on its own dresses its caption switch in its own state.
  Adding a token to one mode means adding it to that one rule, not to a `.sss-home` block: the
  page shell's layout properties were split into a separate `.sss-home` rule below the tokens
  so `.uv-photo` could share them. `--accent`, `--bone` and `--muted` differ between the two
  sets by hue, not just brightness — keep it that way, or text stops visibly changing with the
  toggle (board #24).
- The nav's utility icons are behind `UTILITY_ICONS_VISIBLE` in `SiteHeader.jsx`, `true` only
  on the preview branch. It must be `false` on `main` until board #22 builds the features.
- The nav's four utility icons (search / sign in / wishlist / cart) are **placeholders** —
  `aria-disabled` buttons with no behaviour. None of those features exist anywhere in the app
  (board #22). Don't wire a click handler to one assuming a backend is there.
- Two traps with the neon logo art, which is opaque and has no alpha channel. It no longer
  appears in the nav — only in the home hero — but the rules still apply wherever it is used:
  - `mix-blend-mode: screen` needs **no ancestor opening a stacking context** between the
    `<img>` and the element whose backdrop it blends with. A `position`/`z-index` on the
    wrapper brings the black box back; put the z-index on the `<img>` (see `.hero-logo` /
    `.hero-logo-wrap`).
  - Don't add `filter: drop-shadow(...)` at large sizes. The silhouette is the whole opaque
    rectangle, so the shadow outlines a box rather than the neon strokes. It passes unnoticed
    at nav size; at 760px it is an obvious frame. The glow is baked into the artwork already.
- The header logo (`public/assets/StoryShapedStudiosNeonGlow_Rect.png`) is neon art on an
  **opaque black** background with no alpha channel. `.sss-brand img` relies on
  `mix-blend-mode: screen` to drop that black against the dark nav, plus a
  `[data-mode='daylight']` `hue-rotate` filter so the neon tracks the UV toggle. Swapping in a
  transparent asset, or putting a light background behind the nav, breaks one or both.
