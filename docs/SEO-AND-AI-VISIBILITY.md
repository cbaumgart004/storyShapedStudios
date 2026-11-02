# SEO and AI visibility: storyshapedstudios.com and the Etsy shop

Two goals that look like they conflict and do not: **keep AI companies from training on Whitney's
work**, and **get her found by Google and by AI assistants** (ChatGPT, Claude, Perplexity, Gemini,
Copilot). Training and answering are done by different crawlers, so each can be told separately.

Verified means read from this repo or observed in a build. Everything else is marked **unverified**.

## The problem in one paragraph

Search engines and AI assistants cannot see sales volume. They rank what they can read: the words on
pages, how well those words match the question, and how often other sites mention and link to the
shop. A shop whose **name** contains the words people type ("atomic", "jewelry") gets a head start on
every query containing them, and a competitor with a crawlable website of text pages gets cited by
AI assistants while a shop that exists mainly as Etsy listings does not. **Unverified:** why Atomic
Jewelry specifically ranks first. One web search did not find it under that name; send the shop URL
and the exact searches where it beats Whitney, and the comparison can be made properly.

## AI training reservation (done in this repo)

| Layer | What it does | Where |
|---|---|---|
| Footer line | Human-readable notice on every page | `frontend/src/components/SiteFooter.jsx` |
| `robots.txt` | Asks named training crawlers to stay out entirely | `frontend/public/robots.txt` |
| TDM Reservation Protocol | Machine-readable opt-out (`tdm-reservation` meta + `/.well-known/tdmrep.json`). The EU copyright directive (Art. 4) treats a machine-readable reservation as binding on text-and-data mining | `frontend/index.html`, `frontend/public/.well-known/tdmrep.json` |
| `noai, noimageai` meta | Informal convention; some crawlers honour it, Google ignores it | `frontend/index.html` |

**Allowed on purpose:** Googlebot, Bingbot, Applebot, `OAI-SearchBot` and `ChatGPT-User` (ChatGPT
search and browsing), `Claude-SearchBot` and `Claude-User`, `PerplexityBot`. Blocking these would
remove her from AI answers, which is the opposite of the SEO goal.

**`Google-Extended` is blocked and costs nothing in search.** It controls Gemini training only;
Google Search and AI Overviews use Googlebot. Same for `Applebot-Extended` versus `Applebot`.

**Limits, stated plainly:**

- `robots.txt` and the meta tags are requests. Reputable crawlers comply; some (Bytespider has been
  reported repeatedly) do not. Nothing short of blocking at the CDN stops a non-compliant crawler.
