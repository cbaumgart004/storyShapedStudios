# Current Work

Last updated: 2026-08-03

## Work Tracks

| Track | Focus | Branch | Status |
|---|---|---|---|
| A | Inventory Phase 1 (items, components, BOM, decrement) | merged to `main` (`292741b`) | Built; needs end-to-end DB verification + admin auth |
| B | Splash page redesign (per Whitney's notes doc) | `home-page-layout` (`f406e03`, pushed) | Shipped bar #16 and #22 |
| C | Library mobile layout | `library-mobile-update` (off `home-page-layout`) | #25 shipped |

**One preview branch.** Whitney reviews a single preview site, so front-end work
stacks onto `home-page-layout` rather than branching off `main` — do not cut a
new branch from `main` for review work.

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

## Source of Truth for This Track

Whitney's notes now live in a **Google Doc, not the old `.docx`** — it is edited
in place, so re-read it before picking up an issue rather than trusting a
board item written from an earlier revision:

<https://docs.google.com/document/d/16BztwhEvCqGlkO16mVmG_yOBt_bPJ4P5_ei1MH6_dDc/edit?tab=t.0>

Requires her Google login; `WebFetch` gets a 401, so read it through the
browser. The doc also names <https://satomikawakita.com> as the layout
reference she wants used as a starting template.

## Objective

Rework the splash/home page to Whitney's spec in the notes doc: a
two-row top bar, a utility bar (hamburger + search/login/wishlist/cart), a new
hero lockup with tagline and CTAs, and three body sections (Our Story, Our
Values, A Space for Makers). Frontend-only — no backend or schema impact.

## Branch

`home-page-layout` (off `layout-updates`, which is off `main`).

## Tracker

Local `.boards/` store — **Epic #2**, child issues **#3–#23**. Query with
`scripts/boards.ps1 list` from the `boards-local` skill.

## Current State

- **#5 shipped** — daylight palette retuned from warm olive/gold to a cool
  citron (`--vaseline` `#d4e85f` → `#c6e87a`, plus cooler `--void`, `--void-2`,
  `--bone`, `--muted` in `styles/Home.css`).
- New neon rect logo (`public/assets/StoryShapedStudiosNeonGlow_Rect.png`)
  wired into `SiteHeader.jsx`, replacing the square mark + text wordmark. It
  shifts green → citron with the UV toggle via `mix-blend-mode: screen` plus a
  per-mode `hue-rotate` filter (see Known Traps in `AI_CONTEXT.md`).
- **#3 shipped** — the nav links are now two stacked rows inside `.sss-navlinks`
  (each row a `.sss-navrow`): row 1 Library / Glossary / Images, row 2 Home /
  Shop / Meet the Artist / blacklight toggle. "Collection" was relabelled
  "Shop" per the notes.
- **#7 shipped** — the band under the nav is Facebook + Instagram only, via a
  new `connectSocials` export in `components/socials.js`. The footer still uses
  the full `socials` list (Etsy/eBay included).
- **#10–#14 shipped — the hero is now Whitney's** — one centered column in her
  running order: the rect neon logo at `min(94%, 760px)` as the `<h1>`, the
  tagline, the two CTAs (`/library` and `/shop`), the paired daylight/blacklight
  photo, then her creator credit. The old "Worn by day / Alive by night" hero
  copy and its 2-column grid are gone.
- **#18 shipped — `components/UvPhoto.jsx`** — renders both states of a piece
  stacked and crossfades to the blacklight shot on `[data-mode='blacklight']`.
  No hook and no JS state; it reads the ancestor attribute. Neither state gets
  the daylight photo filter.
- **#13 shipped** — hero photos extracted from the notes doc and resized:
  `hero-necklace-{daylight,blacklight}-{900,1600}.jpg` in `public/assets/`.
- **#15 and #17 shipped** — Our Story and A Space for Makers render as
  `.prose-block` sections (`#our-story`, `#makers`) between the hero and the
  existing "Pieces with a past" section.
- The pre-existing Featured / Why-it-glows / Meet-the-Artist sections are
  untouched and still sit below the new ones — Whitney's notes neither mention
  nor remove them.
- **#19 shipped** — every `UvPhoto` carries its own switch in the caption slot,
  so one piece can be flipped without changing the page. Flipping the site-wide
  toggle clears all per-image overrides.
- **#20 shipped** — `SiteHeader` takes `hideBrand`; home passes it, so the nav
  lockup is gone there and the hero logo carries the branding. Other pages keep
  the nav logo.
- **#21 shipped** — "Crafted with love and light" removed from the footer; the
  note now reads just "StoryShaped Studios". The same phrase still closes
  `README.md`, which is developer-facing and was left alone.
- **#23 shipped, superseding #3's two rows** — the nav now follows the
  reference site: the site title as plain letterspaced type on its own line,
  one row of links beneath (Home / Library / Glossary / Images | Shop / Meet
  the Artist), utility icons at the right. The neon lockup is out of the nav
  **site-wide** — `hideBrand` is gone. The link for the current page is
  filtered out by `useLocation()`.
- **#9 shipped** — four utility icons (search, sign in, wishlist, cart) as
  inline SVG in `components/navIcons.jsx`, dimmed and inert. The features
  behind them are **#22**, still to build. They are **preview-only**: the
  `UTILITY_ICONS_VISIBLE` constant in `SiteHeader.jsx` is `true` here and must
  be set to `false` in the commit that merges this branch to `main`.
- **#24 shipped** — text tracks the toggle again. Daylight `--bone`/`--muted`
  had drifted to within a couple of points of the blacklight values under #5,
  and the hero tagline that replaced the old `<h1>` took static `--bone` rather
  than the accent the old `.lit` line used. Daylight type is now `#eef2d9` /
  `#a8b587` (still cool, citron hue family), and `.hero-tagline` plus the four
  `h2` rules take `var(--accent)` + the mode's glow. The Glossary and Library
  page titles (`.gl-hero h1`, `.lib-hero h1`) got the same treatment so the
  whole site behaves alike; Meet the Artist was already covered by
  `.section-head h2`, and Library article titles were already accent. Verified
  in the browser on `/`, `/library`, `/library/:slug`, `/glossary` and
  `/meet-the-artist`, both modes.
- **#19 revisited** — the per-photo caption switch was still wearing the page's
  palette. The mode tokens are now scoped to `.uv-photo` / `.uv-photo.is-lit`
  as well as `.sss-home[data-mode]`, so a photo flipped on its own shows the
  same switch colours the nav toggle shows in that mode.

## Decisions Already Made

- **Cool = greener, not lemon.** The daylight accent moved to h≈78° rather than
  a golden yellow, keeping both modes in one hue family and matching how real
  vaseline glass reads in daylight.
- **The logo carries its own wordmark**, so the adjacent `<span>StoryShaped
  Studios</span>` was removed from the header rather than duplicated.
- **Footer keeps the old square mark** — the wide rect lockup doesn't fit the
  centered footer brand. Header and footer logos currently differ; unresolved.
- **"Images" is a placeholder, not a link** — no `/images` route exists, so it
  renders as a dimmed inert `.sss-navlink-soon` span. Swap to a `<Link>` when
  the gallery page is built.
- **Home sits at the head of row 2 as an interim spot** — Whitney's two rows
  don't include it, and #4 (its final placement) is still an open design call.
- **The featured band heading is now "Connect With Us"** — "Shop the
  Collection" stopped making sense once Etsy/eBay left the band. Copy call
  made locally; confirm with Whitney.

## Latest Direction from Whitney (2026-08-03)

Read off the live notes doc plus her verbal notes; the board items below were
updated to match.

- **The logo becomes a large hero image at the top** (#10), not just the nav
  lockup — with the tagline (#11) and CTA buttons (#12) beneath it.
- **The nav bar moves to icons + hamburger** (#8, #9). Open question: whether
  the two text rows shipped under #3 stay alongside the icons or collapse into
  the hamburger. Her answer reopens #3 if it's the latter.
- **Paired daylight/blacklight photos should swap with the toggle** — filed as
  **#18**. Some pieces are shot twice, and the photo itself should change with
  the toggle rather than a CSS filter being laid over one shot. Overlaps #6
  (the filter tinting photos) and Track A next-step 5.
- **Our Story copy has landed** (#15) — no longer blocked, but its final
  sentence is truncated mid-word in the doc.
- **Both hero image states are now in the doc** (#13) — the same floral-drop
  necklace in daylight and under blacklight. They still need extracting,
  resizing via `scripts/resize_asset.py`, and committing to `public/assets/`.

## Next Steps

Done: **#3 (superseded by #23), #5, #7, #9, #10–#15, #17–#21, #23, #24**.

Not started: **#22** (the functions behind the nav icons — search, sign in,
wishlist, cart; all four are real features, none exist).

Typography note (2026-08-03): Whitney reported the fonts are right as they are.
Nothing in this track has changed a font family or retuned an existing type
rule — every `font-*` line added is on a new element and reuses `Poiret One`,
already the site's display face. Re-confirmed while fixing #24:
`git diff main -- frontend/src/styles/Home.css` shows no `font-family` change,
`.hero-tagline` carries the old hero title's exact face/weight/tracking (only
size and line-height shrank, since the neon logo now carries the display size),
and the four `h2` rules differ from `main` only in their colour lines. Leave the
type alone unless she asks.

Ready to pick up now: **#6** (stop the daylight filter tinting photos —
`UvPhoto` already sidesteps it for paired shots, but the `saturate/brightness`
rules on `.piece-card img` and `.glow-story .story-img img` are still there).

## Blocked / Waiting on Whitney

- **#4** — where the Home button should live in the two-row bar (design call).
- **#8** — final contents of the left hamburger menu (Services, Policies, …),
  and whether the #3 text rows survive the move to icons.
- **#16** — Our Values body copy, still "Text pending" in the notes. It belongs
  between Our Story and A Space for Makers; nothing is stubbed in for it.

## Assumptions to Confirm With Whitney

- **Our Story's closing link** — her draft trails off mid-word ("More on
  Whitney's personal journey here (hy"). The fragment is not rendered; the link
  points at `/meet-the-artist`, which is a guess at the target.
- **CTA destinations** — "Learn about Uranium Glass" → `/library`, "Shop the
  Collection" → `/shop`. The notes don't say.
- **Which other images have both states shot** — determines how far `UvPhoto`
  spreads beyond the hero.

---

# Track C — Library Mobile Layout

## Objective

Make `/library` usable on a phone. The sidebar stacks above the article there,
so opening an entry buried it under the search box, Most viewed and a 35-item
Contents list. Frontend-only, `pages/Library.jsx` + `styles/Library.css`.

## Branch

`library-mobile-update`, cut from `home-page-layout` — see the one-preview-branch
note at the top.

## Current State

**#25 and #26 shipped.**

- **#26** — the 18 bare URLs in Whitney's article prose now render as links in
  `var(--accent)`, so they track the UV toggle. `parseSections()` wraps each
  bare URL in CommonMark's `<...>` autolink syntax rather than pulling in
  `remark-gfm`, which would also enable tables/task-lists/strikethrough and
  change how the rest of her copy parses.

- The search box gained an autocomplete list (title matches before body-only
  matches, 8 max) wired as a real combobox: arrows, Enter, Escape. It is
  absolutely positioned so it overlays the rails instead of reflowing the page.
  Rows carry a border on mobile, where there is no hover to distinguish them.
- Most viewed and Contents are two independent disclosures. Both are expanded
  with no toggles on `/library`; both start collapsed on `/library/:slug`,
  whether the reader picked an entry or loaded the URL directly. Verified in
  the browser at 400px for all three paths.
- A fixed "Back to Top" overlay appears bottom-right as soon as the page scrolls.
- **Fixed the real padding bug**: the project had no `box-sizing` reset, so
  `width: 100%` + horizontal padding (`.lib-shell`, `.gl-shell`,
  `.lib-side-toggle`, `.lib-suggestion`) pushed the right edge past the
  viewport and ate the right gutter. `box-sizing: border-box` now applies once,
  to `.sss-home` and its subtree, at the top of `Home.css` — every page wraps
  itself in `.sss-home`, so that covers the site. It also fixed `.hero-figure`
  on Home, which had been rendering 30px wider than the logo above it and 15px
  past the hero's content box on either side. All four pages scanned clean for
  overflow at 400px and 1400px.
- **Nav rebuilt around `.sss-navitem` cells** whose right border draws a pipe
  between items. Under 760px it is a 3-column grid: Home | Glossary | Images /
  Shop | Meet the Artist | UV toggle / icons. Desktop keeps the toggle at the
  right via `margin-left: auto`; its only change is pipes between every item
  instead of only between the old link groups (the `group` field is gone).
- Two adjacent fixes: 16px search input under 820px (stops iOS zoom-on-focus),
  and one-column Contents under 560px.

## Decisions Already Made

- **The collapse is CSS, not a JS breakpoint.** Above 820px the toggle is
  `display: none` and the rails always render, so desktop is untouched and
  there is no resize listener to keep in sync.
- **Back to Top is phone-only.** On desktop the sidebar is sticky, so the search
  box never leaves the screen. Trivially widened if she wants it everywhere.
- **Picking a suggestion clears the query** — stale text in a search box pinned
  to the top of a phone screen reads as "still filtered".

## Next Steps

- Confirm on a real phone, ideally iOS Safari.

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
