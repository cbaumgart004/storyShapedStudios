# Current Work

Last updated: 2026-07-21

## Objective

Set up the Library (Uranium Glass knowledge base) from existing Word-document
content and allow the user to add/modify entries over time.

## Branch

`library`

## Current State

- Library is live at `/library`: searchable, with a running numbered index
  (table of contents), inline photos, and a "Most Viewed" panel.
- Content is Markdown at `frontend/public/library.md` (35 entries), served at
  runtime — editable without a rebuild. Photos extracted to
  `frontend/public/library-media/` (82 images), served at `/library-media/...`.
- Daylight/blacklight UV toggle now persists site-wide (localStorage) via a
  shared `UvModeProvider`; Home's nav/footer were extracted into
  `components/SiteHeader.jsx` + `SiteFooter.jsx` and reused on the Library page.
- Backend deploys successfully on Railway.

## Relevant Files

- `frontend/src/pages/Library.jsx` — parses the markdown into sections, search,
  index, and view tracking.
- `frontend/src/styles/Library.css` — sidebar + content layout on Home's tokens.
- `frontend/src/context/UvMode.jsx` — site-wide daylight/blacklight state.
- `frontend/src/components/SiteHeader.jsx`, `SiteFooter.jsx` — shared branding.
- `scripts/docx_to_library_md.py` — re-run to regenerate `library.md` + images
  from an updated Word doc (underlined lines become `##` headers).

## Decisions Already Made

- Library content lives as editable Markdown in `public/`, fetched at runtime
  (no rebuild to edit), rather than baked into JSX.
- "Most Viewed" counts are per-visitor in `localStorage` for now — no backend
  persistence yet.

## Validation Performed

- `npm run build` passes; verified in-browser: search filters index + content,
  index jumps to entries, Most Viewed surfaces top entries, UV toggle persists
  across Library ↔ Home navigation and page reload.

## Next Steps

1. Decide where to persist global view counts (see options in commit discussion);
   candidate: a shared store when PostgreSQL/backend persistence lands.
2. Add an in-app editor so the user can add/modify entries (currently done by
   editing `library.md`).
3. Significant UI + branding pass across the site.

## Do Not Repeat

- Git Bash mangles a leading-slash arg (e.g. `/library-media`) into a Windows
  path; run the converter with `MSYS_NO_PATHCONV=1` (or from PowerShell).
