# TODO checklist

Everything on this site that still needs real information from you. Nothing here has been invented
or estimated. Each item names the exact file to edit.

**Blocking** items must be done before the site is public. They are legal or compliance
requirements, not polish.

---

## 1. Blocking. Do these before launch

| # | What | File | Why it blocks |
| --- | --- | --- | --- |
| 1 | Done, confirm spelling | `src/data/site.json` &rarr; `brokerage.legalName` is `eXp Realty Brokerage`, shown on its own in the top bar, the footer and `/contact/` | Check it matches the RECO public register character for character, including any comma |
| 2 | Done | Team name, brokerage and "Kirby Chan, Broker" in the footer, on `/contact/` and beside Kirby's photo | Ask eXp compliance whether they require any extra wording |
| 3 | Have a lawyer read `/privacy/`, `/terms/` and `/accessibility/` | `src/pages/privacy.astro`, `terms.astro`, `accessibility.astro` | Written to align with PIPEDA, CASL and AODA, but not reviewed by counsel. Each page says so at the top. Remove that notice once reviewed |
| 4 | Done | The sample case study is gone. `/client-stories/` shows the stories published on kirbychanandco.com and `/case-studies/` redirects there |
| 5 | Set `LEAD_WEBHOOK_URL` in Cloudflare | Cloudflare dashboard | Until this is set the form refuses submissions and tells visitors to phone. It does not silently lose leads, but it does not deliver them either |
| 6 | Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` | Cloudflare dashboard | Without them there is no spam filtering beyond the honeypot and timing check |

---

## 2. Content and brand

| # | What | File |
| --- | --- | --- |
| 7 | Done | Search Homes links to kirbychanandco.com/homes-for-sale-markham |
| 8 | Optional booking link | `src/data/site.json` &rarr; `links.booking`. Booking buttons go to the contact page until a scheduling link is added |
| 9 | Done, add Facebook if you have one | Instagram, YouTube and LinkedIn are set in `src/data/site.json` |
| 10 | Done, keep current | 150+ five-star Google reviews, 5.0 rating, 10 languages, 12 guides, as published on kirbychanandco.com. Stored in `home.stats` in every `src/i18n/*.json` file |
| 11 | Done, confirm you are happy to reuse them | Six excerpts from public Google reviews in `src/data/testimonials.json`, names shortened |
| 12 | Done, review the wording | Meet Kirby copy is based on kirbychanandco.com/about and lives in `src/i18n/en.json` |
| 13 | Done | The publishing plan list was removed |
| 13a | Have a native speaker review each translation | `src/i18n/zh.json`, `fr.json`, `fa.json`, `ru.json`, `es.json`, `el.json`, `ja.json` |

---

## 3. Numbers that need a source

Nothing in this section has been guessed. Every one renders as a visible placeholder until filled.

| # | What | File |
| --- | --- | --- |
| 14 | Done | Q1 2026 TRREB community medians. Refresh when TRREB publishes the next quarterly community report |
| 15 | Done | TRREB Q1 2026 medians and GO timetable times (September 2026) |
| 16 | Done | Price tables now show TRREB Q1 2026 medians by property type |
| 17 | Done | 4 GO stations, 41 minutes from Unionville GO, 8 library branches |
| 18 | Done | August 2026 report published |

---

## 4. Media

| # | What | Where |
| --- | --- | --- |
| 19 | Done | Logo recoloured from kirbychanandco.com is in `src/assets/logo/`. It is a 533 pixel wide raster, so a vector SVG from your designer would be sharper on large screens |
| 20 | Done, could be improved | Headshot from kirbychanandco.com is in place but is only 532 pixels square. A larger original would look sharper |
| 21 | Done, could be improved | Freely licensed Wikimedia Commons photos with credits. Your own photos would be better: save over `src/assets/photos/neighbourhoods/<slug>.jpg` and remove the credit entry |
| 22 | Done | Team photo from kirbychanandco.com. Add the second person's name to the alt text in `src/components/Hero.astro` if you want them named |
| 23 | Done | Eleven real videos from the Kirby Chan Real Estate YouTube channel |
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
