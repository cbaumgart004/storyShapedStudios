# SEO and AI visibility: storyshapedstudios.com and the Etsy shop

Published for review as a [Google Doc](https://docs.google.com/document/d/1qnWFUrD73QaRS2IGcRzScJ7fSvQh9ZjZ9LUTpssRRJw/edit).
This file is the source of truth; edit here and republish.

Two goals that look like they conflict and do not: **keep AI companies from training on Whitney's
work**, and **get her found by Google and by AI assistants** (ChatGPT, Claude, Perplexity, Gemini,
Copilot). Training and answering are done by different crawlers, so each can be told separately.

**Priority: the website first, then Etsy.** Her own site is the one place that can carry the AI
opt-out and the original writing AI assistants cite; Etsy can do neither.

Verified means read from this repo or the console repo, or observed against the live site.
Everything else is marked **unverified**. The same AI-training treatment is applied to Spirit Seeds.

## The problem in one paragraph

Search engines and AI assistants cannot see sales volume. They rank what they can read: the words on
pages, how well those words match the question, and how often other sites mention and link to the
shop. A shop whose **name** contains the words people type ("atomic", "jewelry") gets a head start on
every query containing them, and a competitor with a crawlable website of text pages gets cited by
AI assistants while a shop that exists mainly as Etsy listings does not.

### StoryShaped against AtomicJewelryStore (read from both Etsy shop pages, 2026-11-02)

| | StoryShapedStudios | AtomicJewelryStore |
|---|---|---|
| Sales, reviews, years | 20,751, 5.6k, 7 | 4,442, 2k, 3 |
| Active listings | 608 | 241 |
| What they are | About half supplies: beads 167, gems and cabs 88, vintage glass and supplies 59 | Almost all finished jewelry: rings 119, pendants 49, earrings 31 |
| Listing titles | Lead with material or era: "Sterling Blue Uranium Glass Ring...", "4ct Sterling 925 YAG Necklace...", "Vintage Uranium Glass Necklace Pendant..." | Every one leads with "Uranium Glass Ring / Earrings / Pendant" and ends "that glows under black / UV light" |
| Own website | storyshapedstudios.com | AtomicJewelryStore.com, announced in the shop |
| Announcement, policies | Last updated Jan 2021; About still says "I am excited to build up my Etsy shop!" | Announcement updated Feb 2026 |

What this shows, as inference from the two pages (Etsy does not publish its ranking):

- **Etsy ranks listings, not shops.** Most of Whitney's 20.8k sales are $3 to $6 beads. They lift
  the shop's reputation but give her rings and necklaces little sales history of their own, while
  each Atomic ring competes on a long record of ring sales.
- **Atomic's titles match the search word for word.** A buyer types "uranium glass ring" or "glows
  under blacklight"; Atomic's titles open with the first and close with the second. Whitney's open
  with "Sterling", "Vintage" or a carat weight, so the phrase that matches sits later or is split.
- **AI assistants see a jewelry store with its own site and a name that is the query.** "Atomic
  jewelry" is a common way to search for uranium glass jewelry, and that is the shop's name and
  domain. StoryShaped reads, from outside, as a bead and supply shop that also makes jewelry.

## How the site is served to crawlers (verified)

The Amplify app does not serve `robots.txt`, `sitemap.xml` or page addresses from this build. Its
rewrite rules send them to the Edge of the Map console API, which answers per site:

- **Pages are already pre-rendered, live.** `GET /api/sites/storyshaped/page/<path>` returns this
  build's `index.html` with the page's title, description, canonical, Open Graph tags, JSON-LD
  (Library entries as `Article`) and its words in a `<noscript>`, so crawlers that run no JavaScript
  read the content. A published edit reaches crawlers within the five-minute edge cache, **with no
  rebuild and no webhook** (console `api/prerender.js`). Observed 2026-11-02: `/library` and
  `/meet-the-artist` on preview and production carry their own titles and the pre-rendered words.
- **`sitemap.xml`** lists every published page, Library entries included, with publish dates.
- **`robots.txt`** comes from the console. A preview address gets disallow-all, so previews stay out
  of search.

A static `robots.txt` or `sitemap.xml` in `frontend/public/` is never reached; do not add one.

## AI training reservation

| Layer | What it does | Where |
|---|---|---|
| Footer line | Human-readable notice on every page | `frontend/src/components/SiteFooter.jsx` |
| `robots.txt` | Asks named training crawlers to stay out entirely, when the site's schema sets `robots.blockTraining` | console `api/handler.js`, list `TRAINING_CRAWLERS` in `schema/schema.js`, flag in `schema/sites/storyshaped.json` |
| TDM Reservation Protocol | Machine-readable opt-out (`tdm-reservation` meta + `/.well-known/tdmrep.json`). The EU copyright directive (Art. 4) treats a machine-readable reservation as binding on text-and-data mining | `frontend/index.html`, `frontend/public/.well-known/tdmrep.json` |
| `noai, noimageai` meta | Informal convention; some crawlers honour it, Google ignores it | `frontend/index.html` |

**Blocked:** GPTBot, ClaudeBot, anthropic-ai, Google-Extended, Applebot-Extended, CCBot,
Meta-ExternalAgent, FacebookBot, Bytespider, cohere-ai, cohere-training-data-crawler, Amazonbot,
Diffbot, omgili, Timpibot, ImagesiftBot.

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

`/.well-known/tdmrep.json` is served on preview through the console's `/_static/` redirect
(observed 2026-11-02). Production serves it once the `production` branch carries this commit.

## Tracking AI access

Possible, two ways. **Amplify access logs** (Amplify console → the app → Hosting → Monitoring →
Access logs) carry each request's user agent, so counts per crawler (`GPTBot`, `ClaudeBot`,
`OAI-SearchBot`, `PerplexityBot`, `ChatGPT-User`...) per page are a filter over the CSV. Or the
console's page route, which every page request passes through on a cache miss, could count crawler
user agents the way its visitor traffic already skips robots. Either shows who **asked**, and whether
blocked crawlers keep requesting pages anyway. Neither shows what a crawler did with a page, and user
agents can be faked. **Unverified:** the log retention window, and whether Amplify forwards the
crawler's user agent to the console on its rewrites. Neither is built yet.

