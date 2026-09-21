# SEO playbook

How search work on kirbychanmarkham.com is decided. Written from three practitioner sources:
an indexation case study on location pages, a local SEO teardown of a vibe coded site and a
rank and rent operator interview. It records what we adopted, what we rejected and why.

The site is advertising by a registered Ontario brokerage, so RECO and TRESA rules outrank every
tactic here. Nothing in this file permits an unverified claim.

---

## 1. The test every page has to pass

Before writing a page, answer one question: **what would be missing from Google's index if this
page did not exist?**

If the honest answer is "very little", do not publish it. Google does not decide whether a page is
good, it decides whether the page is worth the storage. That is what the Search Console status
"crawled, currently not indexed" means: read, then turned down. It is a harsher verdict than a
ranking drop, and it is driven by site-wide quality, so thin pages hold back the pages that deserve
to rank.

The corollary is uncomfortable and worth repeating: **every page we publish raises the bar for the
next one.** A site with three location pages gets them all indexed. A site with thirty near
identical ones loses most of them, because page thirty competes with our own previous twenty nine.
Volume is fine only while each new page gets more specific.

A second test, for anything already written: **could a competitor publish a near identical page
tomorrow using the same method?** If yes, the page does not need to exist.

## 2. What we do about it

- `npm run check:thin` lists every built page by word count and fails the build when an indexable
  English page has less than 300 words of body text. Navigation pages (`/`, `/blog/`, category and
  numbered listings, `/videos/`, `/services/`, `/neighbourhoods/`, `/market-reports/`, `/news/`,
  `/client-stories/`, `/map-of-markham/`) are exempt. Translated pages are exempt from the word
  count because Chinese and Japanese have no spaces to count.
- `npm run check:blog` enforces the rest: unique titles and descriptions, length limits, at least
  four H2 sections, at least three internal links, a link to a money page, cited sources and no
  placeholders.
- An empty listing sets `noindex` rather than publishing an empty page. See `src/pages/news/index.astro`.
- Blog category pages stay `noindex` until they hold three posts.

## 3. When a page will not index

In this order:

1. Open Search Console and look at what queries that URL already gets impressions for, even at
   position 90. That is what Google already thinks the page is about. Build on it rather than
   arguing with it.
2. Add what only this business can say: what clients actually ask on the phone, what the team has
   seen in that neighbourhood, figures from a named source with the period stated. Never invent it.
3. If there is nothing true to add, delete the page. Google's own guidance says removing unhelpful
   content can lift the rest of the site.

Two things that do not work and are not worth the time: adding `noindex` to a page that is already
unindexed, which only moves it between reports, and resubmitting or piling internal links onto it.
Neither changes the answer to the question in section 1.

Count the failure rate **per template, not per site**. One page failing is a page problem. Six
failing from the same generator is the generator's problem, and the trend is the signal: a template
steady at 8 per cent is noise, one that jumps to 40 per cent after a change says the change made it
worse. That warning arrives before rankings move.

Indexation is a floor, not a safety net. In a study of 220 sites that scaled AI content, every site
indexed fine, ranked and pulled traffic for 6 to 12 months before being demoted. Passing our checks
means a page is not thin. It does not mean the page is good.

## 4. Local search, in priority order

For a local business the Google Business Profile is the centre of gravity, not the website. Google
and the AI assistants treat the profile as the business entity, so:

1. **The profile comes first.** Its categories and services should cover everything the team wants
   to be found for. An error there misinforms every system that reads it.
2. **The website mirrors the profile.** Service pages should match the profile's services, and
   internal links should follow the same hierarchy rather than linking loosely related pages
   together. Search engines build their picture of the site from the internal links, not from the
   URL structure, so a link between two pages is a claim that they belong together. In practice:
   a blog post or neighbourhood page names its services in `relatedServices`, and the service page
   lists everything that names it. Links run up and down that hierarchy, not sideways between
   unrelated services.
3. **Name, address and phone must match everywhere.** Ours live in `src/data/site.json` and feed the
   `RealEstateAgent` schema in `src/lib/schema.ts`: the real Richmond Hill office, with Markham and
   its neighbourhoods as `areaServed`. Never a fake Markham address.
4. **Say who wrote it.** The author of everything published here is a named registrant with a
   page, a title and profiles elsewhere, not an unattributed brand. `person()` in
   `src/lib/schema.ts` is the `Person` entity and it is the `author` on every post and guide.
5. **Reviews are not replaceable.** No on-site work substitutes for genuine Google reviews from
   clients, ideally mentioning what the work actually was.
