# Markham blog map

Written 2026-10-19 for kirbychanmarkham.com. The site has 39 published full posts and 26 published quick posts. This map covers the three full drafts written today and now in the queue. Each entry fixes the target query, the pages the post must link to and the sources it relies on, so a publishing agent can check a post against it.

Read before using it:
- **Query evidence is Google autocomplete only** (`KEYWORDS.md`, researched 2026-09-20). There are no search volumes. Autocomplete could not be re-run today (network calls to suggestqueries.google.com need approval in this environment), so nothing below adds new demand evidence.
- **The three targets are not in `KEYWORDS.md`** (each topic says so). The file has no query for seller costs beyond the "selling a house in ontario (+ costs)" family, and none for older houses or offer conditions. Those targets follow `KEYWORDS.md` rule 1 (Ontario is the real unit for buying and selling rules, Markham helps on local topics) and `SEO-PLAYBOOK.md` section 5 (specific beats broad). Check them in Search Console once there is data.
- **Competitors were not pulled.** No search tool returned Canadian results today. Check the real SERP before briefing a rewrite.
- **The gate a publishing agent applies:** the target query appears verbatim in the title, meta description, first paragraph, H1 and at least one H2. Title 60 characters or fewer. Description 155 or fewer (145 to 155 aimed for). Every link listed under "Must link" is in the body. FAQ filled in. Sources listed (the layout renders them as a visible Sources section). Any image has alt text (none of these posts has a body image; card photos take their alt text from `src/data/photo-credits.json`).
- **Playbook limits apply to every post** (`BLOG-PLAYBOOK.md`): every figure from a primary source opened that day, no predictions, no sold data, no city-wide price or sales totals, no school or safety claims, no claim about who a place suits, no brokerage names in the body.

## Already targeted, so not used here

| Query | Owner |
| --- | --- |
| selling a house in markham | `/blog/selling-a-house-in-markham-timeline/` |
| home inspection ontario | `/blog/home-inspection-ontario-buyers/` |
| real estate commission ontario | `/blog/real-estate-commission-ontario/` |

## Link targets

- **Money pages:** `/buyers/`, `/sellers/`, `/home-valuation/`, `/neighbourhoods/`, `/services/<slug>/` (downsizing, upsizing, first-time-buyers, relocation, luxury, investors, new-construction, estate-sales, separation-and-divorce).
- **Pillar guides:** `/upsizing-markham/`, `/first-time-home-buyers-markham/`, `/downsizing-markham/`, `/relocating-to-markham/`, `/new-construction-markham/`, `/investment-property-markham/`.
- **Neighbourhood guides:** `/<slug>-markham/` for unionville, markham-village, cornell, berczy-village, cathedraltown, wismer, greensborough, angus-glen, box-grove, thornhill, milliken-mills, downtown.
- **Listing pages:** `/homes-for-sale/<area>/` for the eleven areas in `src/lib/proptx.ts` (not downtown) and `/homes-for-sale/<type>/` for bungalows, condos, townhouses, houses.
- **Hubs and tools:** `/best-markham-neighbourhoods-for-downsizing/`, `-families/`, `-commuters/`, `/land-transfer-tax-calculator-markham/`, `/mortgage-calculator-markham/`, `/markham-house-prices/`, `/map-of-markham/`, `/contact/`.
- **Blog posts:** link only posts that are already published. Never link one queued draft from another, because a slipped publish date would leave a broken link.

## The three topics, in publishing order

### 1. What a seller pays
- **Used:** drafted 2026-10-19 as `seller-closing-costs-ontario`, renamed `selling-a-house-in-ontario-costs` (draft, to publish 2026-10-28).
- **Target query:** selling a house in ontario costs. From the `KEYWORDS.md` family "selling a house in ontario (+ costs, taxes, calculator)"; the bare phrase stays with `/sellers/`.
- **Must link:** `/sellers/`, `/home-valuation/`, `/blog/real-estate-commission-ontario/`, `/blog/closing-day-ontario-markham/`, `/land-transfer-tax-calculator-markham/`
- **Extras:** `/blog/sell-first-or-buy-first-downsizing-markham/`, `/blog/porting-mortgage-canada-when-you-move-up/`, `/blog/principal-residence-exemption-downsizing/`, `/contact/`
- **Sources:** RECO seller's checklist and Bulletin 6.2, CRA GST/HST pages, FCAC prepayment penalties, ontario.ca land transfer tax, CRA principal residence and section 116 pages, markham.ca tax account changes.

