# kirbychanmarkham.com

Hyperlocal Markham real estate site for Kirby Chan &amp; Co. Real Estate Team, eXp Realty Brokerage.

Astro, static output, no client framework. Deploys to Cloudflare Pages through the GitHub
integration: every commit to `main` builds and goes live.

---

## Quick start

You need Node 22, which is what `.nvmrc` pins and what this project is tested on. Get it from
[nodejs.org](https://nodejs.org) or run `winget install OpenJS.NodeJS.LTS` on Windows, then reopen
your terminal.

Keep `package-lock.json` committed. Without it Cloudflare falls back to Bun and its own default
Node version, which is not the combination this was tested on.

```bash
npm install
npm run dev
```

The dev server prints a local URL. Other commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run check` | `astro check`, types and content schemas |
| `npm run check:links` | Scan `dist/` for broken internal links |
| `npm run verify` | check, then build, then link check. Run this before you commit |

To test the lead form endpoint locally you need Wrangler, because `/api/lead` is a Cloudflare
Pages Function rather than part of the Astro build:

```bash
cp wrangler.example.toml wrangler.toml && npm run build && npx wrangler pages dev dist
```

**Delete `wrangler.toml` again before you commit.** A real `wrangler.toml` in the repo root makes
Cloudflare Pages read build configuration from the file instead of from the dashboard and a Pages
build command cannot be set there. The build step then gets skipped and the deploy fails with
`Output directory "dist" not found`. That is why the file ships as `wrangler.example.toml`.

---

## Where everything lives

```
src/
  content/          all editable page content, as MDX
    neighbourhoods/ 12 pillar pages
    services/       8 situation pages
    articles/       long form guides
    videos/         video pages
    case-studies/   client stories
    market-reports/ monthly reports
  data/             site settings, stats, market figures, testimonials, nav
  components/       reusable pieces
  layouts/          page shells
  pages/            routes
  lib/              SEO helpers, JSON-LD builders, formatters
  styles/           tokens.css (design system) and global.css
functions/api/      the /api/lead Cloudflare Pages Function
public/             fonts, images, favicon, OG image, _headers, _redirects, robots.txt
scripts/            link checker used locally and in CI
```

`src/content.config.ts` defines the schema for every content type. If a required field is missing
or a title is too long, the build fails with a message naming the file. That is deliberate.

---

## Editing content

### Site-wide settings

`src/data/site.json` holds the phone number, email, office address, brokerage details, the Lofty
search URL, the booking link and social URLs. Almost everything marked TODO across the site is
fixed by filling in this one file.

Leaving `links.loftySearch` or `links.booking` empty is safe. Buttons fall back to `/contact/`
rather than breaking.

### A neighbourhood page

Edit the matching file in `src/content/neighbourhoods/`. The frontmatter drives the hero, the
quick stats table, the price bands table, the nearby neighbourhood links, the related services and
the FAQ. The body below the frontmatter is the prose.

URLs come from the filename: `unionville.mdx` becomes `/unionville-markham/`. The one exception is
`downtown.mdx`, which becomes `/downtown-markham/` so the slug does not read as
"downtown-markham-markham".

If you add a thirteenth neighbourhood, add a matching entry to `src/data/market.json` as well.

### An article

Add an `.mdx` file to `src/content/articles/`. The filename becomes the URL at the site root, so
`unionville-vs-markham-village.mdx` is served at `/unionville-vs-markham-village/`. Keep slugs flat
for search. Do not name a file after an existing page such as `buyers` or `contact`.

### A market report

Copy `src/content/market-reports/template.mdx`, rename it to something like `august-2026.mdx`, set
`period` and `published`, fill in the figures and delete the `draft: true` line. While `draft` is
true the report is not built.

### The market ticker on the homepage

`src/data/market.json`. Add a real number to a neighbourhood and it appears. Leave it `null` and
that neighbourhood is skipped. If every price is `null` the whole ticker band is hidden, so the
homepage never shows an empty or invented figure. Set `source` to `TRREB` and `period` to the month
and year before you publish any figure.

### Stats, testimonials and the "Why Markham" band

`src/data/stats.json`, `src/data/testimonials.json` and `src/data/why-markham.json`. Any value left
as `TODO` renders as a visible marked placeholder rather than a made up number. `testimonials.json`
is an empty array, so the testimonials section does not render at all until you add real, permitted
quotes.

### Videos

Add an `.mdx` file to `src/content/videos/` with the YouTube ID. Leave `youtubeId` empty until the
video is live and the page shows a labelled placeholder instead of a broken embed. Video embeds use
a click to load facade, so nothing from YouTube is requested until a visitor presses play.

---

## Adding photos and the logo

No code changes needed. Drop a file into the right folder with the right name, commit it and it
replaces the placeholder on the next deploy. The build creates fast AVIF and WebP versions at several
sizes automatically, so upload the largest original you have.

| File | Where it shows |
| --- | --- |
| `src/assets/photos/home-hero.jpg` | Homepage hero |
| `src/assets/photos/kirby-portrait.jpg` | Homepage team section and /about/ |
| `src/assets/photos/neighbourhoods/<slug>.jpg` | That neighbourhood's page, its homepage card and its social share image |
| `src/assets/logo/logo.svg` | Header |
| `src/assets/logo/logo-light.svg` | Footer on the dark background |

Slugs: `unionville`, `markham-village`, `cornell`, `berczy-village`, `cathedraltown`,
`wismer`, `greensborough`, `angus-glen`, `box-grove`, `thornhill`, `milliken-mills`,
`downtown`. JPG, PNG and WebP all work. Names must be lower case. The full list with crop shapes
is in `src/assets/photos/README.md`.

On github.com: open the folder, choose **Add file > Upload files**, drag the photo in and commit.

---

## Automated updates every two weeks

A scheduled Claude cloud agent updates the site on the 8th and 22nd of each month. It follows
`UPDATE-PLAYBOOK.md` exactly and commits straight to `main`, so changes go live without review.

Each run:

1. **Market figures.** When TRREB has published newer community level figures, updates the homepage
   ticker and publishes a market report page.
2. **Markham news.** Publishes a sourced roundup at /news/ and shows relevant items on each
   neighbourhood page.
3. **Fact check.** Re-verifies three neighbourhood pages, oldest first then stamps them with a
   "last reviewed" date and their sources.

Guardrails built into the repo, not just the instructions:

- Every news item and every cited fact must carry a full https source URL. The schema rejects
  anything without one and the build fails.
- `npm run verify` (style, types, build, links) must pass before the agent may push.
- The agent may only touch the content files listed in the playbook. Brokerage details, business
  statistics, testimonials, services, photos and all code are off limits.
- Every run writes an entry to `UPDATE-LOG.md` with its sources and anything that needs your
  attention.

**After each run, skim `UPDATE-LOG.md`.** If something published is wrong, revert that commit in
GitHub or use **Rollback** in Cloudflare, then fix the playbook so it does not happen again.

---

## House style

These are enforced, not suggestions. The CI workflow fails the build on an em dash.

- Canadian English. Neighbourhood, colour, centre, programme, organise.
- No em dashes anywhere. No en dashes either.
- No comma before "and" or "or". This is applied strictly, including between independent clauses.
- Never publish a number you cannot point to a source for. Use a `TODO` marker instead.
- Never publish a client story without written permission.

Check your work before committing:

```bash
grep -rnP '\x{2014}|\x{2013}' src/ && echo "dashes found"
grep -rnP ',\s+(and|or)\b' src/ && echo "commas found"
```

---

## Design system

`src/styles/tokens.css` holds every colour, type step and spacing value. Change a token there and
it changes everywhere.

Contrast rules that matter:

The palette is an evergreen sister to the crimson kirbychanandco.com brand. The logo is the same
Kirby Chan & Co. mark, recoloured: evergreen on light backgrounds, brass on the dark footer.

| Token | Hex | Use |
| --- | --- | --- |
| `--brand` | `#1F5045` | Primary buttons, links, italic accents, logo panel |
| `--ground` | `#10251F` | Utility bar, footer, dark bands |
| `--brass` | `#C2A06A` | Small accents, numerals, rules, footer logo |
| `--paper` / `--mist` | `#F8F8F5` / `#ECF1EE` | Page and alternate section backgrounds |
| `--ink` | `#1B2320` | Body text |

| Combination | Ratio | Use |
| --- | --- | --- |
| ink on paper | 15.1:1 | Body text |
| brand on paper | 8.6:1 | Links and small accents |
| paper on brand | 8.6:1 | Primary button text |
| brass on ground | 6.5:1 | Accents on the dark footer |
| brass on paper | 2.3:1 | **Fails.** Decorative only on light backgrounds: rules, numerals, borders |

Typefaces are Montserrat (headings) and Lato (body), the same pair as kirbychanandco.com. No
italics are used anywhere. Both are self hosted from `public/fonts` under the SIL Open Font License. No third party font request is
made.

---

## Environment variables

Copy `.env.example` to `.env` for local work. Never commit `.env`.

| Variable | Where it is needed | Public? |
| --- | --- | --- |
| `LEAD_WEBHOOK_URL` | Runtime, Pages Function | No. Secret |
| `TURNSTILE_SECRET_KEY` | Runtime, Pages Function | No. Secret |
| `TURNSTILE_SITE_KEY` | Build time, rendered into the form | Yes, public by design |

`TURNSTILE_SITE_KEY` must be set as a build variable in Cloudflare, not only a runtime one, because
it is baked into the HTML at build. The other two are read only inside `functions/api/lead.ts` and
never reach the browser.

Without `TURNSTILE_SECRET_KEY` the form still works and the honeypot plus timing checks still run.
The payload records `turnstile: "not-configured"` so you can tell. Without `LEAD_WEBHOOK_URL` the
endpoint refuses the submission and tells the visitor to phone instead, rather than pretending the
message was delivered.

---

## Uploading to GitHub

You upload. Nothing in this project pushes for you.

### Option A, GitHub Desktop. Recommended

1. In GitHub Desktop choose **File > New repository**. Name it `kirbychanmarkham` and set it to
   **Private**. Note the local path it creates.
2. Unzip the delivered zip and copy its **contents** into that local repository folder. The folder
   should end up containing `package.json` at the top level, not a nested folder.
3. GitHub Desktop lists the changes. Write a commit message, click **Commit to main**, then click
   **Publish repository** or **Push origin**.

This handles hidden files such as `.gitignore` and `.github/` correctly. Use it if you can.

### Option B, github.com web upload

1. Create a new **private** repository named `kirbychanmarkham` on github.com.
2. Unzip first. Then open **Add file > Upload files** and drag the **contents** of the unzipped
   folder in, not the parent folder itself.
3. Two warnings that catch people out:
   - The browser uploader is limited to **100 files per upload**. This project is over that, so
     upload in batches: `src/` first, then `public/`, then `functions/`, `scripts/`, `.github/` and
     the loose root files.
   - macOS Finder **hides dotfiles**. Press **Cmd+Shift+.** to show them, otherwise `.gitignore`
     and `.github/` are silently skipped.
4. After uploading, confirm that both `.gitignore` and `.github/workflows/ci.yml` appear in the
   repository. If they do not, the upload missed them.

### Updating later

`CHANGES-vX.md` lists every file added, changed or deleted since the previous zip. Uploading only
adds and overwrites. **Deleted files must be deleted in GitHub manually**, otherwise they stay live.

---

## Deploying to Cloudflare Pages

One time setup, done by you in the Cloudflare dashboard.

This must be a **Pages** project, not a Worker. On the create screen Cloudflare now defaults to
Workers and a Workers project runs `npx wrangler deploy` as its deploy command, which fails on a
static Astro site with `Missing entry-point to Worker script or to assets directory`. If you see
the line `Executing user deploy command` anywhere in your build log, you are on a Worker. Delete it
and start again on the Pages tab.

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com), go to **Workers &amp; Pages**,
   then **Create** and choose the **Pages** tab, then **Connect to Git**.
