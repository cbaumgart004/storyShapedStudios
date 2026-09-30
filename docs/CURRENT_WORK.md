# Current Work

Last updated: 2026-09-29

## Work Tracks

| Track | Focus | Branch | Status |
|---|---|---|---|
| A | Inventory Phase 1 (items, components, BOM, decrement) | merged to `main` (`292741b`) | Built; needs end-to-end DB verification + admin auth |
| B | Splash page redesign (per Whitney's notes doc) | `home-page-layout` (`f406e03`, pushed) | Shipped bar #22 |
| C | Library mobile layout | `library-mobile-update` (off `home-page-layout`) | #25, #26 shipped; signed off by Whitney |
| D | Customer layout revision (her 2026-08-03 review) | `260803_Customer_Layout_Revision` (off `library-mobile-update`) | Content chunk shipped; visual tweaks open |
| E | Go-Live 2026-10-01: hosting, inventory, marketplace, editor | `preview` | Plan settled; execution starts next session (below) |

**One preview branch.** Whitney reviews a single preview site, so front-end work
stacks onto the current head of that chain rather than branching off `main` — do
not cut a new branch from `main` for review work. The chain is now
`main` → `layout-updates` → `home-page-layout` → `library-mobile-update` →
`260803_Customer_Layout_Revision`.

**Next session starts Track E execution.** The plan is
[`deployment/deployment-plan.html`](../deployment/deployment-plan.html) (steps and owners), with the
reasons in [ADR-0005](adr/0005-free-first-hosting-stack.md) (stack; Chris hosts every client in his
own AWS account), [ADR-0006](adr/0006-shared-admin-console.md) (console schema and brand) and
[ADR-0007](adr/0007-central-console-at-edge-of-the-map.md) (console served from
`admin.theedgeofthemap.com`, pinned per site, running in each site's page). Still needed from Chris
before step 1: StoryShaped's domain and whether it is on Porkbun.

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
- **Superseded 2026-09-27 by `docs/adr/0003-components-leave-stock-at-build.md`:
  components now leave at Build, not Sale.** Original entry kept for history:
  **A quantity *increase* does not consume components** — only a *decrease*
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
- ~~**#16**~~ — unblocked 2026-08-03. Copy landed, heading is "What We Believe"
  rather than "Our Values", and it ships at the *head* of the body sections, not
  between Our Story and A Space for Makers. Shipped in Track D.

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

- Confirm on a real phone, ideally iOS Safari. (Whitney reviewed the preview on
  2026-08-03: "Looks amazing and stupid proof!!!" — treat as signed off unless a
  real-device check turns something up.)

---

# Track D — Customer Layout Revision (2026-08-03 review)

## Objective

Work Whitney's 2026-08-03 pass over the preview site into the page. Her notes
doc is the source of truth and is edited in place — re-read it rather than
trusting this summary. The editor renders to canvas and extracts as nothing;
read `/mobilebasic` instead of `/edit` to get the text.

## Branch

`260803_Customer_Layout_Revision`, cut from `library-mobile-update`.

## Tracker

Epic #2 still. New issues **#27–#43**.

## Current State

**Shipped: #16, #27, #28, #31, #43 (content), #32–#37 (visual tweaks), #44–#46.**

**#46 supersedes the logo decision in #45.** Both modes now run three steps of
one hue — `--bone` s49/l90, `--accent` s100/l49–71, `--muted` s45/l62 — but they
are anchored in **opposite directions**, which is deliberate and easy to
"correct" by mistake:

- **Blacklight**: the logo is the reference. It renders unfiltered at its native
  `rgb(0, 251, 0)` and `--uranium` is that exact value, so type matches the art.
- **Daylight**: the logo is filtered to the accent instead. Matching type to the
  daylight logo would mean `#97b819`, the dull dark olive Whitney rejected in
  #36, so the bright `#d9ff6b` accent stays and the logo comes to it.

- **#27** — the three legacy bands below the copy (Pieces with a past, Why it
  glows, Meet the Artist) and their photos are gone, per "please remove
  everything underneath this". This reverses the earlier note that Whitney's
  notes "neither mention nor remove them" — they do now. The `featured` array,
  the `coming-soon/PSX_*.jpg` glob and the `lit`/`toggle` destructuring went
  with them; the image files stay on disk for #42.
- **#16** — What We Believe ships as the first body section, seven values from a
  `values` array at the top of `Home.jsx`, in new `.values-grid`/`.value` rules.
  Heading is "What We Believe", not the "Our Values" the item was opened under.
- **#28** — Our Jewelry added as a new `.prose-block` between Our Story and A
  Space for Makers.
- **#43** — each body section's name is now its own `h2`; the eyebrow and the
  pulled-phrase heading above it are gone.
- **#31** — footer carries "© {year} StoryShaped Studios", year derived.
- **#29 and #30 closed with no code change.** The doc's Our Story and A Space
  for Makers copy is word-for-word what already shipped under #15 and #17 — she
  restated it as part of the full run, she did not rewrite it.

Body order is now What We Believe → Our Story → Our Jewelry → A Space for
Makers, which is the doc's order under "Update to writing following 'Created by
Whitney Granger….'". Note this moves the values block to the *head* of the
sections; the earlier assumption was that it sat between Our Story and A Space
for Makers.

Her seven visual notes are then all in:

- **#32** — `.hero` top padding halved, at both breakpoints (see below).
- **#33** — `font-weight: 700` on `.btn`, both CTAs; size and tracking untouched.
- **#34** — the per-photo switch moved out from over the image. Needed a
  `.uv-photo-frame` wrapper: the lit shot is `position: absolute; inset: 0`, so
  putting the button back in flow without it would have stretched the blacklight
  image over the button too.
- **#35** — `.hero-credit` up from `0.86rem` to `clamp(0.95rem, 1.4vw, 1.06rem)`,
  then superseded by **#44**: the credit now shares one rule with `.value h3`,
  so it carries the same face, weight, size, tracking, accent and glow as a
  value name. Shared selector rather than copied declarations — "the same
  status" only survives a later retune if there is one rule.
- **#36** — `--vaseline` `#c6e87a` → `#d9ff6b`, brighter at essentially the same
  hue. Three rules that hardcoded the old rgb were moved with it.
- **#37** — `--glow-strong` from `4/12/34/70px` to `3/9/22/44px` with the outer
  alphas cut, `--glow-1` from `6px @ 0.9` to `5px @ 0.7`, and the hardcoded
  `.btn-primary:hover` halo pulled in to match.

**2026-09-27 pass, from the doc's 2026-08-04 section** (all in
`components/SiteHeader.jsx` plus one `Home.css` rule):

