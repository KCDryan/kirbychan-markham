# Keyword research

Researched 20 September 2026 from Google's own autocomplete for Canada
(`suggestqueries.google.com`, `hl=en&gl=ca`), which returns the queries Google actually completes
for real users. That is demand evidence rather than opinion. It does not give search volumes.

**What this file cannot tell you.** Autocomplete shows that a query exists and is common enough to
suggest. It does not rank queries against each other. Real volumes and our own positions need Google
Search Console, which is the one source that reports what this site is already being shown for. Once
that data exists, check these targets against it and correct anything this file got wrong.

Method, to repeat it:

```
curl -s "https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=ca&q=SEED"
```

---

## The ten to target

Ordered by how much they are worth to this business, weighing commercial intent against how
realistic the fight is for a domain this young.

| # | Query | Why | Page that owns it |
| --- | --- | --- | --- |
| 1 | downsizing markham | Bottom of funnel, the pillar, already on page one | `/downsizing-markham/` |
| 2 | markham real estate agent | The core commercial term for the business | `/` |
| 3 | markham land transfer tax | Rich suggestion set, high intent, we already rank-worthy | `/blog/land-transfer-tax-markham/` |
| 4 | markham property tax | The richest local suggestion set found | `/blog/markham-property-tax/` |
| 5 | markham house prices / average home price | Repeat research intent, feeds the valuation page | `/market-reports/`, `/home-valuation/` |
| 6 | first time home buyer ontario (+ down payment, rebate, land transfer tax) | Large family of long-tails, Markham as the context | `/first-time-home-buyers-markham/` |
| 7 | markham condo prices / condo fees | Strong condo demand, feeds downsizing and first time buyers | `/blog/condo-status-certificate-markham/`, neighbourhood pages |
| 8 | selling a house in ontario (+ costs, taxes, calculator) | High intent seller research | `/sellers/` |
| 9 | best neighbourhood in markham / best area in markham | Top of funnel but genuinely ours to win | `/neighbourhoods/` |
| 10 | markham townhouse / markham condo for sale | Inventory intent, honest handling only | neighbourhood pages, parent site search |

## What the data actually said

**"first time home buyer markham" returns no suggestions at all.** Neither does "markham first
time" or "first time home buyer york region". The city qualified phrase has almost no demand. What
does have demand is the provincial family:

```
first time home buyer ontario down payment
first time home buyer ontario rebate
first time home buyer ontario land transfer tax
first time home buyer ontario requirements
first time home buyer ontario incentive
first time home buyer ontario rrsp
first time home buyer ontario calculator
first time home buyer incentive ontario 2026
```

That is why `/first-time-home-buyers-markham/` is built around those questions with Markham prices
as the worked example, rather than around the phrase "first time home buyer Markham". Chasing the
city phrase would be optimising for a query nobody types.

**"markham property tax" is the richest local seed found.** Suggestions include the rate, the 2026
rate, due dates 2026, the calculator, lookup, login, payment and the 2026 increase. We already have
a post. It is worth keeping current every year and adding the calculator and due date angles.

**"markham land transfer tax" is nearly as rich**, including "land transfer tax toronto vs markham"
and "does markham have land transfer tax". Both are questions our existing post answers directly and
both have obvious commercial value, because the honest answer favours buying here.

**"downsizing markham" autocompletes to "downsizing diva markham" and "downsizing diva markham
reviews".** That is the competitor with brand demand, which is a different fight from the generic
term and not one worth picking.

**Two seeds are poisoned and should be dropped as targets.**

- *moving to markham* completes almost entirely to the Honda Indy moving to Markham. The search
  intent behind that phrase is now a motor race, not relocation.
- *markham realtor* completes to a news story about a realtor who died. Do not build a page for it.
  "markham real estate agent" is the clean equivalent and is what the home page already targets.

**"upsizing" has essentially no property demand.** It completes to clothing, jewellery and the film.
"upsizing house" exists but is weak. If we write for move-up buyers, the language people actually use
is bigger house, move up, or the specific step ("townhouse to detached").

**"sell my house markham" and "markham home valuation" return nothing**, while "markham home value"
and "selling a house in ontario" do. Worth wording the valuation and seller pages around value and
the provincial seller phrases rather than the city command phrase.

**"best neighbourhood in markham" and "best area in markham" are real**, and this site has twelve
neighbourhood guides. That is a genuine asset and the kind of query where our depth beats a
competitor's single page.

## Rules that follow from this

1. **Target the query that exists, not the one that reads well.** The Markham qualifier helps on
   downsizing and property tax. It hurts on first time buyers, where Ontario is the real unit.
2. **Check a seed before building a page on it.** Two of the seven daily themes turned out to have
   polluted or absent demand, which we only found by looking.
3. **Do not chase a competitor's brand.** "downsizing diva markham" is their name.
4. **Revisit once Search Console has data.** Everything above is demand evidence with no volumes
   attached, and our own impressions will beat it as a guide to what to write next.
