# Project Instructions

## Project

**StoryShapedStudios**

This website hosts information about Uranium Glass, and serves as a locally hosted marketplace with a complete inventory system that updates components used in crafting sales items, and serves as the source of truth via API for etsy and ebay.

Primary users:
- None documented yet.

Main technologies:
- React
- PostgreSQL coming soon

## Before Making Changes

0. Read existing project docs first: `README.md`.
1. Read `docs/AI_CONTEXT.md`.
2. Read `docs/CURRENT_WORK.md`.
3. Use `docs/AI_CONTEXT.md` as the orientation map (layout, components, API, known traps).
4. Read actual source files before editing them.
5. Do not read the entire repository unless the task requires it.

## Working Rules

- Prefer the smallest viable change.
- Avoid unrelated cleanup or new abstractions.
- Preserve existing conventions.
- Do not change public APIs, database schemas, routes, or contracts silently.
- Never commit secrets, credentials, tokens, or local configuration.
- Do not commit or push unless explicitly requested.
- Review `git diff` before committing.
- Include relevant documentation updates in the same commit as the code change.
- Do not commit generated Repomix context files.
- Report what was changed, tested, and not verified.

## Claude in Chrome

Keep browser work compact:

- Load every chrome tool expected for the task in **one** `ToolSearch` call. Never one call per tool.
- Prefer `browser_batch` for any sequence of two or more browser actions.
- Prefer `find` and `get_page_text` over screenshots and full `read_page` dumps. Take a screenshot only when the visual itself is the deliverable.
- Always pass a `pattern` filter to `read_console_messages` and `read_network_requests`.
- After a browser task completes, compact the context before moving on to unrelated work.

Visual verification — propose, don't drive:

- Do **not** open the browser to visually review a change on the user's behalf. Before any DOM-level visual review of a revision, stop and ask.
- Instead, propose a **visual test plan**: what to look at, at which viewport(s), and the specific pass/fail criteria for each item. Let the user run it or approve driving the browser.
- Failures are different: when something breaks (build, script, test, browser action), resolve it automatically. Do not ask permission to fix a failure — fix it and report what happened.

## Common Commands

Install or restore:

```powershell
npm install
```

Run:

```powershell
npm run dev
```

Build:

```powershell
[COMMAND NOT DOCUMENTED]
```

Test:

```powershell
[COMMAND NOT DOCUMENTED]
```

## Editor rules (Spirit Seeds, StoryShapedStudios, Edge of the Map)

These hold across all three repos. The Edge of the Map console is the editor for every site.

- **EVERYTHING IS REACHABLE IN THE EDITOR. NO EXCEPTIONS.** Every element and every setting on any of
  these sites, at any time, can be read and edited through the Edge of the Map console: words, pictures,
  layout, sizes, spacing, backgrounds, and anything drawn only by CSS (a pseudo-element or a variable
  counts). If a visitor can see it, the editor reaches it: a field or a class in
  `console/schema/sites/<site>.json` (Edge of the Map), marked on the page, or it is removed. A look
  hard-coded in CSS with no path from the editor is a defect, not a shortcut, and a change that adds one
  is not finished. If a change cannot make something reachable, say so in the same reply. Content shown
  on one document but owned by another (an event on a banner slide) carries `data-eotm-from` so Edit
  opens the owner.
- **Desktop edits reach every resolution.** A layout set on desktop applies to tablet and phone
  unless those modes have their own layout. Review a layout change at all three widths.
- **Layout across modes.** When a layout change is saved and the user has not set all three modes
  (desktop, tablet, phone), the editor asks how the others behave: **Scale smoothly** (default, on)
  or **Custom** (the user sets the layout in all three).
- **Save scope on layout elements.** Every save on a layout element offers: **this element only**,
  **all elements with this class**, or **save as a new custom template**.
