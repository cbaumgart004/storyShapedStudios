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
2. Add an in-app editor so the user can add/modify entries (currently done by
   editing `library.md`).
3. Significant UI + branding pass across the site.

## Do Not Repeat

- Git Bash mangles a leading-slash arg (e.g. `/library-media`) into a Windows
  path; run the converter with `MSYS_NO_PATHCONV=1` (or from PowerShell).
- `railway up` must run from the **repo root** (backend service root directory
  is `backend/`); deploying from inside `backend/` fails with "Failed to read
  app source directory". `.railwayignore` keeps that upload small.
- `VITE_API_URL` on Vercel must include the scheme (`https://…`) and is baked in
  at build time — needs a redeploy to change.
