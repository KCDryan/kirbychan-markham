# Blog log

One entry per blog run, newest at the bottom. See `BLOG-PLAYBOOK.md`, section 9.

## 2026-09-17, first batch (written and fact checked in the owner's session)

- Posts: land-transfer-tax-markham, closing-costs-buying-home-markham, fhsa-and-home-buyers-plan, markham-go-train-commute, markham-property-tax, condo-status-certificate-markham
- Each post was researched from primary sources by one writer, then every claim was re-opened and checked by a separate fact checker
- Claims removed because they could not be verified: an 8% sales tax figure on mortgage insurance premiums, "statement of adjustments" proration wording, a "generally $16,000" FHSA room statement, an indexing statement on the $100 status certificate fee
- Follow-up commit the same morning: H1 changed to include the keyword ("Joint tenancy or tenants in common: how Ontario co-buyers take title"), added the refund page's spouse rule (no refund to either spouse if one owned an eligible home while they were spouses) and removed two unsourced frequency words
- IndexNow: 200 for 3 URLs. The post URL still returned 404 a little over three minutes after the push, while the Cloudflare Pages build was still in progress
- Needs owner attention: the first commit (e6c812f) went in under the github-actions[bot] noreply email, because the scheduled prompt takes the email from `git log -1` and the latest commit is the daily listing counts bot. This will repeat every run. Change the prompt to use KCDryan@users.noreply.github.com directly

## 2026-09-20, downsizing batch of three (owner's session)

- Posts: sell-first-or-buy-first-downsizing-markham, how-long-downsizing-takes-markham, what-downsizing-clients-taught-us
- All three set `guide: downsizing-markham` and link to the guide, written to strengthen the pillar page while it sits at the bottom of page one for "markham downsizing"
- The experience post is built only on material the team already publishes: the five client stories in `src/data/client-stories.json` and Kirby's published role and approach. No sales volume, years in business or client anecdote was invented, and the published prices were left on the guide and the client stories page rather than repeated without their dates
- Follow-up commit the same morning: H1 changed to include the keyword ("Joint tenancy or tenants in common: how Ontario co-buyers take title"), added the refund page's spouse rule (no refund to either spouse if one owned an eligible home while they were spouses) and removed two unsourced frequency words
- IndexNow: 200 for 3 URLs. The post URL still returned 404 a little over three minutes after the push, while the Cloudflare Pages build was still in progress
- Needs owner attention: the first commit (e6c812f) went in under the github-actions[bot] noreply email, because the scheduled prompt takes the email from `git log -1` and the latest commit is the daily listing counts bot. This will repeat every run. Change the prompt to use KCDryan@users.noreply.github.com directly

## 2026-09-21, mortgage-stress-test-markham

- Primary keyword: mortgage stress test canada
- Words: about 1309 in the body
- Sources checked: OSFI minimum qualifying rate page (5.25% floor, 2% buffer, annual review, straight switch rule, page dated January 29, 2026), FCAC Preparing to get a mortgage (stress test for insured and uninsured, 39% GDS, 44% TDS, refinance and HELOC), FCAC down payment page (minimum down payment tiers, insurance under 20% down), Finance Canada December 15, 2024 and September 2024 releases ($1.5 million insured cap, 30 year amortization, insured switch at renewal)
- Claims verified: 18. Claims removed because they could not be verified: 1 (that renewing with the same lender needs no stress test). FCAC's down payment page still says insurance is unavailable at $1 million or more, which contradicts its own table and Finance Canada, so the post cites Finance Canada for the cap
- Worked example payments and incomes recalculated in code
- Follow-up commit the same morning: H1 changed to include the keyword ("Joint tenancy or tenants in common: how Ontario co-buyers take title"), added the refund page's spouse rule (no refund to either spouse if one owned an eligible home while they were spouses) and removed two unsourced frequency words
- IndexNow: 200 for 3 URLs. The post URL still returned 404 a little over three minutes after the push, while the Cloudflare Pages build was still in progress
- Needs owner attention: the first commit (e6c812f) went in under the github-actions[bot] noreply email, because the scheduled prompt takes the email from `git log -1` and the latest commit is the daily listing counts bot. This will repeat every run. Change the prompt to use KCDryan@users.noreply.github.com directly