### 2. Older houses for move-up buyers
- **Used:** drafted 2026-10-19 as `older-homes-markham-what-to-check` (draft, to publish 2026-10-30).
- **Target query:** older homes in markham. Not in `KEYWORDS.md`; the file says move-up buyers search the specific step rather than "upsizing".
- **Must link:** `/upsizing-markham/`, `/buyers/`, `/blog/home-inspection-ontario-buyers/`, `/blog/townhouse-to-detached-markham-costs/`, `/unionville-markham/`, `/markham-village-markham/`, `/thornhill-markham/`
- **Extras:** `/contact/`
- **Sources:** ESA knob and tube and aluminum wiring, Health Canada asbestos, markham.ca tap water, basement flooding, building permits, heritage districts and tree permits.

### 3. Conditions in an offer
- **Used:** drafted 2026-10-19 as `conditions-in-an-offer-ontario` (draft, to publish 2026-11-02).
- **Target query:** conditions in an offer in ontario. Not in `KEYWORDS.md`; it follows rule 1 there (Ontario, not Markham, for buying rules).
- **Must link:** `/buyers/`, `/first-time-home-buyers-markham/`, `/blog/home-inspection-ontario-buyers/`, `/blog/condo-status-certificate-markham/`, `/blog/multiple-offers-ontario-how-they-work/`
- **Extras:** `/blog/mortgage-stress-test-markham/`, `/blog/deposit-on-a-house-ontario/`, `/contact/`
- **Sources:** CMHC offer pages and condominium guide, FCAC preapproval, RECO buyer's checklist and home inspections, ontario.ca buying guidance, CAO status certificates. The CMHC offer PDF is dated 2011: confirm it before publishing.

## Next step

Before each publish date, re-open the dated sources (FCAC, CAO, Markham fees and rebate deadlines), then run `npm run verify`. All three topics need autocomplete evidence added to `KEYWORDS.md` when someone next runs the method there.

## Three more topics, drafted 2026-10-21

Written to bring the draft queue to six. Autocomplete was re-run on 2026-10-21 with the method in `KEYWORDS.md` and the suggestions are noted under each topic. No volumes. Two candidate topics were dropped because existing pages already own the intent: bridge financing (`/upsizing-markham/` and `/blog/sell-first-or-buy-first-downsizing-markham/`) and listing agreements (`/blog/real-estate-commission-ontario/` covers what the agreement must say, holdover and termination). Each draft has the placeholder date 2026-10-21. Set the real publish date when it is scheduled.