2. Authorise GitHub and pick the repository.
3. Build settings. **The build command is the one people miss.** Without it Pages skips the build
   entirely and fails with `Output directory "dist" not found`:
   - Production branch: `main`
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: leave blank
4. Under **Environment variables**, add for **Production** and **Preview**:
   - `LEAD_WEBHOOK_URL` as a secret
   - `TURNSTILE_SECRET_KEY` as a secret
   - `TURNSTILE_SITE_KEY` as a plain variable
   - `NODE_VERSION` set to `22`
5. Save and deploy. The first build takes a few minutes.

A healthy build log contains all four of these lines in order. If any is missing, the setting above
it is wrong:

```
Installing project dependencies: npm clean-install
Executing user build command: npm run build
[build] 42 page(s) built
Found Functions directory at /functions. Uploading.
```
6. **Custom domain.** In the Pages project go to **Custom domains > Set up a custom domain** and
   add `kirbychanmarkham.com`, then `www.kirbychanmarkham.com`. The domain's nameservers must point
   at Cloudflare. If the domain is registered elsewhere, add the site under **Websites** in
   Cloudflare first and change the nameservers at the registrar.
7. Set up Turnstile at **Turnstile > Add widget** for `kirbychanmarkham.com`. Copy the site key and
   the secret key into the environment variables above, then redeploy so the site key is baked in.

**Every commit you push to `main` deploys straight to production.** There is no staging gate. Only
upload a zip you have reviewed. If you want a safety net, push to a branch first and let Cloudflare
build a preview URL for it.

### Rolling back

In the Pages project open **Deployments**, find the last good one and choose **Rollback to this
deployment**. That is faster than fixing forward under pressure.

---

## What runs in CI

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

1. `npm run check`, types and content schemas
2. `npm run build`
3. the internal link checker
4. an em dash check on `src/`

GitHub emails you when a workflow fails, provided notifications are on for the repository. This
runs independently of Cloudflare, so a red CI run does not block a deploy. Watch both.

---

## Before launch

See **TODO-CHECKLIST.md** for the full list of everything that still needs real information. The
items marked **blocking** must be done before the site is public, because they are compliance
requirements rather than polish.