## 2026-09-21, closing-day-ontario-markham

- Written on the owner's request in a session on a second computer, as a second Monday post the same day
- Primary keyword: closing day ontario
- Words: about 1,490 in the body
- Sources checked: CMHC newcomer guide PDF (closing day sequence, certified cheque, 30 to 90 day closing), CMHC closing and moving day page, CMHC home cost page (insurance in place on closing, adjustments), LawPRO buying and selling guide (6:00 p.m. deadline, business day, busy dates, title searches, undertakings, tax split, rental equipment, Toronto only municipal LTT), ontario.ca land registry overview (electronic registration), ontario.ca land transfer tax and first-time buyer refund pages ($4,000, electronic affidavit, 9 months, 18 months), RECO pre-closing visits, RECO Bulletin 7.1 (lockbox codes), RECO buyer's checklist, FCAC home insurance (loss payee clause), City of Markham property tax FAQ (supplementary bill on new homes), tax account changes and water billing pages
- Claims verified: 24. Claims removed because they could not be verified: 4 (lenders requiring insurance as a general statement, late funds as the most common cause of delays, closings usually finishing well before 6:00 p.m., pre-closing visit clauses being common). FSRA's title insurance page returned 403, so title insurance is covered only by a link to the closing costs post. LawPRO's statement that registry offices close at 5:00 p.m. was left out as likely outdated under electronic registration
- Follow-up commit the same morning: H1 changed to include the keyword ("Joint tenancy or tenants in common: how Ontario co-buyers take title"), added the refund page's spouse rule (no refund to either spouse if one owned an eligible home while they were spouses) and removed two unsourced frequency words
- IndexNow: 200 for 3 URLs. The post URL still returned 404 a little over three minutes after the push, while the Cloudflare Pages build was still in progress
- Needs owner attention: the first commit (e6c812f) went in under the github-actions[bot] noreply email, because the scheduled prompt takes the email from `git log -1` and the latest commit is the daily listing counts bot. This will repeat every run. Change the prompt to use KCDryan@users.noreply.github.com directly

## 2026-10-02, eight downsizing and seniors posts from the SEO audit

