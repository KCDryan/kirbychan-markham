# TODO checklist

Everything on this site that still needs real information from you. Nothing here has been invented
or estimated. Each item names the exact file to edit.

**Blocking** items must be done before the site is public. They are legal or compliance
requirements, not polish.

---

## 1. Blocking. Do these before launch

| # | What | File | Why it blocks |
| --- | --- | --- | --- |
| 1 | Brokerage legal name, exactly as registered with RECO | `src/data/site.json` &rarr; `brokerage.legalName` | TRESA requires the registered brokerage name in advertising. It currently shows a visible TODO in the footer and on `/contact/` |
| 2 | Registrant disclosure text | `src/data/site.json` &rarr; `brokerage.disclosure` | Same. Supply the wording your brokerage requires |
| 3 | Have a lawyer read `/privacy/`, `/terms/` and `/accessibility/` | `src/pages/privacy.astro`, `terms.astro`, `accessibility.astro` | Written to align with PIPEDA, CASL and AODA, but not reviewed by counsel. Each page says so at the top. Remove that notice once reviewed |
| 4 | Delete or replace the sample case study | `src/content/case-studies/sample-layout-buyer-on-a-deadline.mdx` | It is a layout sample, not a client. It is set to `noindex` and carries a visible warning, but it should not survive launch |
| 5 | Set `LEAD_WEBHOOK_URL` in Cloudflare | Cloudflare dashboard | Until this is set the form refuses submissions and tells visitors to phone. It does not silently lose leads, but it does not deliver them either |
| 6 | Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` | Cloudflare dashboard | Without them there is no spam filtering beyond the honeypot and timing check |

---

## 2. Content and brand

| # | What | File |
| --- | --- | --- |
| 7 | Lofty IDX search URL | `src/data/site.json` &rarr; `links.loftySearch`. Every "Search Homes" button currently falls back to `/contact/` |
| 8 | Booking link | `src/data/site.json` &rarr; `links.booking`. Every "Book a conversation" button falls back to `/contact/` |
| 9 | Social URLs for Instagram, Facebook, YouTube and LinkedIn | `src/data/site.json` &rarr; `social`. Empty ones are hidden rather than linked to nothing. These also populate `sameAs` in the schema |
| 10 | The four homepage stats: years in business, neighbourhoods covered, families helped, average rating | `src/data/stats.json`. All four render a visible TODO badge right now, on the homepage and on `/about/` |
| 11 | Real testimonials with written permission | `src/data/testimonials.json`. Currently an empty array, so the whole section is hidden. Add objects with `quote`, `name` and optionally `context` and `neighbourhood` |
| 12 | Kirby's biography, background and credentials | `src/pages/about.astro` and `src/components/TeamIntro.astro`. Both carry placeholder copy with a visible TODO |
| 13 | Confirm or replace the article publishing plan | `src/pages/articles/index.astro` |

---

## 3. Numbers that need a source

Nothing in this section has been guessed. Every one renders as a visible placeholder until filled.

| # | What | File |
| --- | --- | --- |
| 14 | TRREB median or average price per neighbourhood, plus the source and the period | `src/data/market.json`. Set `source` to `TRREB` and `period` to the month and year. Neighbourhoods left `null` are skipped. If all are `null` the ticker band is hidden entirely |
| 15 | Price range and commute time in the quick stats table, for all 12 neighbourhoods | `src/content/neighbourhoods/*.mdx` &rarr; `quickStats.priceRange` and `quickStats.commute` |
| 16 | The four price bands for all 12 neighbourhoods | `src/content/neighbourhoods/*.mdx` &rarr; `priceBands` |
| 17 | GO stations inside Markham, Unionville GO to Union Station time, community centre count | `src/data/why-markham.json`. Three of the four "Why Markham" figures are TODO. Verify against Metrolinx, the GO timetable and the City of Markham facility list |
| 18 | Publish the first market report | Copy `src/content/market-reports/template.mdx`, fill it in, remove `draft: true` |

---

## 4. Media

| # | What | Where |
| --- | --- | --- |
| 19 | Done | Logo recoloured from kirbychanandco.com is in `src/assets/logo/`. It is a 533 pixel wide raster, so a vector SVG from your designer would be sharper on large screens |
| 20 | Done, could be improved | Headshot from kirbychanandco.com is in place but is only 532 pixels square. A larger original would look sharper |
| 21 | Neighbourhood photography, 12 images | `src/assets/photos/neighbourhoods/<slug>.jpg`. Each replaces that page's placeholder and adds a card thumbnail and share image |
| 22 | Done | Team photo from kirbychanandco.com. Add the second person's name to the alt text in `src/components/Hero.astro` if you want them named |
| 23 | Record the three videos, then add each YouTube ID and transcript | `src/content/videos/*.mdx`. Pages render a labelled placeholder until `youtubeId` is filled |
| 24 | Optional: replace the generated OG image with a designed one, 1200 x 630 | `public/og-default.png` |

**Swapping a placeholder for a real photo needs no code.** Drop the file into `src/assets/photos/`
with the name listed above and commit it. The build makes AVIF and WebP versions, sets width and
height and lazy loads below the fold. The full list of names is in `src/assets/photos/README.md`.

---

## 5. Verification before you call it done

- [ ] `npm run verify` passes with zero errors and zero warnings
- [ ] Lighthouse mobile 95 or better on the homepage, `/unionville-markham/` and
      `/unionville-vs-markham-village/`
- [ ] Every schema type validates in the
      [Rich Results Test](https://search.google.com/test/rich-results): `RealEstateAgent`,
      `BreadcrumbList`, `FAQPage`, `BlogPosting`, `VideoObject`, `Place`
- [ ] Submit the lead form end to end and confirm the lead lands in Lofty through Zapier
- [ ] Submit the lead form with JavaScript disabled and confirm it redirects to
      `/contact/thank-you/`
- [ ] Turnstile visibly appears on the form and a submission with a failed challenge is rejected
- [ ] Test the mega menu and the mobile menu with the keyboard only
- [ ] Test with reduced motion switched on. The market ticker should stop scrolling and show as a
      static list
- [ ] Submit the sitemap at `https://kirbychanmarkham.com/sitemap-index.xml` to Google Search
      Console
- [ ] Confirm `_redirects` works by visiting `https://kirbychanmarkham.com/unionville/`

---

## 6. Known gaps, stated plainly

These are not oversights. They are things you should know.

1. **The build is verified.** As of v2 the full pipeline has been run on Node 22.11 from a clean
   `npm ci`: `astro check` reports 0 errors, 0 warnings and 0 hints, the build produces 42 pages
   and the link checker finds 0 broken internal links out of 1,723. All 121 JSON-LD blocks parse
   as valid JSON.
2. **`package-lock.json` is now included**, along with `.nvmrc` pinning Node 22. Without the
   lockfile Cloudflare fell back to Bun and Node 24. It will now use npm and Node 22, which is the
   combination that was actually tested.
7. **`VideoObject` schema does not appear yet.** That is correct behaviour: the builder returns
   nothing while `youtubeId` is empty, so no invalid markup is emitted. It appears as soon as you
   add real YouTube IDs. The other five schema types are live and valid.
3. **The map is a schematic**, not a boundary map or a survey. It says so on the page. Positions
   are hand placed and approximate.
4. **Neighbourhood facts are qualitative by design.** School names, transit lines and amenities are
   stated where they are well established. Every count, price, distance and time is a TODO rather
   than an estimate.
5. **The Content Security Policy in `public/_headers` allows inline scripts.** That is needed for
   the JSON-LD blocks. Tightening it to hashes is possible later and is not a launch blocker.
6. **The comma rule is applied strictly**, including between independent clauses, not just as an
   Oxford comma ban. If you meant the narrower rule, say so and it is a quick global pass to relax
   it.