- Content already collected before today is not recalled.
- None of this touches **Etsy**. Etsy's updated terms let Etsy and authorized third parties train on
  seller-uploaded content, and reporting found no general opt-out for US sellers
  ([Value Added Resource](https://www.valueaddedresource.net/etsy-expands-ai-training-rights/)).
  **Unverified:** whether Etsy's Privacy Policy now offers one. Check Etsy → Account settings →
  Privacy before assuming not. The practical response is to make **her own site** the canonical home
  of her writing (Library, story, process) and keep Etsy listings to product facts.

**Unverified:** that Amplify's SPA rewrite rule serves `robots.txt`, `sitemap.xml` and
`/.well-known/tdmrep.json` as files rather than rewriting them to `index.html`. The build puts all
three in `dist/` (verified). After deploy, open each URL and confirm it is not the site's HTML.

## Tracking AI access

Possible, from **Amplify access logs** (Amplify console → the app → Hosting → Monitoring → Access
logs). Each request carries its user agent, so counts per crawler (`GPTBot`, `ClaudeBot`,
`OAI-SearchBot`, `PerplexityBot`, `ChatGPT-User`...) per page are a filter over the CSV. That shows
who **asked**, and whether blocked crawlers keep requesting pages anyway. It cannot show what a
crawler did with a page, and user agents can be faked. **Unverified:** the retention window and
export format of Amplify access logs in this account. A small script to tally a downloaded log is a
reasonable next step; it is not written yet.

## Website: done in this repo

- Title and meta description that name the product ("handmade uranium glass jewelry").
- Canonical URL, Open Graph and Twitter card tags, so shared links render with a title and image.
- `OnlineStore` structured data linking the site to the Etsy, eBay, Facebook and Instagram profiles
  (`sameAs`). This is how Google and AI assistants learn that all of them are one business.
- `sitemap.xml` with the fixed routes.

## Website: next steps, in order of payoff

1. **Prerender the pages.** The site is a client-rendered React app: the HTML a crawler receives is
   an empty `<div id="root">` until JavaScript runs. Googlebot runs JavaScript (slowly, in a second
   pass); **most AI crawlers do not**, so today ChatGPT, Claude and Perplexity see almost nothing
   beyond the `<head>` added above. Prerendering each route to static HTML at build time is the
   single biggest change for AI visibility. It is a build change with a trade-off (console edits
   appear to crawlers only after a rebuild), so it needs its own decision.
2. **Put the Library in the sitemap.** Generate `/library/<slug>` entries at build time. The Library
   is the strongest asset here: original, researched uranium glass content is exactly what AI
   assistants cite.
3. **Per-page descriptions.** `SitePage.jsx` sets the title per page but every page shares the home
   description.
4. **Register with Google Search Console and Bing Webmaster Tools**, submit the sitemap. Bing's index
   feeds ChatGPT search and Copilot, so Bing matters more than its search share suggests.
5. **Answer the questions buyers ask, on the site, in plain text.** "Is uranium glass jewelry safe
   to wear?", "Why does uranium glass glow?", "How to tell real uranium glass from glowing resin."
   Short direct answer first, detail after. This is the format AI assistants quote.
6. **Product structured data** (`Product`, price, availability) on shop pages once inventory is live.
7. **Link from Library entries to the matching Etsy listings**, and from the site to Etsy generally.

## Etsy: steps for Whitney (no code; done in Shop Manager)

Etsy search matches the words in titles, tags, attributes and categories, then ranks by listing
quality (clicks, favourites, sales per view), shop quality (reviews, completed policies and About
section) and shipping price. Volume helps only through those signals.

**Shop level**

1. **Shop title** (the one-line tagline under the shop name): Google indexes it. Make it descriptive:
   "Handmade Uranium Glass Jewelry and Vintage Czech Uranium Glass Beads".
2. **About section, policies, shop announcement, profile photo**: fill every field. Incomplete shops
   are ranked down.
3. **Shop sections named the way buyers search**: "Uranium Glass Necklaces", "Uranium Glass
   Earrings", "Vintage Czech Uranium Beads".
4. **Website link** in the About section to storyshapedstudios.com. **Unverified:** which link
   placements Etsy currently allows.
5. **Star Seller** status and **free US shipping on orders of $35+** (Etsy gives that a ranking
   boost in the US).

**Every listing**

1. **Title:** lead with what it is, in buyer words: "Uranium Glass Necklace, Glows Under Blacklight,
   Handmade Sterling Silver". Etsy's current guidance favours short, readable titles over
   comma-stuffed ones; no repeated words.
2. **All 13 tags**, multi-word phrases, no repeats of words already in the title or attributes:
   "vaseline glass", "atomic jewelry", "glow in blacklight", "uv reactive necklace", "radioactive
   glass gift", "vintage czech glass", "witchy jewelry". Use "atomic" as a tag so her listings
   compete on the term the competitor's name owns.
3. **Attributes and category**: fill every one. Attributes act as extra tags.
4. **First photo**: the clearest thumbnail, ideally a daylight/blacklight pair. Etsy now requires one
   **unaltered** photo of the actual item per listing (Seller Handbook, 22 Oct 2026), so keep
   composites as secondary images.
5. **Description**: first sentence restates the title in plain words; Google uses it as the snippet.
6. **Search terms report** (Shop Manager → Stats → search terms): each month, put the terms that
   bring views but few sales into titles and tags of the right listings.

**Off-Etsy signals (help Google and AI assistants)**

1. Same name everywhere: "StoryShaped Studios" on Etsy, eBay, Instagram, Facebook and the site.
2. Mentions on other sites: uranium glass collector forums and subreddits, maker features, local
   press. AI assistants recommend shops that other sources talk about.
3. Ask happy buyers to leave reviews that mention the item type ("my uranium glass necklace").
4. **Etsy Ads**: a small daily budget on the best sellers, judged from Ads stats after two weeks.
   **Unverified:** whether Etsy listings currently surface in ChatGPT shopping results; if they do,
   the listing title and description above are what it reads.

## Sources

- [Value Added Resource: Etsy expands AI training rights over seller content](https://www.valueaddedresource.net/etsy-expands-ai-training-rights/)
- [Digital Commerce 360: Etsy AI policy, 26 Oct 2026](https://www.digitalcommerce360.com/2026/10/26/etsy-ai-policy/amp/)
- [PPC Land: Etsy requires one unaltered photo per listing](https://ppc.land/etsy-forces-sellers-to-show-one-unaltered-photo-in-every-listing/)