- **#39**: the "StoryShapedStudios" wordmark no longer renders on Home, where
  the hero logo carries the brand; every other page keeps it. The 08-04 note
  confirms the earlier guess that this was the nav site title.
- The utility icons (search, sign in, wishlist, cart) moved out of the nav bar
  into the social band after a rule, and the "Connect With Us" heading is gone.
  `.sss-nav-utils` and `.sss-social-head` rules are now dead CSS, left in place.
- Shop is out of the nav for Go-Live (Track E, E1); the route remains.
- Still open from 08-04: the colour shift (#47, needs a direction) and "tweaking
  on coloration writ large" (no target given). Build clean; **no visual pass run**.

## Decisions Already Made

- **Her copy ships verbatim, including the parts flagged in #41.** The grammar
  and redundancy notes she asked for are recommendations to hand back, not edits
  to make on her behalf — it is her voice.
- **#43 was inferred from an unrecoverable screenshot anchor and shipped
  anyway; #39 was inferred and left blocked.** The split is blast radius: #43 is
  cosmetic, Home-only and reversible, #39 would silently change every page's
  header.
- **Dead CSS left in place.** `.glow-story`, `.story-img`, `.story-copy`,
  `.story-link` and `.artist-feature` are orphaned by #27 but not deleted —
  unrelated cleanup. `.piece-grid`/`.piece-card` are *not* orphaned; Meet the
  Artist still uses them.

## Validation Performed

- `npm run build --prefix frontend` — clean, 234 modules, no warnings.
- **Visual pass run in Chrome against `npm run dev`, 2026-08-03, at 400px and
  1400px in both UV modes.** Verified: page ends after A Space for Makers with
  no trailing divider; no eyebrows survive and each section's `h2` is its own
  name; no `.piece-grid`, `.glow-story` or `.artist-feature` left on Home; the
  seven value names take the same computed colour as the `h2` rules in both
  modes (`#c6e87a` daylight, `#57ff5e` blacklight) and their text-shadow changes
  too; no horizontal overflow at either width on any page; footer reads
  "© 2026 StoryShaped Studios".
- **One failure found and fixed:** the values block was built on CSS grid and
  stranded the seventh card at the left edge of the last row at 1400px. Rebuilt
  on flex-wrap — see board #16 and the Known Traps entry in `AI_CONTEXT.md`.
- **Second visual pass for #32–#37**, same two widths and both modes. Measured
  after: hero top padding 35.2px desktop / 20px phone; `.btn` weight 700 with
  size and tracking unchanged from before; credit 16.96px / 15.2px; daylight
  accent `rgb(217,255,107)`; `--glow-strong` at 3/9/22/44px; the per-photo
  switch's top edge exactly at the photo's bottom edge with no overlap at either
  width, still inside the `.hero-figure` border, and the lit image still
  covering the base image to the pixel through a toggle click.
- **Second failure found and fixed:** #32's first cut only applied above 860px.
  A `@media (max-width: 860px)` rule overrides `.hero { padding-top }`
  separately, so phones kept 40px — more headroom than the desktop that override
  exists to slightly exceed. Both values now move together.
- `/shop` renders no footer, so the copyright does not appear there. This is
  **pre-existing** — `SiteFooter` is only imported by Home, Library, Glossary
  and Meet the Artist; Shop is still the empty scaffold. Not caused by #31.
- Not checked: real iOS Safari, and the hero at desktop width (the browser
  window would not grow back after being shrunk, so the 1400px pass ran against
  a same-origin iframe of the page rather than a real desktop window).

## Next Steps

Nothing unblocked is left in this track — #32–#37 are done. Everything else
here is waiting on Whitney (below).

Still ready from Track B: **#6**, and it did not become moot when #27 deleted
the glow story — its other target, `.piece-card img`, is still live on Meet the
Artist.

Board audit, 2026-08-03: **#4 closed as obsolete** — it asked where the Home
button should sit in "the two-row bar", a layout #23 replaced and Track C then
rebuilt again; Home is now a nav link that filters itself out on the current
page. Everything else still open (#1, #2, #6, #8, #22, #38–#42, #47) is either
genuinely blocked on Whitney or not started.

**#36 and #37 are taste calls made without her in the room.** "Brighter" and
"slightly too high" have no target value, so both are a judged step in the
direction she asked for and easy to nudge either way. Show her before treating
them as settled.

## Blocked / Waiting on Whitney

- **#47** — the blacklight green from #46 "looks too simplistic". Two compounding
  causes: `--uranium` is now the single-channel primary `rgb(0, 251, 0)` (zero
  red, zero blue) taken straight off the logo, and #46's ramp is strictly one
  hue, so nothing on the page varies in hue any more. Note the tension — the
  page looked richer when the hues disagreed and duller once unified; the answer
  is likely an *analogous* ramp rather than either extreme. **Daylight is out of
  scope: "leave the yellow alone for now."** Needs a direction before any change.
- **#38** — she asked for the site to default to blacklight. It already does;
  `context/UvMode.jsx` only yields daylight when `localStorage` holds it. She is
  seeing her own saved preference. Needs her to choose: clear her site data, or
  drop the persistence so every visit opens in blacklight regardless of what the
  visitor last picked.
- **#39**: resolved 2026-09-27, see below.
- **#40** — Our Story still trails off mid-word ("…here (hy"), unchanged from
  the previous revision. Link target still assumed to be `/meet-the-artist`.
- **#41** — the grammar and redundancy notes she asked for are written and need
  sending. Headline items: three competing "world's largest/leading/most
  trusted" claims, and "What began as a personal fascination grew into the
  world's leading authority", where a fascination cannot become an authority.
- **#42** — Featured Collection and Newly Added bands, deferred by her until her
  products are sorted.

---

# Track E: Go-Live 2026-10-01

## Objective

Take the site live on **Thursday 2026-10-01**. Recorded 2026-09-27 (a Sunday),
so the window is four working days. Nothing below is started.

## Launch checklist (2026-09-29)

The console is released as **1.1.1**. The switch-on steps for every project (AWS, uptime
monitoring, the console on a phone, DNS and SES) live in Edge of the Map's
[launch checklist](https://github.com/cbaumgart004/edgeOfTheMap/blob/preview/docs/launch-checklist.md).
StoryShaped's own part of it:

- Editor version pinned to **1.1.1** (done 2026-09-29, all sites). **1.1.2** is released but not
  deployed: photos capped at 1600 px / 600 KB. Pin it once the console is deployed.
- The shared photo bucket (checklist step 1.5, once for all sites); uploads answer 503 until then.
  Nothing StoryShaped-specific: it uploads under `sites/storyshaped/`.
- **The production domain is still not recorded.** Once known: Amplify → Domain management, then
  the records it lists at the registrar. The site sends no email, so no SES records.
- Click-to-edit marks are on console Pages (each section), Library entries (the article; images in
  the body drag to size) and Home (each block opens the page layout).

## Go-Live gate (decided 2026-09-30)

`preview` merges into `main` only when both hold: the AWS setup in DEPLOY-MAP.md is in place (Amplify
`main` and `preview`, both Lambdas, Neon branch, deploy role), and Chris has confirmed the editor holds.
The merge sets `UTILITY_ICONS_VISIBLE = false`; Shop stays out of the nav. Then Amplify builds `main`,
it is verified on Amplify's own address, DNS moves, and Vercel and Railway retire once it holds.

"The editor holds" means each of these passes on the Preview Site with no error:

1. Sign-in: a fresh private window at `/preview` reaches the console sign-in and returns with the editor
   open; a second tab opens signed in.
2. Every entry has real content: Pages (Home, Meet the Artist, Library, Shop) with the 35 Library
   entries under them; Theme; Site header and footer (menu, four links); Page layouts (Home) with the
   Glossary (130 terms) under them; Inventory opens its page; Listings may be empty.
3. Edit round trip: one word in Home's Our Story shows on the page while typing, the panel says Saved,
   it survives a reload, To the Developer reports 1 change not yet pushed, Push to Production turns it
   to Everything is live and a private window shows it; then it is changed back.
4. Click-to-edit opens the right document from a Home Section, a Glossary card, a Library entry, and the
   header or footer.
5. Theme: every field applies visibly and reverts: heading font, body font, and per mode (blacklight,
   daylight) background, accent, text, quiet text, glow colour, glow strength, glow reach, glow movement.
6. Phone width (about 400 px): the panel drags and scrolls, and one edit saves.

Out of scope for the gate: how things look (heading sizes, glow levels, the moved artist photos) and any
Section type other than Card.

## To-Do

**E1. Hosting: migrate Railway (backend) and Vercel (frontend) to AWS.**
- Two environments, both shareable with Whitney: **production** from `main`,
  and a **preview** from a designated preview branch (today that role is played
  by the head of the branch chain above).
- Each needs its own `DATABASE_URL` and `VITE_API_URL`; the latter is baked in
  at build time, so each environment builds separately.
- Keep Railway/Vercel running until AWS production is verified, so cutover is a
  DNS switch that can be reversed. Neon stays as the database.
- **Hosting layout (decided 2026-09-27):** frontend and its images on Amplify,
  built from GitHub (images stay in `frontend/public/assets/` for now); backend
  on a Lightsail instance (~$5/mo), because Etsy/eBay tokens are file-persisted
  (`utils/*TokenStorage.js`) and Lambda or a Lightsail container would lose them;
  database stays on Neon; domain and DNS stay at Porkbun, pointed at Amplify.
- **Preview (decided 2026-09-27):** a long-lived `preview` branch on Amplify,
  password-protected, replaces the stacked branch chain once it exists. Its
  backend is a second process on the same Lightsail instance, against a Neon
  branch. See `docs/adr/0001-host-on-aws-amplify-and-lightsail.md`.
- Open: who holds the AWS account.
- **Superseded 2026-09-27 by `docs/adr/0005-free-first-hosting-stack.md`:** the
  backend goes to Lambda, not Lightsail, once the Etsy/eBay tokens move into Neon;
  logins use Neon Auth; uploaded photos go to S3. The Lightsail bullets above are
  kept for history. The admin console is shared with other client sites
  (`docs/adr/0006-shared-admin-console.md`).
- **Why AWS (decided 2026-09-27):** Vercel Hobby is non-commercial only and
  Railway Hobby is aimed at personal projects; this is a business site. The move
  is a compliance requirement, so it is on the Go-Live path.
- **Go-Live scope (decided 2026-09-27):** only the frontend moves before Go-Live.
  Production calls no Railway backend. Not by leaving `VITE_API_URL` unset:
  `lib/api.js` then falls back to `http://localhost:3000`, which a visitor's
  browser may meet with a local-network permission prompt (unverified). Built
  with `VITE_API_URL=none` instead (`lib/api.js` exports `HAS_BACKEND`; Library
  and Shop skip their fetches, `apiFetch` throws);
  Library view counts fall back to the visitor's browser (`Library.jsx` catches
  the failed fetch). The backend moves to AWS with the inventory work.
- **`/shop` hidden from the nav for Go-Live** (it calls the backend). Separately,
  `pages/Shop/index.jsx` fetches `/api/etsy/mock-listing` but the route is
  `/api/mock/etsy/mock-listing`, so that call already 404s.

**E2. In-house page editor (replacing the planned TinaCMS).**
- Review TinaCMS limitations against what this site needs (Git-backed content,
  editing the Library Markdown and Home copy, the daylight/blacklight photo
  pairs, auth for Whitney as a non-developer). Record the findings, including
  any rejected reasons, before deciding.
- Then outline a project plan for an in-house editor: scope, content model,
  storage (repo vs Neon), auth, preview flow into the E1 preview environment.
- **TinaCMS rejected (2026-09-27):** the client found its editing UI unusable,
  and it cannot carry the site's branding. Storage and auth (Neon, Neon
  Auth) are in `docs/adr/0005-free-first-hosting-stack.md`. The editor is now a
  console shared with LiveSpiritSeeds and future sites:
  `docs/adr/0006-shared-admin-console.md`.

**E3. Inventory API: finish Phase 1 and wire to marketplaces.**
- Verify the Track A API end to end against Neon (still unverified).
- ~~Add the admin-auth gate on `/api/inventory/*` and `/admin/inventory`.~~
  **Built 2026-09-29:** both need a console sign-in for this site
  (`backend/server/utils/requireEditor.js`, console `GET /me`).
- Wire to Etsy and eBay: OAuth and token validation exist in `server.js`;
  listing sync and sale webhooks do not. A sale should enter through the single
  `PATCH /items/:id/quantity` endpoint (Track A decision).
- **Field ownership (decided 2026-09-27):** the site owns count, SKU, price,
  title, description and photos and pushes them to both Marketplaces; category,
  shipping profile and tags stay on each Marketplace for now. The goal is for
  the site to own everything: today every edit is made twice, on Etsy and on
  eBay, which is slow and error-prone. Once a field is owned here, Marketplace
  edits to it are overwritten, so Whitney (who edits on Etsy today) moves her
  edits here. Reconciliation waits until the wiring is complete.
- **Tags and categories are site-owned (2026-09-29, user's instruction),**
  reversing the line above for those two; shipping profile stays on each
  Marketplace. `docs/adr/0008-listings-are-console-documents.md`.

**E4a. Merge items and components into one Stock Item table (decided
2026-09-27, `docs/adr/0002-one-stock-item-table.md`).** Components are sold on
their own with their own SKUs, so they cannot live in a separate table. Must
land before E6's backfill. **Built 2026-09-29** on `preview`: `stock_items`,
`stock_bom`, `stock_movements` in `backend/server/utils/stock.js`, routes under
`/api/inventory/stock`, admin page rewritten; tested against PGlite, not yet
against Neon. Gated by a console sign-in since the same day (E3).

**E4. Components tracked on every product.** New and existing products are
built from components that must be tracked. The schema for this already exists
(`inventory_components` + `inventory_bom`); the work is entering a BOM for every
product, including the backfilled ones from E6.

**E5. Inventory columns: Previous, Calculated, Actual.**
- **Previous**: quantity before the last change. **Calculated**: what the system
  derives from Previous and the recorded sales/decrements. **Actual**: a
  physical count that, when entered, overrides Calculated.
- **Decided 2026-09-27** (terms in `CONTEXT.md`): Previous is the last Physical
  Count; Calculated is derived from Previous plus the adjustment log, never
  stored as typed input; entering Actual (any time, not on a schedule) logs a
  Count Correction row for Actual minus Calculated and becomes the new Previous.
  Applies to items and components. Quantities are whole numbers today (beads)
  but must accept decimals: components already are `NUMERIC(12,3)`, items are
  `INTEGER`.
- **Built 2026-09-29:** Previous lives on the item (`counted_quantity`,
  `counted_at`); Calculated is `quantity`, moved only by `stock_movements`
  rows; a Count Correction is a movement of kind `count`. Every quantity is
  `NUMERIC(12,3)`.
- **Gap found (closed 2026-09-29 by the Stock Item tables):** `inventory_adjustments` has only `item_id` and `INTEGER`
  columns, and the BOM decrement in `PATCH /items/:id/quantity` updates
  component stock without logging it. Calculated cannot be derived for
  components until component changes are logged too, with decimal deltas.

**E6. Backfill existing inventory from Trunk.** Trunk app:
`https://app.trunkinventory.com/inventory`. Trunk has no API, so data comes via
an export or a scrape; which one is possible is **unverified**. Map Trunk fields
onto Stock Items and BOMs.
- **Model before import (decided 2026-09-27):** build the models that can hold
  everything Etsy, eBay and Trunk know about each item before importing
  anything, so Reconciliation is possible later without re-importing.
  Shape: Listings with per-Variation links to Marketplace Listings, plus raw
  Import Snapshots (`docs/adr/0004-site-owns-listing-shape.md`). Both
  Marketplaces use variations today, with different rules. Every Variation is
  its own SKU. Price lives on the Variation, with an optional per-Marketplace
  override.
- **Listing model built 2026-09-29** as the console's `listing` type
  (`docs/adr/0008-listings-are-console-documents.md`): photos labelled Light or
  Dark (a missing one warns at Publish; the toggle then filters the photo
  there is), shop section, Etsy category path, eBay
  category id, up to 13 tags, materials, who and when made, supply flag, and
  Variations each with option, SKU, price and an eBay price. Not yet deployed
  to the console or reloaded on Manage; nothing imported.
- **Etsy reviewed 2026-09-29 (public shop only):** 619 active listings in 18
  shop sections; 5 to 8 photos each (daylight, blacklight, half-and-half,
  scale); categories are Etsy paths such as `Jewelry < Rings < Statement Rings`
  and `Craft Supplies & Tools < Beads, Gems & Cabochons < Beads`; variations
  seen: ring size (5 to 10+ US), bead lot quantity. Tags and SKUs are not
  public: they need Trunk or the Etsy API.
- **Trunk reviewed 2026-09-30 (list view only), signed in as Whitney's organization:** no export
  anywhere (Settings has Account, Organization with only a name and a delete button, and Billing),
  and the list loads no JSON over HTTP (likely a websocket; **unverified**). The Inventory list is
  42 pages of about 12 rows: title, SKU, stock, and per-Marketplace linked-listing counts. Some rows
  carry a variant count (15, 17, 14) with a disclosure; clicking it, and clicking a row, changed
  nothing through browser automation, so variant rows and any item detail are **not yet read**.
  SKUs use `#` placeholders for variants (`10mmSqRing_###`).
- **Trunk read in full 2026-09-30** through its own app's data store (not its API directly, which
  needs the app's sign-in token): **496 products, 2,043 variants**, every variant with its own SKU,
  none repeated, none with components. Saved as `trunk.json` in Chris's Downloads (not committed:
  business data). A variant carries name ("Size: 7"), SKU, properties, on-hand and available counts.
  Dry run of `importTrunk` against PGlite: 2,043 Stock Items created, 18,658 units, no invalid
  rows. **Not loaded:** the Stock Item code is not on a deployed backend yet; then
  `API_URL=... EOTM_TOKEN=... node backend/scripts/import-trunk.mjs trunk.json`.
- Listings from Trunk would be drafts only (title, Variations and SKUs): Trunk has no price,
  section, category, tags or photos. Complete Listings need the Etsy API.
- **Trunk syncs with Etsy and eBay today** (user report, **unverified**). If it
  syncs quantity, it and the site would both write counts to the Marketplaces
  once the site starts pushing, so Trunk's sync must be switched off the day
  the site takes over.

**E7. Resolve all formatting issues.** The full list is not enumerated yet.
Known open: #47 (blacklight green), #40 (Our Story truncated), #6, and #36/#37
awaiting Whitney's sign-off. #38, #39, #41, #42 are blocked on her (Track D).

**E8. Light/Blacklight image index.** Future uploads need an index recording,
per image, its daylight and blacklight versions, so the toggle is applied from
data rather than by hand-pairing paths in `UvPhoto` calls. Should feed the
`resize_asset.py` pipeline and the E2 editor's upload flow.
- For Listings this is the console `photos` field's Light / Dark index (E6,
  ADR-0008): the nth Light pairs with the nth Dark.

