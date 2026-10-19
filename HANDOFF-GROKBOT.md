# Handoff: kirbychanmarkham.com

For Grokbot or any agent the owner (Ryan, support@kirbychandigital.com) gives write access to this repository. Written 2026-10-19. It holds no passwords or tokens: the owner gives access directly, never in a chat or in this file.

## The deal

- Claude writes the blog posts. Three a week, saved in the repository as drafts.
- Grokbot manages them. It publishes one on each Monday, Wednesday and Friday, checks the page went live and keeps the queue full by asking Claude for more.
- Nobody else edits site code or content without the owner's say-so. See "Do not touch".

## The site

- Live at https://kirbychanmarkham.com (the `www` address redirects to it). Markham, Ontario real estate: live listings search and map, one page per listing, 12 neighbourhood guides, service and downsizing guides (in English, French, Farsi and Chinese), the site in 8 languages, sold prices behind a sign-in and a blog of about 70 posts.
- Brokerage: Kirby Chan & Co. Real Estate Team, eXp Realty Brokerage. Kirby Chan, Broker. Office 22 Stacey Crescent, Markham, ON L3T 6Z4. Phone (647) 249-7105. Email info@kirbychanmarkham.com.
- Code: private GitHub repository `KCDryan/kirbychan-markham`, branch `main`. Astro 5 static site plus Cloudflare Pages Functions and a D1 database. Posts can also be made in TinaCMS by the team and at `/upload/` once the owner switches that on.
- Deploy: a push to `main` builds on Cloudflare Pages and goes live in 3 to 5 minutes. There is no staging and no human review, so a bad push is public.
- Other things that commit to `main`, so always pull first:
  - GitHub Action `Refresh listing counts` (about 7:15 am Toronto) updates listing counts as `github-actions[bot]`.
  - TinaCloud commits "TinaCMS content update" whenever the team saves a post.
  - Two Claude tasks on the owner's Mac: the blog writer (Monday, Wednesday and Friday at 9:00 am) and the content updater (8th and 22nd of the month at 10:30 am, market figures and neighbourhood facts, never blog posts).

## What Grokbot needs from the owner

1. Write access to the GitHub repository: a collaborator invitation or a fine-grained token limited to this one repository. The owner does this in GitHub settings.
2. Nothing else. No Cloudflare, listing feed or database access is needed for blogs.
3. A place that can open government and regulator websites (reco.on.ca, ontario.ca, canada.ca, markham.ca, trreb.ca). Step 5 below needs it. If the environment blocks them, say so and do not publish a post with dated figures.

Commit identity: every commit must use the name `KCDryan` and the email `329599168+KCDryan@users.noreply.github.com`. The owner's GitHub account refuses pushes that expose a personal email. Set it for this repository with `git config user.name KCDryan` and `git config user.email 329599168+KCDryan@users.noreply.github.com`.

## Blog posts: how they work

- Full posts are files in `src/content/blog/<slug>.mdx`. The front matter, sources, internal links and writing rules are in `BLOG-PLAYBOOK.md`, `SEO-PLAYBOOK.md` and `KEYWORDS.md`. Read them before touching a post.
- The `src/content/blog/quick/` folder holds posts the team made in TinaCMS. They are theirs. Never publish, edit or delete anything there.
- A post with `draft: true` in its front matter is invisible: not on the blog page, in the sitemap or in the feed. The blog checks skip it. A draft is not checked until it is published, so publishing is the moment a mistake can go live.
- The checks reject a `published` date in the future. That is why scheduling is done by flipping a draft on the day, not by dating it ahead.
- `npm run verify` runs every check. The blog check fails a post that has no source, fewer than three internal links, a title outside 30 to 60 characters, a description outside 140 to 168 characters. It also fails a post that shares more than 15 percent of its wording with another post. The style check enforces Canadian English and no long dashes. It also refuses a comma directly before the word "and" or the word "or".
- Known false alarm: "Tina Dev server is already in use. Datalayer server is busy on port 9000" means another `verify` or Tina process is still running on the machine. Stop it and run again. It is not a content failure.

## Claude's side (writing)

- Writes each post to the playbook from primary sources it opened that day. Saves it with `draft: true`. The `published:` date is the intended publish date.
- Keeps at least 6 full-post drafts queued (two weeks), one for each Monday, Wednesday and Friday.
- For each draft, ticks the topic in `BLOG-TOPICS.md` with the slug (so nobody writes it twice) and adds a line to `BLOG-LOG.md`: `## YYYY-MM-DD, queued <slug>, to publish YYYY-MM-DD`.
- Each publishing day has a fixed theme (`BLOG-PLAYBOOK.md` section 3): Monday first time buyers, Wednesday selling a home, Friday upsizing. A draft takes its topic from its own day's section of `BLOG-TOPICS.md`.
- Topic queue, in order (each section of `BLOG-TOPICS.md` has more):
  1. Monday: York Region schools, how to confirm a school boundary before you buy
  2. Wednesday: Pricing a home in Markham, how comparable sales work
  3. Friday: Bridge financing explained for move-up buyers
  4. Monday: Markham townhouses: freehold or condo and what each costs
  5. Wednesday: Preparing a Markham home for sale, what is worth spending on
  6. Friday: Buying a detached home in Markham, what to check on older houses
