# Blog playbook

Rules for writing and publishing a post on the kirbychanmarkham.com blog. The scheduled blog writer
follows this file on every run and so does anyone writing a post by hand. A push to `main` goes
live on the public site within minutes with no human review, so accuracy comes before everything
else. **If you cannot verify a post properly, publish nothing.** A missed day costs nothing. A wrong
figure on a real estate brokerage website can mislead a buyer and breaches RECO advertising rules.

---

## 1. What a run does

1. Get today's date in Toronto: `TZ=America/Toronto date +%Y-%m-%d`.
2. `git pull --ff-only`, then `npm ci` if `node_modules` is missing.
3. Pick **one** topic (section 3).
4. Research it from primary sources (section 4).
5. Write one post as `src/content/blog/<slug>.mdx` (sections 5 to 7).
6. Fact check it claim by claim (section 8).
7. Run `npm run verify`. It must pass. Fix and re-run until it does.
8. Mark the topic done in `BLOG-TOPICS.md` and append an entry to `BLOG-LOG.md` (section 9).
9. Commit and push (section 10).

One post per run. Never more.

## 2. Files

**You may only:**

- create one new file in `src/content/blog/`
- edit `BLOG-TOPICS.md` (tick the topic, add new topic ideas at the bottom)
- append to `BLOG-LOG.md`

**Never change anything else.** Not components, layouts, pages, styles, data files, other posts,
neighbourhood guides, services, translations, `package.json`, the lockfile or this playbook. If
`npm run verify` fails because of a file you did not create, do not fix it: stop, publish nothing and
record the failure under "Needs owner attention" in `BLOG-LOG.md`, then commit and push only the log.

## 3. Choosing the topic

1. List what already exists: `grep -h "^title:\|^h1:" src/content/blog/*.mdx`.
2. Take the first unticked topic in `BLOG-TOPICS.md`.
3. Skip it (leave it unticked and note why in the log) if an existing post already targets the same
   search intent, or if the facts it needs cannot be verified from the sources in section 4.
4. If every topic is ticked or skipped, write five new topic ideas at the bottom of
   `BLOG-TOPICS.md` in the same format, then use the first. Good topics answer one specific question
   a Markham buyer, seller, owner or newcomer would type into Google. Mix the categories over a week.
   Never write a topic that duplicates a neighbourhood guide or a service page. Link to those instead.

## 4. Research and sources

Every number, rate, threshold, date, deadline, law, programme rule, fee, schedule or statistic in
the post must be confirmed **on a page you opened during this run**. Your own memory is not a source,
even for facts that feel well known, because rules and rates change.

**Use primary sources first:**

| Subject | Sources |
| --- | --- |
| Federal tax, FHSA, RRSP Home Buyers' Plan, GST/HST rebates | canada.ca (CRA) |
| Mortgage rules, stress test, insured mortgages | canada.ca, osfi-bsif.gc.ca, cmhc-schl.gc.ca |
| Land transfer tax, Ontario rules and laws | ontario.ca, ontario.ca/laws |
| Agent conduct, TRESA, consumer information | reco.on.ca |
| Mortgage brokers, title insurance regulation | fsrao.ca |
| New home warranties, builders | hcraontario.ca, tarion.com |
| Property assessment | mpac.ca |
| Markham property tax, bylaws, permits, services, parks | markham.ca |
| Regional services, water, roads, YRT | york.ca, yrt.ca |
| Schools and boundaries | yrdsb.ca, ycdsb.ca |
| GO Transit | gotransit.com, metrolinx.com |
| Market statistics | trreb.ca (Market Watch and community reports) |
| Population and census | statcan.gc.ca |
| Interest rates | bankofcanada.ca |

- News outlets are acceptable only for news events, never for rules or figures a primary source
  publishes.
- **Never** use another brokerage's, agent's, lender's or content farm's blog as a source for a fact.
- State the period for every market figure ("January to March 2026") and the effective date for
  every rule or rate where the source gives one.
- If two sources disagree, use the primary one and say what it says. If you still cannot resolve it,
  leave the claim out.