- Written on the owner's request ("create everything" after the October 2 SEO audit), each by a research writer working from primary sources, then checked with check-style, check-blog and npm run verify
- selling-a-parents-house-markham. Keyword: selling parents house markham. Sources: ontario.ca power of attorney, guardianship, probate and long-term care pages, Substitute Decisions Act (e-Laws), CRA principal residence and Folio S1-F3-C2. Left out: Land Registry requirements for attorney sales (only a 1994 bulletin found), principal residence rules for vacant homes
- power-of-attorney-sell-house-ontario. Keywords: can power of attorney sell a house ontario, selling without power of attorney. Sources: ontario.ca power of attorney, guardianship, OPGT and probate pages, Substitute Decisions Act sections, O. Reg. 100/96. Left out: joint ownership mechanics, OPGT fees and timelines, attorney compensation
- life-lease-housing-markham. Keywords: life lease markham, 55+ communities markham. Sources: ontario.ca life lease guide (updated January 7, 2026), O. Reg. 88/04 land transfer tax exemption, OHRC age and housing policy, CAO status certificates, Bethany Lodge (Bethany Courts named factually). Note: OHRC says only 65+ housing is protected, so age rules are described neutrally with advice to see a lawyer
- markham-seniors-property-tax-relief. Keyword: markham property tax seniors deferral. Sources: markham.ca senior tax relief and tax relief and rebates pages (2026 rules), york.ca, CRA and ontario.ca Senior Homeowners' Property Tax Grant (up to $500). Left out: whether interest applies to deferrals
- condo-vs-retirement-home-markham. Keywords: condo vs retirement home, retirement homes markham cost. Sources: ontario.ca care options and long-term care pages ($70.00 a day basic co-payment from July 1, 2026), RHRA FAQ and register, CAO fees and status certificates, markham.ca tax bill, TRREB mw2608. Left out: all retirement home prices
- retiring-in-markham. Keyword: retiring in markham. Sources: Oak Valley Health, YRT fares and On-Request 65+, GO seniors, ontario.ca seniors transit tax credit, markham.ca older adults pages, Markham Public Library. No "good place" judgements
- parent-moving-to-retirement-home-house. Keyword: moving parents to retirement home what to do with house. Sources: CRA principal residence (change in use, 45(2) election), T776, Residential Tenancies Act and standard lease, ontario.ca long-term care co-payments. Left out: rent guideline, vacant home insurance specifics, vacancy tax
- stay-or-sell-aging-in-place-ontario. Keywords: aging in place grants ontario, renovate or downsize. Sources: CRA Home Accessibility Tax Credit, Multigenerational Home Renovation Tax Credit, Budget 2025 measures, Ontario Seniors Care at Home Tax Credit, 2023 Ontario fact sheet (Seniors' Home Safety Tax Credit ended after 2022), markham.ca permits. Left out: York Region homeowner grants (none open confirmed), renovation costs
- Needs owner attention: none beyond normal review. The OHRC note on age-restricted housing is worth reading before promoting the life lease post

## 2026-10-06, eight posts dated October 3 to 6 (two a day)

- Written on the owner's request, each by a research writer (Sonnet) from primary sources, then checked with check-style, check-blog and npm run verify
- title-insurance-ontario (Oct 3). Keyword: title insurance ontario. Sources: FSRA Understanding Title insurance (opened in a browser and checked line by line, since the writer was blocked), FCAC Buying a home. Left out: premium amounts
- markham-water-bill (Oct 3). Keyword: markham water bill. Sources: markham.ca rates page, Alectra billing pages. Left out: due dates, late fees, account setup fee
- principal-residence-exemption-downsizing (Oct 4). Keyword: principal residence exemption downsizing. Sources: CRA principal residence page, Folio S1-F3-C2. Left out: inclusion rate, penalties
- condo-fees-markham (Oct 4). Keyword: condo fees markham. Sources: Condominium Act 1998, CAO pages. Left out: any typical fee amounts
- home-inspection-ontario-buyers (Oct 5). Keyword: home inspection ontario. Sources: ontario.ca, RECO, CMHC, FCAC. Left out: Home Inspection Act 2017 status, Tarion
- deposit-on-a-house-ontario (Oct 5). Keyword: deposit on a house ontario. Sources: RECO deposit insurance, FAQ and Bulletin 8.1, FCAC, Tarion, ontario.ca. Left out: typical deposit percentage, the trust deposit timing rule
- selling-house-in-probate-ontario (Oct 6). Keyword: selling house in probate ontario. Sources: ontario.ca apply for probate, estate administration tax. Left out: listing before the certificate is issued
- estate-administration-tax-ontario (Oct 6). Keyword: estate administration tax ontario. Source: ontario.ca Estate Administration Tax (one source only; the return page and the Act would not load). Worked example recalculated: $9,150 on $660,000
- Needs owner attention: the probate and estate tax posts are law heavy and worth a read; the "15 business days" probate figure is ontario.ca's "typically"

## 2026-10-07, no post published (Wednesday, selling a home in Markham)

- Topic considered: Selling your Markham home: a step by step timeline (left unticked)
- Reason: WebFetch to reco.on.ca, ontario.ca, canada.ca, cmhc-schl.gc.ca and markham.ca all returned EGRESS_BLOCKED from the network egress proxy, so no primary source page could be opened this run. WebSearch snippets are not an opened page, so nothing could be cited or verified
- Claims verified: 0
- Needs owner attention: the egress proxy allowlist for this environment needs the government and regulator domains in playbook section 4 (reco.on.ca, ontario.ca, canada.ca, cmhc-schl.gc.ca, markham.ca at minimum) before posts can resume

## 2026-10-07, real-estate-commission-ontario

- Topic taken from Wednesday: How real estate commission works in Ontario. The earlier no-post entry for today (selling timeline) was a blocked-sources run on the cloud environment; this run ran locally with working access
- Primary keyword: real estate commission ontario
- Words: about 1,650 in the body
- Sources checked (each re-opened and every quoted sentence matched against the page text): RECO consumer page on signing a contract with a brokerage, RECO Bulletin 2.3 (representation agreements), RECO Bulletin 6.2 (remuneration clause in an agreement of purchase and sale), CRA GST/HST in special cases, CRA GST/HST place of supply (13% for Ontario)
- Claims verified: 37 quoted sentences matched. Claims removed because they could not be verified: what happens to commission if a deal does not close (no primary source found, now only a checklist question), Competition Bureau material (investigation notice only), statute and regulation section numbers (e-Laws pages would not render, so every legal requirement is attributed to RECO and not to the Act). Worked example ($800,000 at 4% of the first $500,000 plus 3% of the rest, $29,000, HST $3,770, total $32,770) recalculated and labelled as made-up rates
- Needs owner attention: no statute or regulation text was read, so the post says what RECO says the rules require. The HST line assumes the brokerage is registered and that Ontario's 13% place-of-supply rate applies, and the post says so. Concurrent npm run verify runs from other sessions in this folder collided with this run's build and Tina schema check until they finished; the final verify passed with nothing else running

## 2026-10-09, porting-mortgage-canada-when-you-move-up

- Friday theme: upsizing. Topic taken: Porting a mortgage in Canada when you move up
- Skipped first: "Bridge financing explained for move-up buyers" (left unticked). Reason: the FCAC bridge page returned 404 and the searches surfaced only lender, broker and content-site pages, which the playbook does not allow as sources. `sell-first-or-buy-first-downsizing-markham` already explains bridge financing in its body and FAQ, so the topic would repeat that post.
- Primary keyword: porting a mortgage canada
- Words: about 1,017 in the body (below the 1,200 target; only two primary pages could be opened for this topic, so nothing was padded)
- Sources opened this run: FCAC "Reduce prepayment penalties" (page details date October 15, 2025; first fetch timed out, retry succeeded) and CMHC "Mortgage loan insurance portability" (no effective date on the page, copyright 2026). FCAC "Choosing a mortgage" timed out and was not used.
- Claims verified: 22 against the two pages. Claims removed because they could not be verified on an opened page: that porting spares you from breaking your contract, that a transfer to another lender cannot be ported, and that the lender must be asked before you list or make an offer (these came from search snippets only). The $3,000 interest figure in FCAC's example was recalculated and checks out.
- Worked premium credit example is labelled as illustrative ($10,000 premium is made up; only CMHC's percentages are used).
- Needs owner attention: the CMHC portability page says a request must be received within 6 months of the original closing date, and also says insurance is portable beyond 2 years. The post states both and says the lender or CMHC must confirm which applies. Please check this with CMHC before promoting the post.
- verify: passed (house style, blog, photos, translations, tina lock, build, links, thin pages)

## 2026-10-12, no post published (Monday, first time home buyers)

- Topic taken: Offer dates and bidding in Ontario: how multiple offers work (left unticked). Primary keyword: multiple offers ontario
- A post was written and fact checked but not published, because `npm run verify` fails at the house style step on a file this run did not create: `src/content/blog/quick/best-commuter-towns-by-train-in-the-gta.mdx` contains the American spelling "realize" (line 54 of the file, reported as line 52 of the body). That file arrived in commit 4b93d55 on October 9, 2026 from tinacloud-app[bot] ("TinaCMS content update"). Playbook section 2 says not to fix it, so nothing was changed. `npm run check:blog` passed with the new post in place; the build, link and thin page steps were never reached
- The draft is saved outside the repository at `/Users/ryanchan/Kirby Chan Markham/blog-drafts/multiple-offers-ontario-how-they-work.mdx` (about 1,550 words, 9 sections, so one needs merging to meet the 5 to 8 rule). It must be checked against the sources again before any later run publishes it
- Sources opened this run, all reco.on.ca: Competing offers (buyers), About open offers, Bulletin 4.1 Number and content of competing offers, Bulletin 4.2 Managing a delayed offer presentation process, Inquiring about the number of offers on a property, TRESA FAQs, Know the risks of representing yourself, Bulletin 2.4 Dealing with a self-represented party, Signing a contract with a real estate brokerage. Each page was downloaded again after the writer finished and every claim matched against the page text
- Claims verified: 40. Reworded after the check: 7 (for example, Bulletin 4.2 says a delayed presentation "depends on" communicating the date and time, not that it must be communicated). Left out because no opened page supports them: that a seller may accept, reject or counter any offer, brokerage record keeping for offers, pre-emptive offers (Bulletin 4.3 not opened), any statute or regulation section number, any Markham bidding statistic
- Needs owner attention: change "realize" to "realise" in the quick post above (or fix it in TinaCMS, where it was written), otherwise every scheduled blog run will stop at the same step. Posts saved through TinaCMS are not passing the house style check before they reach main

## 2026-10-13, two posts at the owner's request

- multiple-offers-ontario-how-they-work. Keyword: multiple offers ontario. This is the draft written on October 12 (saved then outside the repository because verify failed on a Tina post). Re-checked this run against nine reco.on.ca pages reopened today; eight cited. Reworded or cut: open bidding in the media, "no rules for how it is conducted", RECO fee and scope claim. Merged to eight sections
- selling-a-house-in-markham-timeline. Keyword: selling a house in markham. Sources opened: RECO signing a contract with a brokerage, RECO seller's checklist, RECO competing offers, RECO open offers, CRA principal residence page. Left out: commission rates, days on market, prices, typical condition lengths, TRESA clause numbers. Steps 4, 6 and 7 carry no source of their own, so I cut the process detail that no opened page supports and kept the stage names and the RECO checklist items
- Fixed one word in the Tina post best-commuter-towns-by-train-in-the-gta ("realize" to "realise") so the house style check passes again. It stopped the October 12 run
- Needs owner attention: Tina posts that fail the house style check stop every scheduled blog run. Cloudflare repairs them in its own build, but a local run does not. The timeline post's marketing step is thin

## 2026-10-14, no post published (Wednesday, selling)

- Topic taken: Seller property disclosure in Ontario: what you must say (left unticked). Primary keyword: seller disclosure ontario. Slug planned: seller-disclosure-ontario-markham
- Skipped first (left unticked): "Pricing a home in Markham: how comparable sales work" (no primary source explains comparable sales or listing price; only brokerage and content sites, which the playbook bans); "Preparing a Markham home for sale" (RECO seller's checklist is the only primary page and has a few sentences); "What a listing agreement commits you to under TRESA" (same question and RECO sources as real-estate-commission-ontario); "Building permits in Markham ... open permit" (markham.ca pages opened say when a permit is needed but nothing about open permits or what they do to a sale). "Best time of year to sell" and "What a seller pays at closing" were not researched this run
- A draft was written (about 1,445 words, 8 sections) and `npm run check:blog` passed with it, but it was not published because `npm run verify` fails at the house style step on a file this run did not create: `src/content/blog/quick/greensborough-markham-homes-for-sale-why-the-train.mdx` line 29 has an em dash in a source name. That file arrived in commit a116011 on October 13, 2026 from tinacloud-app[bot] ("TinaCMS content update"). Playbook section 2 says not to fix it
- The draft is saved outside the repository at `/Users/ryanchan/Kirby Chan Markham/blog-drafts/seller-disclosure-ontario-markham.mdx`. Sources opened: RECO Bulletins 7.3 (material facts), 7.4 (facts a seller has a legal obligation to disclose), 7.5 (stigmas), 3.1 (disclosures, consents and acknowledgements), RECO seller's checklist, markham.ca building permit process. Several claims (latent and patent defect definitions, buyer beware, stigma examples, litigation after closing) were matched only against fetch summaries, not verbatim page text, so the draft must be re-checked against the full RECO pages before any later run publishes it
- Claims left out because no opened page supports them: what an open permit does to a sale, Markham penalties for unpermitted work, effective dates for Bulletins 7.4 and 3.1, OREA Form 299
- Needs owner attention: (1) fix the em dash in the Greensborough quick post (in TinaCMS or the file), otherwise every scheduled blog run will stop at the same step. This is the second Tina post in a week to fail the house style check. (2) That same post cites another brokerage's directory ("Greater Toronto Home Pros / The Polsinello Team") as a source, which BLOG-PLAYBOOK section 4 does not allow

## 2026-10-16, no post published (Friday, upsizing)

- Topic not taken. `npm run verify` fails at the house style step before any writing, on a file this run did not create: `src/content/blog/quick/greensborough-markham-homes-for-sale-why-the-train.mdx` line 29 has an em dash in a source name. The same failure stopped the October 14 run. Playbook section 2 says not to fix files outside the three allowed, so nothing was researched or written
- Sources opened this run: none
- Needs owner attention: fix the em dash in that Greensborough quick post (in TinaCMS or the file), otherwise every scheduled blog run will keep stopping at the same step. It also cites another brokerage's directory as a source, which BLOG-PLAYBOOK section 4 does not allow

## 2026-10-16, townhouse-to-detached-markham-costs

- Second Friday run. The Tina blocker from this morning is cleared: the Greensborough em dash was fixed in PR #3 (0951a91) and `npm run verify` passed on main before writing
- Skipped first (left unticked again): "Bridge financing explained for move-up buyers". The FCAC bridge financing page still returns 404, and a search limited to canada.ca, cmhc-schl.gc.ca, fsrao.ca, osfi-bsif.gc.ca and ontario.ca found no consumer page that explains bridge loans (only the Canadian Armed Forces relocation directive and CMHC insurance pages). `sell-first-or-buy-first-downsizing-markham` already covers bridge financing in its body and FAQ
- Topic taken: From townhouse to detached in Markham: what the step up costs
- Primary keyword: townhouse to detached markham
- Words: about 1,260 including tables
- verify: passed after one fix (the upsizing service link first pointed to /services/upsizing/, which does not exist; changed to /upsizing-markham/)
- Sources opened this run: TRREB Market Watch September 2026 PDF (Markham rows for detached, link, semi, att/row/townhouse and condo townhouse, plus the Markham MLS HPI detached benchmark), ontario.ca Calculating land transfer tax (updated April 22, 2026), FCAC Saving for a down payment (page details 2025-10-15), Department of Finance release of December 15, 2024 (insured price cap raised to $1.5 million, 30 year amortization for first-time buyers and new builds), CMHC Mortgage loan insurance costs (premium table, Ontario PST note)
- Claims verified: 31. Worked figures recalculated: land transfer tax on $1,380,000 ($24,075), minimum down payments at $1,380,000, $1,499,000 and $1,500,000 ($113,000, $124,900, $300,000), CMHC premium at 91.8% loan to value ($50,680), the price gaps ($463,010 on medians, $556,180 on averages) and the worked example table. The equity example ($920,000 sale, $450,000 mortgage, $45,000 costs) is labelled as made up
- Claims removed because they could not be verified on a page opened this run: that Markham has no municipal land transfer tax (true per the existing LTT post, but no page opened today says so), that move-up buyers generally cannot get the first-time refund, a description of how the MLS HPI works, and the 25 year amortization limit for other insured buyers
- Needs owner attention: the FCAC down payment page still contains a sentence saying insurance is unavailable at $1 million or more, which contradicts its own table and the Department of Finance $1.5 million cap. The post follows the Department of Finance and the FCAC table. September figures are one month and small samples (30 townhouse sales), and the post says so

## 2026-10-19, joint-tenancy-tenants-in-common-ontario

- Monday, first time buyers. `npm run verify` passed on clean main before writing
- Skipped first (left unticked): "York Region schools: how to confirm a school boundary" (same intent as the quick posts york-region-school-boundary-map-finding-your-childs and wismer-commons-school-boundary-what-buyers, both from the last ten days); "Markham townhouses: freehold or condo" (covered by the quick post freehold-townhouse-markham-condo-fees-what-buyers-miss and by townhouse-to-detached-markham-costs)
- Topic taken: Buying a home with family members on title in Ontario
- Primary keyword: joint tenancy tenants in common ontario
- Words: 1,366 in the body, including tables
- Sources opened this run: Conveyancing and Law of Property Act s. 13 and Partition Act ss. 2 and 3 (e-Laws, read in the in-app browser because WebFetch gets an empty JavaScript shell), ontario.ca land registration bulletin 2000-6 (survivorship application and the Family Law Act s. 26(1) severance statement), ontario.ca first-time homebuyer land transfer tax refund page (proportional refund and parent and child example), ontario.ca estate administration tax page (jointly owned assets excluded). The statutes were matched against the rendered page text in the browser and the three ontario.ca pages against raw text pulled with curl, not against fetch summaries
- Claims verified: 18. Removed because no opened page supports them: HBP and FHSA limits for co-buyers (CRA pages opened did not address buying with others), what happens to a tenant in common's share at death, severance in general, that the lawyer decides the title wording or registers the transfer on closing day, and a line that many buyers sign co-ownership agreements
- verify: passed after one fix (the draft linked /services/first-time-buyers/, which does not exist; changed to /first-time-home-buyers-markham/)
- Follow-up commit the same morning: H1 changed to include the keyword ("Joint tenancy or tenants in common: how Ontario co-buyers take title"), added the refund page's spouse rule (no refund to either spouse if one owned an eligible home while they were spouses) and removed two unsourced frequency words
- IndexNow: 200 for 3 URLs. The post URL still returned 404 a little over three minutes after the push, while the Cloudflare Pages build was still in progress
- Needs owner attention: the first commit (e6c812f) went in under the github-actions[bot] noreply email, because the scheduled prompt takes the email from `git log -1` and the latest commit is the daily listing counts bot. This will repeat every run. Change the prompt to use KCDryan@users.noreply.github.com directly

## 2026-10-19, queued selling-a-house-in-ontario-costs, to publish 2026-10-28

- Wednesday, selling. Primary keyword: selling a house in ontario costs (was seller closing costs ontario; slug renamed from seller-closing-costs-ontario in the follow-up pass below). Topic: "What a seller pays at closing in Ontario"
- Skipped first: pricing and comparable sales, preparing a home for sale and the listing agreement (same reasons as the October 14 entry); best time of year to sell (would need monthly sales totals, which these drafts do not state)
- Different from the closest posts: markham-downsizing-costs covers a downsizer's sale and purchase together, and real-estate-commission-ontario covers commission only. This one covers what comes off a sale price: commission HST, prepayment penalties (FCAC), the Markham tax certificate fee, the buyer paying land transfer tax, CRA principal residence reporting and the non-resident 10 day notice and 25% holdback
- Sources opened: RECO seller's checklist and Bulletin 6.2, CRA GST/HST special cases and rate calculator, FCAC reduce your prepayment penalties, ontario.ca land transfer tax, CRA principal residence page, CRA disposing of certain Canadian property, markham.ca tax account changes
- Removed because no opened page supports them: the late designation penalty amount, who orders the tax certificate, how adjustments are split. The worked example is labelled as illustrative

## 2026-10-19, queued older-homes-markham-what-to-check, to publish 2026-10-30

- Friday, upsizing. Primary keyword: older homes in markham. Topic: "Buying a detached home in Markham: what to check on older houses"
- Skipped first: bridge financing (still no primary consumer page, as logged October 16)
- Different from the closest post: home-inspection-ontario-buyers covers what an inspection is. This one covers checks specific to older houses from sources it does not use: ESA on knob and tube and aluminum wiring, Health Canada on asbestos, Markham on pre-1953 lead service lines, the Private Plumbing Protection Rebate amounts and 2027 deadlines, the building permit list, the four heritage districts and Tree By-law 2023-164
- Sources opened: esasafe.com knob and tube and aluminum wiring pages, Health Canada asbestos and your health, markham.ca tap water quality, basement flooding prevention, building permit process, heritage districts, tree permit application

## 2026-10-19, queued conditions-in-an-offer-ontario, to publish 2026-11-02

- Monday, first time buyers. Primary keyword: conditions in an offer in ontario. Topic: "Conditions in an Ontario offer: financing, inspection and status certificate"
- Skipped first: York Region school boundaries and Markham townhouses (same reasons as this morning's entry)
- Different from the closest posts: home-inspection-ontario-buyers, condo-status-certificate-markham and multiple-offers-ontario-how-they-work each cover one piece. This one covers how conditions work as a set: CMHC on changing or cancelling the offer if a condition is not met, FCAC on why a pre-approval is not final approval, RECO on waiving conditions
- Sources opened: CMHC making an offer and closing the deal (PDF, read as page images), CMHC making an offer to purchase a home, CMHC condominium buyer's guide chapter 4, FCAC getting preapproved, RECO buyer's checklist and home inspections, ontario.ca what to know before buying a home, CAO status certificates
- Left out: typical condition lengths and what happens to the deposit when a condition fails (no opened page states them). The CMHC offer PDF is dated 2011, so confirm it is still current before publishing
- Needs owner attention for all three: BLOG-TOPICS.md was not ticked (this session was told not to edit it), so tick these three topics before another writer picks them. `npm run verify` stops at check:blog in this environment because `node_modules/yaml` is missing; run `npm ci` and then `npm run verify`. No new photos were used, so photo-credits.json is unchanged

## 2026-10-19, follow-up pass on the three queued drafts

- Wrote `research/markham-blog-map.md` (target query, required internal links and sources for each draft) and edited each post to it: target query verbatim in title, description, first paragraph, H1 and an H2; titles 60 characters or fewer; descriptions 145 to 155; every required link present and pointing at a built page or a published post
- Publishing order is now selling costs 2026-10-28, older homes 2026-10-30, conditions 2026-11-02
- Needs owner attention: tick `BLOG-TOPICS.md` as noted above

## 2026-10-21, not published selling-a-house-in-ontario-costs

- Wednesday run (Grokbot). Earliest draft was selling-a-house-in-ontario-costs (queued for 2026-10-28). Its photo hold is cleared: 0139200 replaced the 72ad8b6 photo
- Pre-publish checks passed: every dated figure re-read on its source today (13% Ontario HST, FCAC penalty rule, Markham tax certificate fee $146.00 as of January 1, 2026, CRA 10 day notice, $25 a day penalty with $100 minimum and $2,500 maximum, 25% or 50% holdback, Schedule 3 and T2091(IND)); target query in title, description, first paragraph, H1 and an H2; title 53 and description 148 characters; all five required links present; FAQ and sources filled; own photo, alt text and credit present and not used on the Toronto or North York sites
- Not published: `npm run verify` fails at check:style on a file this run did not touch, `src/content/blog/quick/neighborhood-built-from-relocated-buildings-what-to-know.mdx` (TinaCMS commit dbe169c, 2026-10-20), with 9 American spellings ("neighborhood"). The draft edit was reverted and nothing was pushed

### Needs owner attention

- Fix the American spellings in that quick post (in TinaCMS or the file), or have Claude make `npm run verify` apply the same quick post fixes the Cloudflare build applies. Until then every scheduled publish stops at the same step

- 2026-10-21, selling-a-house-in-ontario-costs, published (delayed from 8am by verify failure on quick post, fixed in 21fb446)

## 2026-10-23, multigenerational-home-markham

- Friday, upsizing. Primary keyword: multigenerational home markham. Topic: "Multigenerational homes in Markham: what buyers ask for"
- Skipped first: bridge financing (again no primary consumer page on canada.ca, cmhc-schl.gc.ca or fsrao.ca); older homes is already written and queued for 2026-10-30, so it is left unticked until it goes live; school catchments (two quick posts from the last ten days already cover York Region and Wismer boundaries)
- Different from the closest posts: legal-basement-suite-vs-finished-basement covers suite registration and stay-or-sell-aging-in-place names the MHRTC. This one is the purchase angle: full MHRTC eligibility (qualifying individual and relation, one claim per lifetime, unit must be newly created, purchase price not listed as an expense), CMHC Refinance terms for adding a suite (since January 15, 2025, 90% LTV, under $2,000,000, up to 4 units, 30 years, no rentals under 90 days) and Markham's three units per lot rule
- Words: about 1,400 body
- Sources checked: CRA MHRTC overview, who can claim and expenses pages; CMHC Refinance page; Department of Finance October 2024 secondary suites release; markham.ca registration of basement apartments and second suites
- Claims verified: 26, each against raw page text this run. Left out because no opened page confirmed them: Markham garden suite and coach house rules, Ontario ARU rules (ontario.ca returned 403), any property tax reduction for family-occupied units, the Canada Secondary Suite Loan Program
- Draft written by a Sonnet subagent and fact checked by the main run. Links fixed before publishing: Cornell quick post (draft), older homes post (future dated) and /services/upsizing/ (does not exist, used /upsizing-markham/)
- Needs owner attention: none
