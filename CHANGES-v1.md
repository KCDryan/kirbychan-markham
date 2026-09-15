# CHANGES v1

First release. Everything below is **added**. Nothing is changed or deleted, because there is no
previous version.

Upload the entire contents of `kirbychanmarkham-site-v1.zip` as the repository root. See the
**Uploading to GitHub** section of `README.md` for the two ways to do that.

---

## Summary

| | |
| --- | --- |
| Files added | 106 |
| Files changed | 0 |
| Files deleted | 0 |
| Pages the build produces | 44 |
| Zip | `kirbychanmarkham-site-v1.zip`, 580 KB |

Page count: home, neighbourhood hub, 12 neighbourhood pillar pages, map, buyers, sellers, services
hub, 8 service pages, about, videos hub, 3 video pages, articles hub, 1 article, case studies hub,
1 case study, market reports hub, contact, thank you, privacy, terms, accessibility, 404.

---

## Root

| File | Purpose |
| --- | --- |
| `package.json` | Dependencies and scripts. `npm run verify` runs check, build and link check |
| `astro.config.mjs` | Astro config. Static output, MDX, sitemap, trailing slashes on |
| `tsconfig.json` | Strict TypeScript with path aliases |
| `wrangler.toml` | Local emulation of the Pages Function only. Production config lives in the dashboard |
| `.gitignore` | Excludes `node_modules`, `dist`, `.env`, `.wrangler`, `.astro`, `.DS_Store`, zips |
| `.env.example` | The three environment variables, with notes on which is public |
| `README.md` | Setup, content editing guide, house style, upload steps, Cloudflare deploy steps |
| `TODO-CHECKLIST.md` | Every outstanding item, with blocking ones listed first |
| `CHANGES-v1.md` | This file |

## Build and deploy plumbing

| File | Purpose |
| --- | --- |
| `.github/workflows/ci.yml` | Runs `astro check`, build, link check and an em dash check on every push to `main` |
| `scripts/check-links.mjs` | Scans the built site for broken internal links. No network calls |
| `functions/api/lead.ts` | The `/api/lead` Pages Function. Validation, honeypot, timing check, Turnstile verification, then POST to the webhook |

## Public assets

| File | Purpose |
| --- | --- |
| `public/_headers` | Security headers, CSP, one year immutable cache on hashed assets and fonts |
| `public/_redirects` | 19 redirects catching guessed neighbourhood URLs and old paths |
| `public/robots.txt` | Allows everything except `/api/`, points at the sitemap |
| `public/favicon.svg` | KC monogram in gold on espresso |
| `public/apple-touch-icon.png` | 180 x 180 version of the same |
| `public/og-default.png` | 1200 x 630 default social card |
| `public/fonts/*.woff2` | 6 files. Fraunces roman and italic, Inter. Latin and latin extended subsets, SIL Open Font License |

## Design system

| File | Purpose |
| --- | --- |
| `src/styles/tokens.css` | Every colour, type step, space value and the six font faces. Contrast ratios documented in comments |
| `src/styles/global.css` | Reset, typography, buttons, cards, prose, tables, steps, disclaimers |

## Data you will edit

| File | Purpose |
| --- | --- |
| `src/data/site.json` | Contact details, office address, brokerage, Lofty link, booking link, socials. **Most TODOs are fixed here** |
| `src/data/stats.json` | The four homepage stats. All TODO |
| `src/data/market.json` | Per neighbourhood price figures for the ticker. All null |
| `src/data/testimonials.json` | Empty array. The section is hidden until you add real quotes |
| `src/data/why-markham.json` | The four proof points. Three are TODO pending verification |
| `src/data/nav.json` | Header and footer link structure |

## Content

| Path | Count | Notes |
| --- | --- | --- |
| `src/content.config.ts` | 1 | Schemas for all six collections. A bad field fails the build with the filename |
| `src/content/neighbourhoods/` | 12 | Unionville is the fully written reference page. All 12 are substantive |
| `src/content/services/` | 8 | Luxury, Relocation, Downsizing, Upsizing, First-Time Buyers, New Construction, Investors, Estate Sales |
| `src/content/articles/` | 1 | The seed article, Unionville or Markham Village |
| `src/content/videos/` | 3 | Placeholder YouTube IDs. Pages render a labelled block until filled |
| `src/content/case-studies/` | 1 | Layout sample, `noindex`, carries a visible warning. Delete before launch |
| `src/content/market-reports/` | 1 | Monthly template, marked draft so it does not build |

## Components

`ArticleCard`, `Breadcrumbs`, `CaseStudyCard`, `Cta`, `FaqAccordion`, `Footer`, `Header`, `Hero`,
`LeadForm`, `LiteYouTube`, `Logo`, `MarketTicker`, `NeighbourhoodGrid`, `Placeholder`,
`SectionHead`, `ServiceGrid`, `StatsBand`, `TeamIntro`, `Testimonials`, `Toc`, `VideoCard`,
`WhyMarkham`. 22 files in `src/components/`.

## Layouts

`Base` (head, SEO, JSON-LD, header, footer), `Page` (breadcrumbs plus hero, used by static pages),
`NeighbourhoodLayout`, `ArticleLayout`. 4 files in `src/layouts/`.

## Library

| File | Purpose |
| --- | --- |
| `src/lib/seo.ts` | Canonical and absolute URL helpers |
| `src/lib/schema.ts` | JSON-LD builders for RealEstateAgent, BreadcrumbList, FAQPage, BlogPosting, VideoObject, Place |
| `src/lib/format.ts` | Canadian dollar and date formatting, ISO durations, the TODO detector, neighbourhood paths |

## Pages

23 route files in `src/pages/`, including three dynamic routes and one catch-all that serves both
the neighbourhood pillar pages and the flat article slugs.

---

## For the next version

When v2 arrives, this file becomes `CHANGES-v2.md` and lists only what moved. Remember that
uploading to GitHub adds and overwrites but never deletes. Any file listed as **deleted** has to be
removed in GitHub by hand.
