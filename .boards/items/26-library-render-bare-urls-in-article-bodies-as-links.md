---
id: 26
type: Issue
title: "Library: render bare URLs in article bodies as links"
state: Closed
tags: needs-triage
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Whitney (2026-08-03): "all library card elements currently listed as body text
that contain urls (starting with https:// or http://) should render as links
(text color affected by blacklight toggle)."

Her source doc has 18 bare URLs across 7 articles — EPA, uranglas.ch,
ScienceDirect, NRC, Amazon product links and several dating/identification
resources — all sitting in the prose as plain text.

## Discussion
- 2026-08-03: CommonMark does not autolink bare URLs. The obvious fix is
  `remark-gfm`, but that plugin also switches on tables, task lists and
  strikethrough, which would change how the rest of her copy parses. Instead the
  markdown is preprocessed in `parseSections()`: each bare URL is wrapped in
  CommonMark's own `<...>` autolink syntax, so react-markdown links it with no
  new dependency and no parsing side effects.
- 2026-08-03: The scanning regex consumes any existing `](url)` link or `<url>`
  autolink first and hands it back untouched, so only genuinely bare URLs get
  wrapped. Consuming them beats testing the character before the URL: it means a
  URL written inside plain parentheses — which she does when citing sources —
  still gets linked, while `](` never gets mangled. `)` is excluded from the URL
  character class so a closing paren stays in the prose, and trailing sentence
  punctuation is kept out of the href.
- 2026-08-03: No lookbehind in the regex on purpose — iOS Safari before 16.4
  doesn't support it, and this is a phone-first page.
- 2026-08-03: Rendered anchors get their own `.lib-link` class rather than being
  styled as `.lib-entry a`, because the back link and the prev/next cards are
  also anchors inside the same `<article>`. External links get
  `target="_blank" rel="noopener noreferrer"`.
- 2026-08-03: Colour is `var(--accent)` + the mode's glow, so it tracks the UV
  toggle as asked — measured `#c6e87a` in daylight, `#57ff5e` under blacklight.
  `overflow-wrap: anywhere` was needed: the ScienceDirect and uranglas.ch URLs
  are long enough to push a phone layout sideways otherwise.
- 2026-08-03: Verified at 400px on "Is wearing uranium glass safe?" — all four
  URLs linked, hrefs exact (including the `?via%3Dihub` query string), the EPA
  URL's closing paren left outside the link, long URLs wrapping over 2-3 lines
  with no horizontal overflow (`scrollWidth` 383 = viewport), and the "← Library"
  back link unchanged at `--muted`. The regex was also exercised directly
  against eight shapes: bare, in-parens, sentence-final, existing markdown link,
  existing autolink, query string, and a local image path — all correct.
- 2026-08-03: Glossary cards were left alone; they already render their own
  `gl-links` list from structured data rather than from prose.
- 2026-08-03: [Closed] Shipped on branch library-mobile-update.