## Website: done

- Pre-rendered pages, per-page titles and descriptions, `Article` JSON-LD for Library entries, and a
  sitemap of every published page: the console, above.
- Default title and meta description that name the product ("handmade uranium glass jewelry").
- Open Graph and Twitter card defaults, so shared links render with a title and image.
- `OnlineStore` structured data linking the site to the Etsy, eBay, Facebook and Instagram profiles
  (`sameAs`). This is how Google and AI assistants learn that all of them are one business.

## Website: next steps, in order of payoff

1. **Fill in "Search and sharing" on each page in the console**: a description written for the page,
   and a share image. Without one the pre-render uses the words under the page's heading.
2. **Register with Google Search Console and Bing Webmaster Tools**, submit
   `https://storyshapedstudios.com/sitemap.xml`. Bing's index feeds ChatGPT search and Copilot, so
   Bing matters more than its search share suggests. Validate a Library entry in Google's Rich
   Results Test.
3. **Answer the questions buyers ask, on the site, in plain text.** "Is uranium glass jewelry safe
   to wear?", "Why does uranium glass glow?", "How to tell real uranium glass from glowing resin."
   Short direct answer first, detail after. This is the format AI assistants quote.
4. **Product structured data** (`Product`, price, availability) on shop pages once inventory is live.
5. **Link from Library entries to the matching Etsy listings**, and from the site to Etsy generally.

## Etsy: steps for Whitney (no code; done in Shop Manager)

Etsy search matches the words in titles, tags, attributes and categories, then ranks by listing
quality (clicks, favourites, sales per view), shop quality (reviews, completed policies and About
section) and shipping price. Volume helps only through those signals.

**Shop level**

1. **Shop title** (the one-line tagline under the shop name): Google indexes it. Make it descriptive:
   "Handmade Uranium Glass Jewelry and Vintage Czech Uranium Glass Beads".
2. **Refresh the announcement and policies** (both last updated Jan 2021) and the About text ("I am
   excited to build up my Etsy shop!" reads as 2019). Lead the About with what she makes; link the
   website there.
3. **Shop sections named the way buyers search**: "Uranium Glass Necklaces", "Uranium Glass
   Earrings", "Vintage Czech Uranium Beads".
4. **Website link** in the About section to storyshapedstudios.com. **Unverified:** which link
   placements Etsy currently allows.
5. **Star Seller** status and **free US shipping on orders of $35+** (Etsy gives that a ranking
   boost in the US).

**Every listing**

1. **Title, finished jewelry first:** open with "Uranium Glass" and the item type, then what makes
   it different, then the glow: "Uranium Glass Ring Blue Sapphire Color Oval in 925 Sterling Silver,
   Glows Under Blacklight". Move "Sterling", "Vintage" and carat weights after the item type. Start
   with the rings, necklaces and earrings, where Atomic outranks her. Etsy's current guidance
   favours short, readable titles over comma-stuffed ones; no repeated words.
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

## Withdrawn

- **"Prerender at build time, rebuild on publish through an Amplify webhook."** Withdrawn
  2026-11-02: the console already pre-renders every published page on request, so neither a build
  step nor a webhook is needed.
- **Static `robots.txt` and `sitemap.xml` in `frontend/public/`.** Withdrawn 2026-11-02: Amplify's
  rewrites send both paths to the console, so the files were never served.

## Sources

- [Value Added Resource: Etsy expands AI training rights over seller content](https://www.valueaddedresource.net/etsy-expands-ai-training-rights/)
- [Digital Commerce 360: Etsy AI policy, 26 Oct 2026](https://www.digitalcommerce360.com/2026/10/26/etsy-ai-policy/amp/)
- [PPC Land: Etsy requires one unaltered photo per listing](https://ppc.land/etsy-forces-sellers-to-show-one-unaltered-photo-in-every-listing/)