**E9. Design review with AI tools.** Evaluate design applications/AI agents to
punch up the design within the current template parameters: the one-hue ramp
per mode (`--bone`/`--accent`/`--muted`), the glow tokens, and the logo anchoring
rules in `AI_CONTEXT.md` Known Traps. Output is proposals for Whitney, not
direct edits.

## Timetable (proposed, not agreed)

Four days cannot hold all of E1 to E9. Proposed split: go-live carries what a
public, shoppable site cannot launch without; the rest follows.

| Date | Work |
|---|---|
| Sun 09-27 | E1 AWS decisions + both environments stood up; E7 list enumerated |
| Mon 09-28 | E3 end-to-end verify + auth gate; E5 schema designed and migrated |
| Tue 09-29 | E6 Trunk backfill (needs the URL); E4 BOMs for backfilled items |
| Wed 09-30 | E7 fixes Whitney has signed off; preview review with her; E1 production verified on AWS |
| Thu 10-01 | **Go-live:** DNS cutover to AWS production; Railway/Vercel kept as fallback |
| After | E3 Etsy/eBay sync, E2 TinaCMS review + editor plan, E8 image index, E9 design review |

**Risks to the date:** E1 is the largest item and the one that can take the
site down; if AWS is not verified by 09-30, go live on the existing
Railway/Vercel hosting and migrate afterwards. E6 is blocked until the Trunk URL
arrives. E7 depends on Whitney's turnaround.