- Every source you relied on goes in the `sources` list with a descriptive name and the exact https
  URL you opened. Two to six sources is normal.

## 5. What never goes in a post

- **Invented anything.** No made up clients, stories, quotes, testimonials, examples presented as
  real, sales results, statistics about the team or "we recently helped a family" anecdotes. A
  worked example with round illustrative numbers is fine if it is clearly labelled as an example.
- Predictions of where prices or rates will go. Describe what the source data shows, for the period
  it covers.
- Guarantees or superlatives about the team ("the best", "top", "number one", "guaranteed sale").
- Comparisons with other brokerages or agents.
- Legal, tax, mortgage or investment advice presented as personal advice. Explain how a rule works
  and tell readers to confirm their own situation with a lawyer, accountant or mortgage professional.
- School rankings, "best schools" claims or promises that an address is in a catchment. Say that
  boundaries are set by the board and must be confirmed for the exact address.
- Statements about safety or crime in a neighbourhood, or anything describing who "should" live
  somewhere based on ethnicity, religion, age, family status, disability or any other protected
  ground under the Ontario Human Rights Code.
- Specific listings, addresses of private homes or photos of private homes.
- The words and patterns that make writing read as machine written: "In today's market",
  "navigating", "delve", "unlock", "game changer", "nestled", "vibrant", "bustling", "hidden gem",
  "look no further", "dream home", "whether you're a first-time buyer or", "In conclusion",
  "It's important to note", "when it comes to", rhetorical questions as openers, and lists of three
  adjectives.

## 6. House style

- Canadian English: neighbourhood, centre, colour, programme is acceptable but "program" is used by
  most Canadian government sources, so match the source's spelling for official programme names.
  `scripts/check-style.mjs` enforces the common spellings.
- **No em dashes or en dashes anywhere**, including number ranges: write "3 to 6 months".
- **No comma directly before "and" or "or"**, in lists or between clauses. Write "A, B and C".
  Restructure the sentence if needed.
- No italics, no exclamation marks, no emoji, no ALL CAPS for emphasis.
- Write as the team: "we" means Kirby Chan & Co. Real Estate Team. Plain, direct, warm and specific.
  Short paragraphs of one to four sentences. Explain jargon the first time.
- Money in Canadian dollars written as $1,250,000. Dates as "September 17, 2026".
- MDX safety: never use a bare `<` or `>` or curly braces `{` `}` in body text, because MDX treats
  them as code. Write "under $500,000", not "<$500,000".

## 7. SEO specification

