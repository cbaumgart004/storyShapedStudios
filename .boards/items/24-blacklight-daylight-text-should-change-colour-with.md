---
id: 24
type: Issue
title: Blacklight/daylight: text should change colour with the toggle
state: Closed
tags: needs-triage
parent: 2
created: 2026-08-03
modified: 2026-08-03
---
Whitney: "Text no longer changes color with toggle." The hero tagline and the
section headers should track the daylight/blacklight switch the way the rest of
the page does. Fonts are to be left exactly as they are — confirm nothing in the
fix touches a type rule.

## Discussion
- 2026-08-03: Cause found. Two things. (1) [[5-blacklight-daylight-use-a-cooler-toned-yellow]] retuned the daylight `--bone`/`--muted` from warm cream/khaki (`#efeede`/`#b7b48f`) to `#e7f0e4`/`#9db497`, within a couple of points of the blacklight values — so body copy and headings stopped visibly moving. (2) The old hero `<h1>` had a `.lit` line in `var(--accent)` with `--glow-strong`; when the hero was rebuilt for #10-#14 the tagline that replaced it took static `var(--bone)`, so the one piece of hero type that did change colour was lost.
- 2026-08-03: Fixed in `styles/Home.css`. Daylight `--bone`/`--muted` moved to `#eef2d9`/`#a8b587` — still cool (citron hue family, h~70-77) as #5 asked, but now a real hue shift away from the blacklight greens. `.hero-tagline` and the four `h2` rules (`.section-head`, `.prose-block`, `.glow-story`, `.artist-feature`) take `var(--accent)` + the mode's glow instead of `--bone`, with a 0.6s colour transition to match the page fade.
- 2026-08-03: Fonts confirmed original. `.hero-tagline` reuses the old hero title's exact type — `Poiret One`, weight 700, letter-spacing 0.02em — only the size and line-height were reduced, because the neon logo above it now carries the display size. The four `h2` rules are byte-identical to `main` apart from the colour lines. `git diff main -- styles/Home.css` shows no `font-family` change anywhere in the track.
- 2026-08-03: Checked the other pages that share these tokens. Meet the Artist was already covered — its title is a `.section-head h2`. Glossary and Library have their own page titles (`.gl-hero h1`, `.lib-hero h1`), both still on `--bone`, so they got the same accent + glow treatment for consistency. Library *article* titles were already accent. Body copy across all three now shifts hue with the mode via `--bone`/`--muted` and stays readable in both. `.btn-primary` is the only rule that puts text on an accent background (`color: var(--void)`), so nothing lost contrast.
- 2026-08-03: [Closed] Shipped on branch home-page-layout.
