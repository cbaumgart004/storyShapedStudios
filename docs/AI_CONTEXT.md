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
| Web UI | React storefront. Routed today: `/`, `/meet-the-artist`, `/shop`, `/library`, `/library/:slug`, `/glossary`, and `/:slug` for console Pages (named routes win). | `frontend/src/` (`App.jsx`, `pages/`, `components/`) |
| Pages and components | Every page is a console `page` document: a title and its sections, each a component defined in the console schema's `blocks` and drawn by `components/Blocks.jsx`: **Card** is the general one (small heading, heading, rich text, images, links shown by title only, a signature, look Text or Story), and Hero, Values grid, Daylight / blacklight photo and Product card (a Listing's photo, title and price) are the particular ones. Sections saved in the four retired shapes (Text section, Portrait row, Artist story, Framed photo) render as Cards through `lib/cards.js` until `frontend/scripts/seed-editor.mjs` rewrites them. The Library is the page slug `library`: its first Card heads the index and later sections follow it; its entries are Library entry documents (reference cards: title, rich entry, sources shown with their address), listed under Pages in the editor. Inventory (`/admin/inventory`) is in the editor's menu (schema `tools`). `components/SitePage.jsx` renders one: Home is slug `home` at `/` (with the featured header; `/home` redirects to `/`), Meet the Artist is slug `meet-the-artist`, any other slug at `/<slug>`. Sections sit on a 12-column grid ordered and sized by the page's Page layout (`pageLayout` whose address is the page's), keyed by section id; Home's ids (`hero`, `believe`, `story`, `jewelry`, `makers`) match its existing layout. A page with no document renders from `lib/builtInPages.js` (the copy as shipped), which `frontend/scripts/seed-editor.mjs` loads into the console. Each section opens its page for click-to-edit; the space around it opens the layout | `components/SitePage.jsx`, `components/Blocks.jsx`, `lib/builtInPages.js`, `pages/Home.jsx`, `pages/MeetTheArtist.jsx`, `pages/Page.jsx`, `styles/Home.css`, `styles/MeetTheArtist.css`, `styles/Page.css` |
| Library | Searchable knowledge base from Markdown, plus entries published in the Edge of the Map console (`libraryArticle`; a title matching a `library.md` heading replaces it). Index + per-article pages: `/library` lists all entries, `/library/:slug` shows one article on its own shareable URL; shared shell (search + Most-viewed + Contents rail) with copy-link + view counts | `frontend/src/pages/Library.jsx`, `frontend/src/lib/siteConsole.js`, `public/library.md`, `public/library-media/`, `scripts/docx_to_library_md.py`. `frontend/scripts/import-library.mjs` copies `library.md` into the console (published in order; unanswered questions as drafts; re-runnable) |
| Glossary | `/glossary` is the console's Reference Page Layout (`referencePage`) whose address is `/glossary`: title, eyebrow, intro, sections of terms (definition, labelled details, sources) and the Library index. Until one exists it renders `BUILT_IN` (`lib/glossaryPage.js`, from `data/glossaryTerms.js`); `frontend/scripts/import-glossary.mjs` copies that into the console. A source shows a readable title as the link with its site and address beneath, wrapping anywhere; a blank title is made from the address | `frontend/src/pages/Glossary.jsx`, `lib/glossaryPage.js`, `components/SourceLink.jsx`, `lib/sources.js`, `styles/Glossary.css` |
| Site theme | The console's Theme (`theme`, one document): heading and body fonts (Google Fonts beyond the bundled Poiret One) and, per mode, background, accent, text, quiet text, glow colour and glow strength. Applied as one `<style>` after the site CSS, one selector step more specific than each `Home.css` rule it replaces; blank fields keep the site's own; drafts apply live. Every heading-face rule reads `--font-heading`, body copy `--font-body` | `frontend/src/components/SiteTheme.jsx`, `styles/Home.css` (palette, font variables) |
| Editor entry | `/preview` hands over to the console's sign-in, `admin.theedgeofthemap.com/?handoff=storyshaped`, which opens the console's first allowed origin (the preview) with the editor on; a first sign-in asks for her own password first. `theedgeofthemap.com/storyshaped` does the same (once Edge of the Map's `main` carries it). The nav's Sign in icon shows only in a browser the console has confirmed as the owner's (`useOwner`: `GET /me` with the editor token answers role `owner`, remembered in localStorage as `sss:owner`) and opens the editor (`openEditor`); visitors never see it. Customer accounts will need their own sign-in | `frontend/src/App.jsx` (`ToEditor`), `lib/siteConsole.js` (`signInThroughConsole`), `components/SiteHeader.jsx` |
| Menu and draft pages | The console's **Menu** (`menu`, one per site) is the header's links, in the owner's order: each item a Page (relation) or an address, with an optional label and Coming soon. An item whose Page is not published is hidden from visitors and shown dimmed to the owner while editing (`useMenu` in `lib/siteConsole.js`). Pages not ready for visitors are drafts (`DRAFT_PAGES` in `lib/builtInPages.js`: Shop, Images), created by `seed-editor.mjs` and never shown from built-in copy, so a visitor gets Page not found until the owner publishes | `lib/siteConsole.js`, `components/SiteHeader.jsx`, `lib/builtInPages.js` |
| Header and footer settings | The console's Site header and footer (`siteSettings`, one per site): site name, copyright owner and notice for the footer (`© <year> <owner>. <notice>`), social and shop links (icon, and whether each shows in the band under the menu), and the toggle's labels. `useSiteSettings` in `lib/siteConsole.js`; the header and footer fall back to their built-in lists; both open it for click-to-edit. The Theme starts blank (blank is the site's own look exactly; each field's hint shows today's value); its glow is drawn per mode from `SHAPES` in `components/SiteTheme.jsx`, which reproduce Home.css at 100% and scale by three sliders (strength: the tight glow; haze: the outer halos and page wash; reach: every layer's size), so changing a colour only recolours. And `/shop` is the console page slug `shop`. `frontend/scripts/seed-editor.mjs` creates every missing page, the theme and the header and footer, and rewrites retired sections as Cards | `components/SiteHeader.jsx`, `components/SiteFooter.jsx`, `components/socials.js`, `lib/siteConsole.js`, `frontend/scripts/seed-editor.mjs` |
| Shared UI | Site header/footer + UV-mode context reused across pages. The nav is a text wordmark on its own line, then one row of links (current page's own link filtered out) with the UV toggle and four inert utility icons at the right. The social band under it is Facebook + Instagram only (`connectSocials`), while the footer keeps the full `socials` list | `frontend/src/components/Site{Header,Footer}.jsx`, `components/navIcons.jsx`, `components/socials.js`, `context/UvMode.jsx`, `lib/api.js` |
| OAuth / marketplace API | Etsy + eBay OAuth flows and token validation | `backend/server/server.js` |
| Content routes | `/api/*` content endpoints, aggregated by `index.js` and mounted at `/api` | `backend/server/routes/` (`index.js` + siblings) |
| Inventory API | Stock Items (ADR-0002). `POST /api/inventory/import/trunk` (`importTrunk`, `backend/scripts/import-trunk.mjs`) keeps every row as an `import_snapshots` row and creates only SKUs not yet here; a variant group is skipped. The admin page shows each item's Listing (console `listing` documents, matched by Variation SKU) and flags Listing SKUs with no Stock Item. Stock Items: one table where a Product is sellable and a Component is in another's Bill of Materials; counts move only through logged Build / Sale / Restock / Physical Count movements (ADR-0003), with low-stock detection. Phase 1's tables are copied in once and renamed `phase1_*` | `backend/server/routes/inventory.js` (HTTP), `utils/stock.js` (rules + schema), `utils/stock.test.js` (PGlite, `npm test` in `backend/`), `utils/notifyLowStock.js` |
| Admin UI (minimal) | Internal page, behind a console sign-in, listing Stock Items (filter: products, components, low), each with its count actions, Bill of Materials, where it is used, and history | `frontend/src/pages/Admin/Inventory.jsx`, routed at `/admin/inventory` |
| Database | Postgres (Neon) — Library view counts, inventory (`stock_items`, `stock_bom`, `stock_movements`) | `backend/server/utils/db.js`, `routes/libraryViews.js`, `utils/stock.js` |
| Token storage | Etsy/eBay OAuth tokens in Neon's `marketplace_tokens` (a file per Marketplace only without a database, locally) | `backend/server/utils/tokens.js`, `utils/*TokenStorage.js` |
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
| GET/POST | `/api/inventory/stock` (`?sellable=true\|false`, `?low=true`) | `routes/inventory.js` — list; create (its `quantity` is the first Physical Count) |
| GET/PATCH/DELETE | `/api/inventory/stock/:id` | `routes/inventory.js` — one item with `bom`, `used_in` and its last 50 `movements`; PATCH edits details, never the count; DELETE answers 409 while the item is in another's Bill of Materials |
| PUT/DELETE | `/api/inventory/stock/:id/bom/:componentId` | `routes/inventory.js` — one Bill of Materials line `{ quantity_per_unit }`; a line that makes an item part of itself at any depth answers 400 |
| POST | `/api/inventory/stock/:id/movements` | `routes/inventory.js` — the only way a count changes: `{ kind: restock\|sale\|build\|count, quantity, note? }`. A build lowers each Component by its Bill of Materials quantity in the same transaction; a count logs Actual minus Calculated and sets Previous |

Each content router uses `/` internally; the path segment (`/listings`, `/sales`, …)
comes from the mount in `index.js`. Any other path returns `404 { error: 'Route not found.' }`.

`/api/library/*` and `/api/inventory/*` need `DATABASE_URL` (Neon). Without it the backend
degrades gracefully: `GET` returns `{}`/`[]`, writes return `503`. The frontend falls back to
`localStorage` for Library views; the inventory admin UI has no offline fallback.

`/api/inventory/*` needs a bearer token the Edge of the Map console accepts for this site:
`utils/requireEditor.js` asks the console's `GET /api/sites/storyshaped/me` (setting `EOTM_SITE_API`)
and keeps a yes for a minute per token; an unreachable console answers 503, never a pass.
`/admin/inventory` sends the editor token the console's loader keeps in `sessionStorage`
(`editorToken()` in `lib/siteConsole.js`) and offers "Sign in", a round trip through the admin page.

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
- Database schema: Postgres (Neon). `library_views (slug, count)` plus the stock tables
  (`stock_items`, `stock_bom`, `stock_movements`), auto-created by `routes/libraryViews.js` /
  `utils/stock.js`; no migration tooling yet. `utils/stock.js` also copies the Phase 1
  `inventory_*` tables in once, under an advisory lock, and renames them `phase1_*`.
- API contracts: `backend/server/routes/` (per-router files).
- Deployment: what runs, calling what, with which settings, is [DEPLOY-MAP.md](../DEPLOY-MAP.md) (backend on Lambda behind the Amplify app's `/api`, `/auth`, `/oauth` rewrites; `.github/workflows/backend-api.yml`). Before that move: frontend on Vercel (needs `VITE_API_URL` = backend origin, and a SPA rewrite
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
- Postgres `NUMERIC` columns (stock quantities, Bill of Materials ratios) come back from `pg` as JS
  strings, not numbers — `utils/stock.js` converts them (`row()`) before returning.
- `/api/inventory/*` trusts the console for sign-in and membership: a login removed from the site
  on the admin page keeps working here for up to a minute (the cached yes).
- **The mode a visit opens in is the Theme's** (`context/UvMode.jsx`): "Opens in" (`defaultMode`,
  blacklight when unset) and "Remember each visitor's last choice" (`rememberChoice`, off when unset). Off,
  every visit opens in the Theme's look and nothing is kept, which settles board #38; on, a returning visitor
  gets what they last chose (`localStorage` `sss-uv-mode`). Changing the default constant does nothing while
  a Theme says otherwise.
- **`--glow-strong` is all one green on purpose (board #45).** Its innermost layer used
  to be a pale mint `--halo` (`#b9ffbc`), which bloomed over glyphs and made the hero
  tagline read as a whiter green than the rest of the accent text — a colour mismatch
  that no `color` value explains, since every accent element already resolves to the same
  `var(--accent)`. `--halo` is gone; don't reintroduce a light inner layer on text glow.
- **Each mode is three steps of ONE hue** (board #46) — `--bone` s49/l90, `--accent`
  s100/l49–71, `--muted` s45/l62, all on the same hue (h120 blacklight, h75 daylight).
  Emphasis is carried by saturation and lightness, never by hue. If you add a colour,
  place it on that ramp rather than introducing a new hue.
- **The two modes are anchored in opposite directions, on purpose.** In blacklight the
  hero logo is the reference: it renders **unfiltered** at its native `rgb(0, 251, 0)`
  and `--uranium` is set to that exact value, so type matches the artwork. In daylight the
  logo is filtered to the accent instead, because matching type to the daylight logo would
  mean `#97b819` — the dull dark olive Whitney rejected in board #36. Don't "fix" the
  asymmetry by filtering the blacklight logo or dulling the daylight accent.
- Retuning a logo filter: the artwork has **no red or blue**, so `saturate()` **below 1**
  is what adds them (desaturation moves a colour toward its luminance grey) and
  `brightness()` then restores the green channel. Measure by rendering the image through
  `canvas.filter` and sampling the brightest pixel — a CSS filter cannot be read back off
  a rendered element.
- `.values-grid` (the What We Believe block) is **flex-wrap, not CSS grid, on purpose**.
  Seven cards leave a partial last row, and `grid-template-columns: repeat(auto-fit, …)`
  does not centre it — `auto-fit` collapses a track only when that track is empty across
  the whole grid, so the seventh card pins to column 1. Don't "tidy" this back into a grid.
- `Home.css` owns `.piece-grid` / `.piece-card`, but **Meet the Artist is now their only
  consumer** — Home stopped using them when its Featured band was cut (board #27). They are
  not dead code. `.glow-story`, `.story-img`, `.story-copy`, `.story-link` and
  `.artist-feature` in the same file genuinely are dead, and are kept only because deleting
  them is cleanup unrelated to the copy change that orphaned them.
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
  Sign in is the exception: it shows to a console-confirmed owner on every build, and to no one else.
- `Library.jsx`'s mobile affordances (search autocomplete, the two rail disclosures, the
  "Back to Top" overlay) are gated by the `max-width: 820px` query in `Library.css`, not by
  a JS breakpoint — `.lib-side-toggle` and `.lib-totop` are `display: none` above it and the
  rails always render. Don't add a resize listener to "fix" the desktop behaviour; it is
  deliberate. The `is-open` class on `.lib-side-browse` only has an effect inside that query.
- Bare URLs in `public/library.md` are linked by `linkifyUrls()` in `Library.jsx`, which
  wraps them in CommonMark `<...>` autolink syntax before react-markdown sees them. This is
  deliberately not `remark-gfm` — that plugin would also turn on tables, task lists and
  strikethrough and re-parse Whitney's prose. If you add real `[text](url)` links to
  `library.md` they pass through untouched; the regex consumes them first.
- **`box-sizing: border-box` is set once, on `.sss-home` and its subtree, at the top of
  `Home.css`** — every page wraps itself in `.sss-home`, so that is the whole site. It is not
  on `*` at the document root. Before it existed, any rule pairing a width with padding
  overflowed its container: `.lib-shell` measured 415px inside a 383px page (eating the right
  gutter on a phone) and `.hero-figure` ran 30px wider than the logo above it. Don't re-add
  page-scoped copies of this rule.
- The nav's pipes are the right border of each `.sss-navitem` cell, not elements in the flow,
  so a wrapped row never ends on a stranded divider. Under 760px `.sss-navlinks` is a
  3-column grid and the UV toggle is the last cell (`.sss-navitem-toggle`), which is why the
  toggle is shrunk there — it has to fit a third of a 360px bar. Adding or removing a
  `NAV_LINKS` entry changes how the rows fall: six routed pages minus the current one leaves
  five links + toggle = two full rows of three.
- Three of the nav's four utility icons (search / wishlist / cart) are **placeholders** —
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