**Choose one primary keyword** before writing: the phrase a real person in the Greater Toronto Area
would search, usually including "Markham" or "Ontario" (for example "land transfer tax Ontario first
time buyer", "Markham property tax rate"). Note it in the log.

**Frontmatter**

```yaml
---
title: "Land Transfer Tax in Markham: What Buyers Pay in 2026"   # 30 to 60 characters, primary keyword near the start, unique
description: "..."          # 140 to 168 characters. Contains the primary keyword and says what the reader will learn
h1: "..."                   # 20 to 90 characters. Natural headline, contains the keyword or a close variant, not identical to title
subtitle: "..."             # 40 to 200 characters. One sentence that expands the H1
category: costs-and-taxes   # buying, selling, neighbourhoods, market, condos, new-construction, moving-to-markham, downsizing, investing, costs-and-taxes
published: 2026-09-18       # today, Toronto time
takeaway: "..."             # 2 to 4 sentences that directly answer the search query. Written to win a featured snippet
neighbourhood: unionville   # optional, only if the post is mainly about one neighbourhood (sets the share image)
related:                    # 0 to 3 neighbourhood slugs the post genuinely discusses
  - unionville
relatedServices:            # 1 to 3 service slugs that fit the reader's situation
  - first-time-buyers
faq:                        # 4 to 6 real questions, each ending in ?, each answer 1 to 3 standalone sentences
  - q: "..."
    a: "..."
sources:                    # every source relied on, exact URLs opened this run
  - name: "Ontario.ca, Land transfer tax"
    url: https://www.ontario.ca/document/land-transfer-tax
---
```

Quote any YAML value that contains a colon followed by a space, starts with a special character or
contains a `#`. Neighbourhood slugs: unionville, markham-village, cornell, berczy-village,
cathedraltown, wismer, greensborough, angus-glen, box-grove, thornhill, milliken-mills, downtown.
Service slugs: luxury, relocation, downsizing, upsizing, first-time-buyers, new-construction,
investors, estate-sales, separation-and-divorce.

**File name** is the slug: lowercase kebab-case, 3 to 7 words, contains the primary keyword, no
dates or stop words unless needed (`land-transfer-tax-markham.mdx`). Never reuse or rename an
existing slug.

**Body**

- 1,200 to 2,000 words. The checker fails anything under 900.
- Do not repeat the H1 in the body. Start with a short `## The short answer` section or an opening
  paragraph that uses the primary keyword naturally within the first 100 words.
- 5 to 8 `##` sections whose headings are the questions or phrases people actually search. `###`
  subsections only when a section needs them. Never a single `#`.
- Use a Markdown table whenever you compare figures, options or costs.
- Use a numbered list for steps and a bulleted list for checklists. Keep list items parallel.
- **Internal links, at least three, in the body text**, with descriptive anchor text (never "click
  here" or "this page"). At least one must go to a neighbourhood guide (`/unionville-markham/`), a
  service page (`/services/first-time-buyers/`), `/buyers/` or `/sellers/`. Link to an existing blog
  post (`/blog/<slug>/`) when one is genuinely relevant. Other useful pages: `/neighbourhoods/`,
  `/map-of-markham/`, `/market-reports/`, `/contact/`. Every internal link ends with a slash. Only link
  to pages that exist: check `src/content/` and `src/pages/`.
- External links are optional in the body. When used, link the primary source on the phrase that
  cites it, https only.
- End with a short practical section (what to do next, a checklist, or questions to ask), then one
  sentence inviting the reader to [contact us](/contact/). No hard sell.
- Keyword use must read naturally. Never repeat the exact primary keyword more than about once per
  300 words.

## 8. Fact check before publishing

After writing, go through the post line by line, including the takeaway and every FAQ answer:

1. List every factual claim: numbers, percentages, dollar amounts, dates, deadlines, eligibility
   rules, names of programmes, laws, organisations and places, travel times, distances.
2. For each one, find the exact sentence on a source page you opened this run that supports it. If
   you cannot, rewrite the claim so it is supported, or delete it.
3. Recalculate every worked example and every table total yourself.
4. Check that "Markham" facts are really about Markham and not Toronto (for example, Toronto has a
   municipal land transfer tax and Markham does not).
5. Check place facts against the neighbourhood guides in `src/content/neighbourhoods/`. If a post
   and a guide disagree, the post must match the guide or leave the claim out.
6. Read the whole post once more purely for house style and the banned phrases in section 5.

## 9. Topic list and log

In `BLOG-TOPICS.md` change the topic's `- [ ]` to `- [x]` and add the slug after it.

Append to `BLOG-LOG.md`:

```markdown
## 2026-09-18, land-transfer-tax-markham

- Primary keyword: land transfer tax Markham
- Words: 1,540
- Sources checked: ontario.ca land transfer tax page (rates and refund), ...
- Claims verified: 14. Claims removed because they could not be verified: 1 (describe)
- Needs owner attention: none
```

## 10. Commit and push

```bash
git add src/content/blog/<slug>.mdx BLOG-TOPICS.md BLOG-LOG.md
git status --short   # must list only those three files
git commit -m "Blog: <post h1>"
git pull --rebase origin main
npm run verify       # again, if the rebase brought in changes
git push origin main
```

Never force push. Never push with a failing `npm run verify`. If the push is rejected twice, stop and
record it in the log.

Finish the run with a four line summary: the post title, its URL
(`https://kirbychanmarkham.com/blog/<slug>/`), the primary keyword and anything that needs the
owner's attention.