6. **Geography has to be real.** When a page names a landmark, park, road or GO station, use ones
   that exist on Google Maps and that the page's own facts support. A list of trivia about a place
   is not local relevance.
7. **Rankings are measured across a map, not from one spot.** A single search from one location
   proves nothing, because proximity is a major factor in map results. Judge progress by whether
   enquiries arrive, and by Search Console impressions for the queries we target.

## 5. Bottom of the funnel first

The pages that pay are the ones people search when they are ready to act. Ours are `/home-valuation/`,
`/downsizing-markham/`, `/sellers/`, `/buyers/` and the service pages. Informational posts exist to
support them and must link to them. `check-blog.mjs` enforces that link.

Specific beats broad. A page about one narrow situation in one place will rank when a general page
will not, and it converts better. Keep adding narrower pages only while each one is genuinely
different. When two ideas are contextually the same, write one page, not two.

## 6. What we rejected

- **Doorway and city pages.** Publishing "service plus city" pages at scale with the place name
  swapped. Google treats these as spam and this site would be an obvious target, with twelve
  neighbourhoods and a translation layer. Our neighbourhood pages exist because each carries its own
  TRREB figures, transit facts and housing stock, and each is reviewed with a date.
- **Rank and rent, tracking numbers and invented brands.** A registered brokerage advertising under
  an invented brand name, or routing calls through a number that is not the brokerage's, would
  breach RECO advertising rules. Everything on this site is published as Kirby Chan & Co. Real
  Estate Team with the brokerage named.
- **Google Business Profile video verification tricks.** Staging a vehicle magnet or tools to pass
  verification is misrepresentation to Google and, for a registrant, a professional conduct problem.
- **Taking images from other sites.** Every photo here is licensed and credited. See
  `src/data/photo-credits.json`.
- **Stripping AI watermarks.** Anthropic watermarks Claude output in the word choices themselves,
  and a detector is expected. Removing it means paraphrasing by hand or swapping Latin letters for
  lookalike characters from other alphabets. The character swaps break the entities on the page,
  which is exactly what Google reads, and mixed script text is itself a spam signal. Provenance has
  been detectable in images since 2023 and has never been what decides rankings. So: write accurate,
  specific, sourced content and leave the watermark alone.
- **A separate AI or "GEO" strategy built on tricks.** Showing up in ChatGPT, Claude, Perplexity
  and AI Overviews follows from the same work as ranking: a clean technical base, accurate
  entities, real local specifics, sourced figures and reviews. What we do on top is small and
  honest, and it is listed in section 7. Nothing there is a trick.

## 7. Answer engines and AI assistants

What an assistant needs is the same as what a careful reader needs, delivered in a form it can lift
and cite. The site does these things, and each one is generated from the content so it cannot drift:

1. **Crawlers are welcomed by name.** `public/robots.txt` names OAI-SearchBot and ChatGPT-User
   (ChatGPT search and browsing), ClaudeBot and Claude-SearchBot, PerplexityBot, Google-Extended,
   Applebot-Extended and Bingbot, and allows each one. Bing also feeds Copilot and ChatGPT search,
   which is why `scripts/indexnow.mjs` pings it on every publish.
2. **`/llms.txt` leads with answers.** Built at `src/pages/llms.txt.ts`. It opens with the quick
   answer from every guide, each with the URL to cite and the date it was updated, then lists every
   guide, neighbourhood and post. `/llms-full.txt` carries the quick answer, every FAQ and every
   source for each guide and post.
3. **Every guide opens with a quick answer** that stands on its own out of context: it names the
   place, the situation and the figures, so a quoted paragraph still makes sense.
4. **FAQs are real questions with complete answers**, marked up as `FAQPage`. An assistant can lift
   a question and its answer together.
5. **Entities are explicit.** The `RealEstateAgent` node carries `knowsAbout`, every guide and post
   carries `about`, the author is a named `Person` with a page and profiles, and the office address
   is the real one in Richmond Hill with Markham as `areaServed`.
6. **Figures are dated and sourced on the page.** Assistants prefer claims they can trace.

What we do not do: hidden text for bots, pages that exist only for assistants, invented "as seen
in" mentions, or any content the reader cannot see.

## 8. Monthly review

1. Search Console, Pages report: compare "crawled, currently not indexed" against last month, and
   group the URLs by what produced them (blog, neighbourhood guide, service, translated page).
2. Search Console, Performance: note queries where we get impressions but few clicks. Those are
   title and description problems, not content problems.
3. Confirm "discovered, currently not indexed" stays low. If it grows, Google's interest in the site
   is falling and the answer is fewer, better pages.
4. Check the Google Business Profile still matches the site's services and hours.
5. Run `npm run verify` and fix anything it reports.