---

# Do Not Repeat (all tracks)

- Whitney's notes doc renders to canvas in the normal Google Docs editor, so
  `get_page_text` on `/edit` returns only chrome and no body text. Read
  `/mobilebasic` instead. `WebFetch` still 401s either way.
- The `boards.ps1` helper shipped with the `boards-local` skill casts the whole
  filename to `[int]`, so it throws on this repo's `<id>-<slug>.md` items. Edit
  `.boards/items/*.md` directly, matching the existing frontmatter.
- Do not round-trip those item files through `Get-Content`/`Set-Content` in
  Windows PowerShell to do bulk text edits — the default read encoding mangles
  em-dashes into `â€"` and `Set-Content -Encoding UTF8` then bakes the mojibake
  in. Use `[System.IO.File]::ReadAllText(path, [Text.Encoding]::UTF8)`.
- **Don't verify a CSS transition by reading `getComputedStyle` in the automated
  browser.** The driven tab reports `visibilityState: "hidden"`, so transitions
  never tick and computed style freezes at the value it held when the change
  started — a toggle-driven colour change reads as "stuck on the old colour"
  when the page is fine. Same trap inside an iframe probe. Verify mode-dependent
  styling with a **fresh page load in each mode** (set `localStorage` key
  `sss-uv-mode`, reload, read), where no transition is involved.
- The `title:` line in a board item is unquoted, even when it contains a colon.
  A line-by-line regex parses these files, not a YAML library, so quotes end up
  as part of the title string.
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
