# Current Work

Last updated: 2026-07-21

## Objective

Set up the Library (Uranium Glass knowledge base) from existing Word-document
content and allow the user to add/modify entries over time.

## Branch

Shipped via PR #1 (merged to `main`). Docs/config follow-up in PR #2
(`docs/library-deploy-notes`).

## Current State

- Library is **live in production** at `/library`: searchable, with a running
  numbered index, inline photos, and a "Most Viewed" panel.
- Content is Markdown at `frontend/public/library.md` (35 entries), served at
  runtime — editable without a rebuild. Photos in `frontend/public/library-media/`.
- Daylight/blacklight UV toggle persists site-wide (localStorage) via a shared
  `UvModeProvider`; Home's nav/footer are shared `SiteHeader`/`SiteFooter`.
- View counts **persist globally in Neon Postgres** via the Railway backend
  (`/api/library/views`), verified end-to-end in production. Frontend falls back
  to localStorage if the API is unavailable.
- Library is now an **index + per-article pages** (branch `library-mk2`):
  - `/library` — index: hero + a browsable numbered list of every entry.
  - `/library/<slug>` — that ONE article on its own **shareable URL**.
  - Both render the same shell: a persistent sidebar (search + Most-viewed +
    Contents rail) beside a single content column, so the reader can hop
    between articles from any page. The open article is marked active in the
    rail; each article has prev/next links and a "← Library" back link.
  - Rendering one article at a time (instead of all 35 in one long column)
    keeps the DOM small and **removed the fragile deep-link scroll code** —
    each entry IS its own short page, so there's nothing to scroll to.
  - Copy-link affordances: a "Copy link" button on the article + a 🔗 icon per
    entry in the Contents rail and the index list (writes
    `<origin>/library/<slug>`, shows a ✓/"Copied!" confirmation).
  - Legacy `/library#<slug>` hash links (older shared / Glossary links)
    **redirect** to `/library/<slug>`; the Glossary index now links to the path
    form directly. View counts still persist to Neon (localStorage fallback).

## Relevant Files

- `frontend/src/pages/Library.jsx`, `styles/Library.css` — the page.
- `frontend/src/context/UvMode.jsx`, `components/Site{Header,Footer}.jsx`,
  `lib/api.js` — shared UI + backend base URL.
- `backend/server/routes/libraryViews.js`, `utils/db.js` — view-count API + DB.
- `scripts/docx_to_library_md.py` — regenerate `library.md` + images from an
  updated Word doc (underlined lines become `##` headers).

## Decisions Already Made

- Library content lives as editable Markdown in `public/`, fetched at runtime.
- Persistence uses **Neon Postgres** (free tier), which also becomes the planned
  inventory DB. `library_views (slug, count)` auto-creates on first request.

## Validation Performed

- Production round-trip verified: page → Railway backend → Neon → back to page
  (Most Viewed reflects DB counts). `npm run build` passes. SPA rewrite works.

## Next Steps

1. **Reconnect Railway ↔ GitHub** (auto-deploy is currently disconnected — the
   backend was last deployed manually via `railway up` from the repo root).
   Until reconnected, backend changes do NOT auto-deploy on merge to `main`;
   run `railway up` from the repo root, or fix the Railway GitHub App
   (github.com/settings/installations → Railway → grant repo access).
2. **Protect all Library text + images as copyrighted / private IP.** Treat the
   knowledge base and photos as the studio's proprietary content: add a visible
   © / all-rights-reserved notice, per-image copyright, and light safeguards
   (e.g. disable right-click-save / drag on library images). Scope + how strong
   the safeguards should be is still TBD.
3. **Social sharing for each article** (Facebook, Twitter/X, email, Instagram).
   Copy-link exists now; add share buttons/intents on each `/library/<slug>`
   page. Caveat: rich link previews want per-URL Open Graph meta
   (`og:title`/`og:image`/`og:description`), and this is a Vite SPA with no SSR
   — crawlers won't see client-set meta tags. Plan a **prerender** step (e.g.
   `vite-plugin-ssg`/prerender, or per-route static HTML) so shared links show
   proper previews. The per-article page structure makes this straightforward.
4. Add an in-app editor so the user can add/modify entries (currently done by
   editing `library.md`).
5. Significant UI + branding pass across the site.

## Do Not Repeat

- Git Bash mangles a leading-slash arg (e.g. `/library-media`) into a Windows
  path; run the converter with `MSYS_NO_PATHCONV=1` (or from PowerShell).
- `railway up` must run from the **repo root** (backend service root directory
  is `backend/`); deploying from inside `backend/` fails with "Failed to read
  app source directory". `.railwayignore` keeps that upload small.
- `VITE_API_URL` on Vercel must include the scheme (`https://…`) and is baked in
  at build time — needs a redeploy to change.