- Already published (do not repeat): see the Published list in `BLOG-TOPICS.md` and run `ls src/content/blog src/content/blog/quick` before writing. Claude must say in the draft's log line why the post is different from the closest existing one.

## Grokbot's side (managing), every Monday, Wednesday and Friday

1. `git pull --ff-only`, then `npm ci` if `node_modules` is missing. If the pull fails or `git status --short` prints anything, stop and tell the owner.
2. If a post has already gone live today (`git log --since=midnight --format=%s -- src/content/blog`), do nothing. The owner's Claude task on the Mac may have published it.
3. Take the draft in `src/content/blog/*.mdx` (not `quick/`) with the earliest `published` date. If there are none, do nothing and tell the owner and Claude the queue is empty.
4. In that file: delete the `draft: true` line and set `published:` to today's date in Toronto (`TZ=America/Toronto date +%F`).
5. Re-read any figure with a date in the post (rates, fees, deadlines, TRREB numbers). If its source page now shows something different, do not publish: put the draft back as it was and send it to Claude.
6. Add one line to `BLOG-LOG.md`: `## YYYY-MM-DD, published <slug>`. Then run `npm run verify && git commit -am "Blog: <post h1>" && git pull --rebase && git push origin HEAD:main`. If verify fails, do not push. Put the error in `BLOG-LOG.md` under "Needs owner attention" and tell the owner.
7. Wait for the deploy, then check `https://kirbychanmarkham.com/blog/<slug>/` returns 200 and the slug is in `https://kirbychanmarkham.com/sitemap-0.xml`. A page can serve the old version for about two minutes after a deploy, so look again before raising an alarm.
8. Run `node scripts/indexnow.mjs /blog/<slug>/ /blog/`. This tells Bing and other search engines. A reply other than 200 is not a failure, just note it in the log.

Publish time is not set by this file. Early morning Toronto time (about 8:00 am) is a reasonable default and the owner's Mac task runs at 9:00 am, so a post Grokbot publishes first makes that task skip the day. The owner can change either.

## Time-sensitive posts

- Property tax post: states the City of Markham's 2026 rates and due dates. Replace them when the City publishes the next year's rates.
- Water bill post: states City of Markham and Alectra rates. Re-check each quarter.
- GO train post: uses the September 2026 timetable. Re-check when GO Transit publishes its next timetable.
- Condo vs retirement home post: states the Ontario long-term care daily co-payment from July 1, 2026. Re-check each July.
- Posts that quote a TRREB Market Watch month carry the month in the text and go stale monthly. Neighbourhood figures use the TRREB community report for April to June 2026. Updating those pages is not a blog task: see `UPDATE-PLAYBOOK.md`.
- Anything that quotes tax, mortgage or home-buying rules (land transfer tax, FHSA, deposits, closing costs): re-check the government page each quarter.

## Do not touch

- Anything outside `src/content/blog/<slug>.mdx`, `BLOG-TOPICS.md` and `BLOG-LOG.md`: components, pages, functions, the database, workflows, translations, the guides and neighbourhood pages, `package.json`.
- The `quick/` folder and anything made in TinaCMS or at `/upload/`.
- Sold prices or any sold data on a public page. That stays behind the sign-in under TRREB's rules.
- Another brokerage's, agent's or lender's blog as a source. Primary sources only.
- Predictions, school promises or school rankings, statements about who should live where, invented clients, stories or quotes (RECO advertising rules and the Ontario Human Rights Code).

## State today (2026-10-19)

- Full-post drafts queued: 0. Three posts must be drafted before Wednesday 2026-10-21 and the queue refilled to 6.
- Today's post (Monday): published at 9:19 am by the Claude task on the Mac. Next publishing day is Wednesday 2026-10-21.
- Three team drafts sit in `src/content/blog/quick/` (Living in Unionville, Cornell real estate and Greensborough homes for sale). They are not part of the queue. Do not publish them.
- Commit identity: the Mac tasks take the email from the last commit, which is often the listing-counts bot, so some commits show a bot address. Use the identity above.
- Owner items still open: the `UPLOAD_PASSWORD` secret (so `/upload/` can be switched on), a Google Business Profile for 22 Stacey Crescent, Search Console (sitemap and `sitemap-listings.xml`) and links to the site from Kirby's profiles.
- Indexing: Search Console lists tens of thousands of filtered search addresses (`?area=`, `?home=` and so on) as "Alternate page with proper canonical tag". That is expected and not a blog task. The real pages are listed in the sitemaps.
- Blog photos: twelve neighbourhood photos serve the cards, spread so none repeats close together. More photos need a source and an entry in `src/data/photo-credits.json` or the build fails.

## If something goes wrong

- A bad post is live: set `draft: true` again and push. The page leaves the blog, the sitemap and the feed on the next deploy (3 to 5 minutes). Then tell the owner.
- The build fails: the live site keeps its last good version. Read the failing "Cloudflare Pages" check on the commit, then fix or revert the one file you changed.
- Anything else: stop and tell the owner. Do not work around a check.