### 4. Seller disclosure
- **Used:** drafted 2026-10-21 as `seller-disclosure-ontario` (draft).
- **Target query:** seller disclosure in ontario. Autocomplete for "seller disclosure ontario" returns "seller disclosure form ontario" and "seller disclosure requirements". "spis ontario" and "latent defect ontario" (with "latent defect disclosure ontario") also complete.
- **Must link:** `/sellers/`, `/home-valuation/`, `/blog/home-inspection-ontario-buyers/`, `/blog/condo-status-certificate-markham/`, `/blog/selling-a-house-in-markham-timeline/`
- **Extras:** `/blog/selling-a-parents-house-markham/`, `/contact/`
- **Sources:** RECO Bulletins 7.3 (material facts), 7.4 (seller's legal obligation to disclose) and 7.5 (stigmas), RECO property information statements page, O. Reg. 567/05 ss. 1 and 22.1 to 22.3, ontario.ca what to know before buying a home. RECO says the seller's own duty comes from case law, so the post quotes RECO's summary and sends readers to a lawyer.

### 5. Selling with a tenant in place
- **Used:** drafted 2026-10-21 as `selling-tenanted-property-ontario` (draft).
- **Target query:** selling a tenanted property in ontario. Autocomplete for "selling tenanted property ontario" returns "selling a tenanted property ontario" and "can i sell my rental property with tenants in it ontario".
- **Must link:** `/sellers/`, `/home-valuation/`, `/investment-property-markham/`, `/services/investors/`, `/blog/selling-a-house-in-markham-timeline/`
- **Extras:** `/blog/principal-residence-exemption-downsizing/`, `/contact/`
- **Sources:** Residential Tenancies Act, 2006 (ss. 18, 27, 37, 39, 49, 49.1, 55.1, 57, 72, 106, current consolidation from September 21, 2026), LTB Interpretation Guideline 12, N12 instructions, LTB brochure on ending a tenancy, ontario.ca renting in Ontario, CRA Guide T4036. The 120 day no-compensation rule from September 21, 2026 applies to own-use notices only: the LTB brochure's purchaser table contradicts the statute, so the post follows the statute and the N12 form.

### 6. Foreign buyers
- **Used:** drafted 2026-10-21 as `ontario-non-resident-speculation-tax` (draft).
- **Target query:** ontario non-resident speculation tax. Autocomplete for "non resident speculation tax ontario" returns "ontario non resident speculation tax nrst", "ontario non resident speculation tax exemption" and "non resident speculation tax act ontario".
- **Must link:** `/buyers/`, `/relocating-to-markham/`, `/services/relocation/`, `/blog/land-transfer-tax-markham/`, `/land-transfer-tax-calculator-markham/`, `/blog/closing-day-ontario-markham/`
- **Extras:** `/contact/`
- **Sources:** ontario.ca NRST main, exemptions, rebates and refunds and transitional provisions pages, ontario.ca calculating land transfer tax, CMHC page on the Prohibition on the Purchase of Residential Property by Non-Canadians Act.
- **Re-check before publishing:** the federal ban was announced as extended to January 1, 2027. No primary source found on 2026-10-21 confirmed a further extension. Update that paragraph once the federal position is known. The main ontario.ca NRST page still carries outdated federal dates, so do not cite it for the ban.

## A fourth topic, drafted 2026-10-21

Added the same day to bring the draft queue to seven. It is the `BLOG-TOPICS.md` idea "Capital gains on an inherited home in Ontario". Autocomplete was re-run on 2026-10-21 with the method in `KEYWORDS.md`. No volumes. Two other candidates were dropped because existing pages already own the intent: MPAC appeals (`/blog/markham-property-tax/` covers the Request for Reconsideration) and the condo cooling-off period (the quick post on buying pre-construction covers it). The draft has the placeholder date 2026-10-21. Set the real publish date when it is scheduled.

### 7. Capital gains on an inherited home
- **Used:** drafted 2026-10-21 as `capital-gains-inherited-property-ontario` (draft).
- **Target query:** capital gains on inherited property in ontario. Autocomplete for "capital gains on inherited property ontario" returns "capital gains on inherited house ontario", "capital gains tax on inherited property ontario", "do you pay capital gains on inherited property ontario" and "who pays capital gains on inherited property canada ontario". "inherited property capital gains canada" also completes.
- **Must link:** `/selling-an-estate-home-markham/` (`/services/estate-sales/` 301s to it, so link the guide directly), `/sellers/`, `/home-valuation/`, `/blog/principal-residence-exemption-downsizing/`, `/blog/selling-house-in-probate-ontario/`, `/blog/estate-administration-tax-ontario/`
- **Extras:** `/blog/selling-a-parents-house-markham/`, `/contact/`
- **Sources:** CRA capital gains page for someone who died (deemed disposition, spousal rollover, T1255, recapture), CRA principal residence page, Guide T4037 Capital Gains 2025 (inclusion rate 50% for 2025, inherited cost, outlays and expenses), Income Tax Folio S1-F3-C2 (ordinarily inhabited, personal trust categories after 2016), T3 Trust Guide (Schedule 1, trust inclusion rate), CRA clearance certificate page.
- **Re-check before publishing:** the inclusion rate for the year of death. T4037 for 2025 gives 50% and the proposed increase was dropped in 2025, but no CRA page opened on 2026-10-21 stated the 2026 rate. The estate guide deliberately says little about capital gains; this post is where that detail lives, so the guide could link to it once it is published.
