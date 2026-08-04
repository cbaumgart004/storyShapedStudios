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
