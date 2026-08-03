# Current Work

Last updated: 2026-07-22

## Work Tracks

| Track | Focus | Branch | Status |
|---|---|---|---|
| A | Inventory Phase 1 (items, components, BOM, decrement) | merged to `main` (`292741b`) | Built; needs end-to-end DB verification + admin auth |
| B | Splash page redesign (per Whitney's `Website notes.docx`) | `layout-updates` | In progress; 1 of 15 issues shipped |

---

# Track A — Inventory Phase 1

## Objective

Phase 1 of a self-built inventory system (like the app "Trunk"): track sellable
items and the raw crafting components/supplies used to make them, auto-decrement
components when an item's quantity changes, and surface low-stock components.
This is the foundation later phases (live Etsy/eBay sync, low-stock email,
UV-paired photos, TinaCMS for marketing content) build on.

## Branch

Committed to `main` as `292741b` ("Inventory: Phase 1 foundation").

## Current State

- New backend inventory API at `/api/inventory/*` (`backend/server/routes/inventory.js`,
  mounted via `routes/index.js`), following the existing `ensureTable()`/`hasDb`
  degrade-gracefully pattern from `routes/libraryViews.js`.
- Four new Postgres tables (auto-created, no migration tool): `inventory_items`,
  `inventory_components`, `inventory_bom`, `inventory_adjustments`.
- Quantity changes go through a single transactional endpoint,
  `PATCH /api/inventory/items/:id/quantity` — locks the item row, applies the
  delta, logs an `inventory_adjustments` row, and (only on a **decrease**)
  prorates linked components down per the BOM. Low-stock components (at/below
  `low_stock_threshold`) trigger `backend/server/utils/notifyLowStock.js`,
  currently a `console.warn` stub.
- New minimal admin page at `/admin/inventory`
  (`frontend/src/pages/Admin/Inventory.jsx`) — tables for items/components,
  inline quantity adjust, and a per-item BOM editor. Deliberately separate
  from the existing empty `Shop`/`Orders` scaffolding (public storefront
  concern, not touched).
- `frontend/src/lib/api.js` gained a small `apiFetch()` JSON helper alongside
  the existing `API_BASE` export.

## Relevant Files

- `backend/server/routes/inventory.js`, `utils/notifyLowStock.js` — the API + notify hook.
- `backend/server/routes/index.js` — mounts `inventory` at `/inventory`.
- `frontend/src/pages/Admin/Inventory.jsx`, `styles/AdminInventory.css` — the admin page.
- `frontend/src/lib/api.js` — `apiFetch` helper.
- `frontend/src/App.jsx` — `/admin/inventory` route.

## Decisions Already Made

- **One quantity endpoint, not separate sale/adjust routes** — `reason` field
  distinguishes them; mechanics (lock, decrement, log, prorate) are identical,
  and a future Etsy/eBay webhook can reuse the same endpoint.
- **No DB-level `CHECK (quantity >= 0)`** — a hard floor would roll back a
  whole sale transaction on bookkeeping drift. Negative/low stock is a signal
  (surfaced via `/components/low-stock`), not a blocking rule.
- **A quantity *increase* does not consume components** — only a *decrease*
  prorates the BOM down. Restocking a finished item is "more pre-made stock
  arrived," not an assembly event. Flagged for the user to confirm before any
  future "record a production run" workflow is built.
- **Component deletion cascades its BOM links silently** (`ON DELETE CASCADE`)
  rather than blocking with a 409 — acceptable for Phase 1, cheap to tighten
  later if it causes accidental recipe breakage.
- **TinaCMS is for marketing content only**, not inventory data — inventory
  gets this purpose-built admin UI instead, because Tina's commit-per-edit
  model is a poor fit for stock counts that change on every sale. (TinaCMS
  itself is not wired up yet — see Next Steps.)

## Validation Performed

- Backend routes and frontend page/route written to match existing
  conventions (verified by reading `db.js`, `libraryViews.js`, `routes/index.js`,
  `App.jsx`, `lib/api.js` directly). Manual end-to-end exercise of the new
  routes/UI against a live `DATABASE_URL` is still needed — see Next Steps.

## Next Steps

1. **Manually verify end-to-end** against a real `DATABASE_URL`: create an
   item + component, link them via BOM, adjust quantity down, confirm the
   component decrements and `low-stock` surfaces correctly; confirm the app
   still boots cleanly with `DATABASE_URL` unset. Run `npm run build`
   (frontend) to confirm no build breakage.
2. **Add admin auth** before real stock data goes live — `/api/inventory/*`
   and `/admin/inventory` are currently open to anyone with the URL. A
   minimal shared-secret `ADMIN_TOKEN` header check would be sufficient; no
   full auth system needed yet.
3. **Wire the `notifyLowStock` hook to real email** (provider TBD — e.g.
   Resend or SMTP via nodemailer) instead of `console.warn`.
4. **Live Etsy/eBay sync** (GET/PUT/PATCH) so this site is the quantity
   source of truth across all 3 platforms. Needs write-scope credentials
   (Etsy `listings_w`, eBay `sell.inventory`) — unconfirmed whether these
   exist yet; check before starting. Existing OAuth in `server.js` is
   read-only today and token storage is flat-file (not persistent on
   Railway) — both need upgrading as part of this phase.
5. **UV/blacklight paired-photo toggle** — today `UvMode` only drives CSS
   filters; true paired daylight/UV photos need a new data model (no
   existing convention to build on). Overlaps Track B issue #13.
6. **TinaCMS for marketing content** (Home, About, FAQs, Meet the Artist) —
   port the schema/config pattern from the user's `LiveSpiritSeedsMk2` repo
   (`tina/config.ts`, `docs/adr/0002-tinacms-content-management.md`,
   `docs/tinacms-vite-playbook.md` there), which is Vite/React-compatible.
   Explicitly does not cover inventory data.
7. Reconnect Railway ↔ GitHub auto-deploy (still disconnected as of the
   Library work — see prior notes); until then, `railway up` from the repo
   root to deploy backend changes.

---

# Track B — Splash Page Redesign

## Objective

Rework the splash/home page to Whitney's spec in `Website notes.docx`: a
two-row top bar, a utility bar (hamburger + search/login/wishlist/cart), a new
hero lockup with tagline and CTAs, and three body sections (Our Story, Our
Values, A Space for Makers). Frontend-only — no backend or schema impact.

## Branch

`layout-updates` (off `main`).

## Tracker

Local `.boards/` store — **Epic #2**, child issues **#3–#17**. Query with
`scripts/boards.ps1 list` from the `boards-local` skill.

## Current State

- **#5 shipped** — daylight palette retuned from warm olive/gold to a cool
  citron (`--vaseline` `#d4e85f` → `#c6e87a`, plus cooler `--void`, `--void-2`,
  `--bone`, `--muted` in `styles/Home.css`).
- New neon rect logo (`public/assets/StoryShapedStudiosNeonGlow_Rect.png`)
  wired into `SiteHeader.jsx`, replacing the square mark + text wordmark. It
  shifts green → citron with the UV toggle via `mix-blend-mode: screen` plus a
  per-mode `hue-rotate` filter (see Known Traps in `AI_CONTEXT.md`).
- Everything else in the epic is untouched.

## Decisions Already Made

- **Cool = greener, not lemon.** The daylight accent moved to h≈78° rather than
  a golden yellow, keeping both modes in one hue family and matching how real
  vaseline glass reads in daylight.
- **The logo carries its own wordmark**, so the adjacent `<span>StoryShaped
  Studios</span>` was removed from the header rather than duplicated.
- **Footer keeps the old square mark** — the wide rect lockup doesn't fit the
  centered footer brand. Header and footer logos currently differ; unresolved.

## Next Steps

Ready to pick up now: **#17** (A Space for Makers — copy is final), then the
hero group **#10–#12** and the nav work **#3, #7, #9**.

## Blocked / Waiting on Whitney

- **#4** — where the Home button should live in the two-row bar (design call).
- **#8** — final contents of the left hamburger menu (Services, Policies, …).
- **#13** — the hero image asset was embedded in the .docx and was not
  extracted; also needs a blacklight-state variant.
- **#15 / #16** — Our Story and Our Values body copy, both marked "Text
  pending" in the notes.

---

# Do Not Repeat (both tracks)

- Git Bash mangles a leading-slash arg (e.g. `/library-media`) into a Windows
  path; run the converter with `MSYS_NO_PATHCONV=1` (or from PowerShell).
- `railway up` must run from the **repo root** (backend service root directory
  is `backend/`); deploying from inside `backend/` fails with "Failed to read
  app source directory". `.railwayignore` keeps that upload small.
- `VITE_API_URL` on Vercel must include the scheme (`https://…`) and is baked in
  at build time — needs a redeploy to change.
- In `routes/inventory.js`, `GET /components/low-stock` must be declared
  before `GET /components/:id`, or Express matches it as the `:id` param.
- Postgres `NUMERIC` values come back from `pg` as strings — `Number(...)`
  before doing arithmetic on component quantities/BOM ratios.
- Resize designer art with `python scripts/resize_asset.py SRC --preset NAME`;
  never drop it straight into `public/assets/` unresized. Pillow is installed
  (2026-07-22) so JPEG/WebP and Lanczos resampling work; the script still falls
  back to a pure-stdlib PNG-only path if it's ever missing.
- There is no ImageMagick here — the `convert.exe` on PATH is the Windows
  filesystem tool, and running it against an image would be a bad time.
