import { firstTimeRelief, ontarioLtt, torontoMltt } from './ltt.ts';
/**
 * The HTML for one listing page at /listing/<key>/, built by functions/listing/[key].ts and poured
 * into the built shell page. Pure and escaped: every value from the feed goes through esc().
 *
 * The written sections cover every kind of home on the search: houses, bungalows, townhouses and
 * condos, for sale or for rent, in Markham or one of the nearby cities. A sentence about condo
 * fees or a status certificate is written only when the listing is a condo.
 */
export type Listing = {
  key: string;
  price: number | null;
  address: string | null;
  city: string | null;
  community: string | null;
  beds: number | null;
  baths: number | null;
  type: string | null;
  style?: string | null;
  lease?: boolean;
  brokerage: string | null;
  remarks?: string | null;
  crossStreet?: string | null;
  tour?: string | null;
  photos?: string[];
  facts?: Record<string, unknown>;
  photo?: string | null;
};
export type Area = { slug: string; name: string; path: string; intro: string; transit: string; bands: { band: string; range: string; what: string }[]; faq?: { q: string; a: string }[] };
/** TRREB Market Watch figures for Markham by home type, from src/data/trreb-monthly.json. */
export type Market = { period: string; report: string; byType: { type: string; sales: number; average: number; median: number }[] };
export type Sold = { price: number | null; date: string | null };
export type Gone = { key: string; address: string | null; community: string | null; city: string | null; lease: boolean };
export type PageInput = {
  origin: string;
  phone?: { label: string; href: string };
  /** The live listing. Null once it has left the feed. */
  listing: Listing | null;
  /** What we remembered about a listing that has left the feed. */
  gone?: Gone;
  area?: Area;
  market?: Market;
  similar: Listing[];
  /** Where the similar homes were searched: a neighbourhood name or a city. */
  similarIn?: string;
  /** Only ever set for a signed-in visitor: sold data stays behind sign-in. */
  sold?: Sold;
  signedIn: boolean;
};

export const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const money = (n: unknown) => (typeof n === 'number' && n > 0 ? '$' + Math.round(n).toLocaleString('en-CA') : '');
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const an = (next: string) => (/^(8|11|18|[aeiou])/i.test(next) ? 'an' : 'a');
const clip = (t: string, max: number) => (t.length <= max ? t : t.slice(0, t.lastIndexOf(' ', max - 1)).replace(/[\s,;:.|]+$/, ''));
/** The lead sentence plus as many of the following sentences as fit, so a description never stops mid-phrase. */
const fitSentences = (lead: string, tails: string[], max: number) => tails.reduce((t, x) => (`${t} ${x}`.length <= max ? `${t} ${x}` : t), clip(lead, max));
/** "25 Main Street N, Markham, ON L3P 1X2" reads as "25 Main Street N" in a heading. */
const short = (address: string) => address.split(',')[0].trim() || address;
/** TRREB writes Toronto with its district, for example "Toronto C14". Empty when the feed gives no city. */
const cityOf = (city: string | null | undefined) => (city ?? '').replace(/\s+[CEW]\d{2}$/, '').trim();
/** For naming a page only ("Home in Markham"). A sentence about a home uses cityOf, so it never states a city the feed did not give. */
const cityName = (city: string | null | undefined) => cityOf(city) || 'Markham';
const num = (v: unknown) => (typeof v === 'number' && v > 0 ? v : typeof v === 'string' && Number(v) > 0 ? Number(v) : 0);
/** A feed list as words. "None" is how the feed says the list is empty. */
const listOf = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).map(String) : typeof v === 'string' && v ? [v] : []).filter((x) => !/^(none|n\/a|unknown)$/i.test(x.trim()));
const words = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const jsonLd = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

/**
 * What to call the home, whether condo rules apply and which TRREB Market Watch row it compares with.
 * A raised bungalow is not called a bungalow, matching the search (it has stairs at the front door).
 */
export function kindOf(type: string | null | undefined, style?: string | null): { noun: string; condo: boolean; trreb?: string; schema: string } {
  const t = (type ?? '').trim();
  const bungalow = (style ?? '').split(',').some((s) => ['Bungalow', 'Bungaloft'].includes(s.trim()));
  if (t === 'Condo Apartment') return { noun: 'condo apartment', condo: true, trreb: 'Condo apartment', schema: 'Apartment' };
  if (t === 'Condo Townhouse') return { noun: 'condo townhouse', condo: true, trreb: 'Condo townhouse', schema: 'House' };
  if (t === 'Att/Row/Townhouse') return { noun: 'townhouse', condo: false, trreb: 'Freehold townhouse', schema: 'House' };
  if (t === 'Detached') return { noun: bungalow ? 'detached bungalow' : 'detached house', condo: false, trreb: 'Detached', schema: 'House' };
  if (t.startsWith('Semi-Detached')) return { noun: bungalow ? 'semi-detached bungalow' : 'semi-detached house', condo: false, trreb: 'Semi-detached', schema: 'House' };
  return { noun: 'home', condo: /^(condo|co-op|co-ownership|common element)/i.test(t), schema: 'Accommodation' };
}

/** Federal minimum down payment (FCAC), the same rule as the mortgage calculator page. */
export const minDown = (price: number) => (price >= 1500000 ? price * 0.2 : price <= 500000 ? price * 0.05 : 25000 + (price - 500000) * 0.1);

const LABELS: Record<string, string> = {
  LivingAreaRange: 'Square feet', ApproximateAge: 'Approximate age', DirectionFaces: 'Faces', TaxAnnualAmount: 'Property tax',
  TaxYear: 'Tax year', KitchensTotal: 'Kitchens', RoomsTotal: 'Rooms', ParkingTotal: 'Parking spaces', LotWidth: 'Lot width',
  LotDepth: 'Lot depth', LotSizeUnits: 'Lot measured in', GarageType: 'Garage', HeatType: 'Heating', Cooling: 'Cooling', Locker: 'Locker',
  PetsAllowed: 'Pets', Exposure: 'Exposure', ArchitecturalStyle: 'Style', AssociationFeeIncludes: 'Fee includes',
  AssociationAmenities: 'Building amenities', BalconyType: 'Balcony', LaundryFeatures: 'Laundry', ParkingFeatures: 'Parking',
  InteriorFeatures: 'Interior features', PropertyFeatures: 'Features', View: 'View', LegalStories: 'Floor',
};
/** A count that goes stale between visits. */
const SKIP = new Set(['DaysOnMarket']);
const show = (k: string, v: unknown) =>
  Array.isArray(v) ? v.join(', ') : ['TaxAnnualAmount', 'AssociationFee'].includes(k) ? money(v) : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);

const priceOf = (c: Listing) => money(c.price) + (c.lease && c.price ? ' a month' : '');
const nameOf = (c: Listing) => c.address ?? `Home in ${c.community ?? cityName(c.city)}`;
/** A card for another listing. Each one names its listing brokerage, as every listing on this site does. */
const card = (c: Listing) => `<li class="lp-card"><a href="/listing/${esc(c.key)}/">${
  c.photo && /^https:\/\//.test(c.photo) ? `<img src="${esc(c.photo)}" alt="${esc(nameOf(c))}" width="640" height="480" loading="lazy" referrerpolicy="no-referrer">` : ''
}<strong>${esc(priceOf(c))}</strong><span>${esc(nameOf(c))}</span><span>${esc(
  [c.beds != null && plural(c.beds, 'bedroom'), c.baths != null && plural(c.baths, 'bathroom'), c.type].filter(Boolean).join(' · '),
)}</span><span>Listed by ${esc(c.brokerage || 'the listing brokerage')}. MLS® ${esc(c.key)}</span></a></li>`;

function areaBlock(a: Area | undefined): string {
  if (!a) return `<section class="lp-area"><h2>Markham homes and neighbourhoods</h2><p>This site covers Markham neighbourhood by neighbourhood, with TRREB prices, housing and transit for each one. The search also lists homes in the cities around Markham.</p><p><a href="/neighbourhoods/">Markham neighbourhood guides</a> · <a href="/markham-house-prices/">Markham house prices</a> · <a href="/homes-for-sale/">All Markham homes for sale</a></p></section>`;
  return `<section class="lp-area"><h2>About ${esc(a.name)}</h2><p>${esc(a.intro)}</p>${a.transit ? `<p><strong>Transit:</strong> ${esc(a.transit)}</p>` : ''}${
    a.bands.length
      ? `<table><thead><tr><th>Property type</th><th>Median</th><th>Sales and average</th></tr></thead><tbody>${a.bands
          .map((b) => `<tr><td>${esc(b.band)}</td><td>${esc(b.range)}</td><td>${esc(b.what)}</td></tr>`)
          .join('')}</tbody></table><p>Figures from TRREB's community housing market report, as listed in our ${esc(a.name)} guide.</p>`
      : ''
  }${
    a.faq?.length ? `<h3>Questions about ${esc(a.name)}</h3>${a.faq.map((f) => `<h4>${esc(f.q)}</h4><p>${esc(f.a)}</p>`).join('')}` : ''
  }<p><a href="${esc(a.path)}">Read the ${esc(a.name)} neighbourhood guide</a> · <a href="/homes-for-sale/${esc(a.slug)}/">All ${esc(a.name)} homes for sale</a></p></section>`;
}

/**
 * The written sections of a live listing page. Every sentence is built from the listing's own
 * fields, the tax and down payment rules this site already cites or TRREB's published Markham
 * figures, so a page can never say something about a home that the feed did not say.
 */
function sections(l: Listing, place: string, market: Market | undefined): { html: string; faq: { q: string; a: string }[] } {
  const f = l.facts ?? {};
  const price = num(l.price);
  const lease = l.lease === true;
  const city = cityOf(l.city);
  const toronto = city === 'Toronto';
  const { noun, condo, trreb } = kindOf(l.type, l.style);
  const fee = num(f.AssociationFee);
  const tax = num(f.TaxAnnualAmount);
  const size = typeof f.LivingAreaRange === 'string' ? f.LivingAreaRange : '';
  const parking = num(f.ParkingTotal);
  const garage = listOf(f.GarageType).map((x) => x.toLowerCase());
  const locker = condo ? listOf(f.Locker)[0] ?? '' : '';
  const lot = num(f.LotWidth) && num(f.LotDepth) && typeof f.LotSizeUnits === 'string' ? `${num(f.LotWidth).toLocaleString('en-CA')} by ${num(f.LotDepth).toLocaleString('en-CA')} ${f.LotSizeUnits.toLowerCase()}` : '';
  const includes = listOf(f.AssociationFeeIncludes).map((x) => x.replace(/ Included$/i, '').toLowerCase());
  const amenities = listOf(f.AssociationAmenities).map((x) => x.toLowerCase());
  const age = f.ApproximateAge ? String(f.ApproximateAge) : '';
  const comes = [parking ? plural(parking, 'parking space') : '', locker ? `a locker (${locker.toLowerCase()})` : ''].filter(Boolean).join(' and ');
  const feeLabel = condo ? 'Maintenance fee' : 'Monthly fee on the listing';
  const faq: { q: string; a: string }[] = [];
  const out: string[] = [];

  // The home in a paragraph.
  const what = `${l.beds != null ? `${l.beds} bedroom ` : ''}${noun}`;
  const where = [l.community ? `in TRREB's ${l.community} community` : '', city ? `in ${city}` : ''].filter(Boolean).join(' ');
  const lead = [
    `${place} is ${an(what)} ${what}${where ? ` ${where}` : ''}, listed ${lease ? 'for rent' : 'for sale'}${price ? ` at ${money(price)}${lease ? ' a month' : ''}` : ''}.`,
    l.baths != null || size ? `The listing shows ${[l.baths != null && plural(l.baths, 'bathroom'), size && `${size} square feet`].filter(Boolean).join(' and ')}.` : '',
    lot ? `The lot is listed as ${lot}.` : '',
    comes ? `It comes with ${comes} according to the listing.` : '',
    garage.length ? `The garage is listed as ${words(garage)}.` : '',
    l.crossStreet ? `The nearest main intersection given is ${l.crossStreet}.` : '',
    age ? `The approximate age on the listing is ${age}${/\d/.test(age) ? ' years' : ''}.` : '',
  ].filter(Boolean).join(' ');
  out.push(
    `<h2>About this ${noun}</h2><p>${esc(lead)}</p><p>These details come from the listing brokerage through TRREB's MLS® System and are not guaranteed. Measurements, parking and what is included should be checked at a showing${
      lease ? ' and written into the lease' : condo ? ', against the status certificate and in the agreement of purchase and sale' : ' and written into the agreement of purchase and sale'
    }.</p>`,
  );
  if (amenities.length) out.push(`<p><strong>Building amenities on the listing:</strong> ${esc(words(amenities))}.</p>`);

  if (lease) {
    out.push(
      `<h2>What to check before you apply</h2><ol><li><strong>Ask what the rent includes.</strong> Confirm which utilities you pay${parking ? ` and whether the ${esc(plural(parking, 'parking space'))} on the listing ${parking === 1 ? 'is' : 'are'} part of the rent` : ' and what parking comes with the home'}.</li><li><strong>Confirm the dates.</strong> Ask for the earliest move-in date and the length of the lease.</li><li><strong>Ask what the landlord needs with an application.</strong> Have it ready before the showing.</li><li><strong>See it in person.</strong> ${l.tour ? 'The listing has a virtual tour, but ' : ''}photos do not show noise, light at different hours or the condition of the home.</li></ol>`,
    );
    faq.push({ q: `How do I book a showing for ${place}?`, a: `Use the form on this page or call us. Quote MLS® ${l.key}. We will confirm the listing is still available and arrange a time with the listing brokerage.` });
    faq.push({ q: `Is ${place} still for rent?`, a: `This page is refreshed from TRREB's MLS® System through the day. If the listing is leased or withdrawn the page says so. Contact us to confirm before you make plans.` });
    return { html: out.join(''), faq };
  }

  // Which taxes apply depends on the city, so a listing with no city gets no tax figures.
  if (price && city) {
    const on = ontarioLtt(price);
    const to = toronto ? torontoMltt(price) : 0;
    const relief = firstTimeRelief(on, to);
    const down = minDown(price);
    out.push(
      `<h2>What it costs to buy ${esc(place)}</h2><p>At the asking price of ${money(price)}, a buyer ${
        toronto
          ? 'in the City of Toronto pays two land transfer taxes on closing: the Ontario tax and the Toronto municipal tax.'
          : `in ${esc(city)} pays Ontario land transfer tax on closing. The City of Toronto is the Ontario municipality that charges a municipal land transfer tax of its own, so there is no second tax here.`
      }</p>` +
        `<table><tbody><tr><th>Asking price</th><td>${money(price)}</td></tr><tr><th>Ontario land transfer tax</th><td>${money(on)}</td></tr>${
          toronto ? `<tr><th>Toronto municipal land transfer tax</th><td>${money(to)}</td></tr><tr><th>Both taxes</th><td>${money(on + to)}</td></tr>` : ''
        }<tr><th>First-time buyer refund, if you qualify</th><td>up to ${money(relief)}</td></tr><tr><th>Minimum down payment</th><td>${money(down)}</td></tr></tbody></table>` +
        `<p>The down payment figure is the federal minimum: ${price >= 1500000 ? '20 percent of the price, which applies at $1.5 million or more' : price <= 500000 ? '5 percent of the price' : '5 percent of the first $500,000 and 10 percent of the rest'}. A lender can ask for more. These figures use the asking price, so they change if you pay more or less. The tax is worked out at the published rates for a home with one or two single family residences and your lawyer confirms the final amount. Legal fees, title insurance and adjustments are extra: our <a href="/blog/closing-costs-buying-home-markham/">closing costs guide</a> lists them. This is general information, not legal or tax advice. Confirm the figures with a lawyer or accountant. You can change the price in our <a href="/land-transfer-tax-calculator-markham/">land transfer tax calculator</a> and our <a href="/mortgage-calculator-markham/">mortgage calculator</a>.</p>`,
    );
    faq.push({
      q: `How much is land transfer tax on ${place}?`,
      a: toronto
        ? `At the asking price of ${money(price)} the Ontario tax is ${money(on)} and the Toronto tax is ${money(to)}, ${money(on + to)} in total. A first-time buyer who qualifies can get up to ${money(relief)} back. Confirm the final figures with your lawyer.`
        : `At the asking price of ${money(price)} the Ontario land transfer tax is ${money(on)}. ${city} has no municipal land transfer tax. A first-time buyer who qualifies can get up to ${money(relief)} back. Confirm the final figure with your lawyer.`,
    });
    faq.push({ q: `What is the minimum down payment for ${place}?`, a: `${money(down)} at the asking price of ${money(price)}, under the federal minimum down payment rules. A lender may require more.` });
  }

  if (fee || tax) {
    out.push(
      `<h2>What it costs to own each month</h2><table><tbody>${fee ? `<tr><th>${feeLabel}</th><td>${money(fee)} a month</td></tr>` : ''}${tax ? `<tr><th>Property tax${f.TaxYear ? ` (${esc(f.TaxYear)})` : ''}</th><td>${money(tax)} a year, about ${money(tax / 12)} a month</td></tr>` : ''}${fee && tax ? `<tr><th>Fee and tax together</th><td>about ${money(fee + tax / 12)} a month</td></tr>` : ''}</tbody></table>` +
        `<p>${fee && includes.length ? `The listing says the fee includes ${esc(words(includes))}. ` : ''}That is before a mortgage payment, home insurance and ${fee ? 'any utilities the fee does not cover' : 'utilities'}. ${
          fee && condo
            ? `A condo corporation sets its fees in each year's budget, so the amount can change. The status certificate shows the current fee, the budget behind it and the reserve fund.`
            : fee
              ? 'Ask the listing brokerage what this fee pays for and who sets it.'
              : 'These are the figures on the listing, so check the current tax bill before you rely on them.'
        }</p>`,
    );
    if (fee) faq.push({ q: `What is the ${feeLabel.toLowerCase()} at ${place}?`, a: `The listing shows ${money(fee)} a month${includes.length ? `, including ${words(includes)}` : ''}. ${condo ? 'Check the current fee in the status certificate.' : 'Ask the listing brokerage what it pays for.'}` });
    if (tax) faq.push({ q: `How much is the property tax on ${place}?`, a: `The listing shows ${money(tax)} a year${f.TaxYear ? ` for ${String(f.TaxYear)}` : ''}, about ${money(tax / 12)} a month.` });
  }

  const row = city === 'Markham' && trreb ? market?.byType.find((x) => x.type === trreb) : undefined;
  if (price && market && row && row.median > 0 && row.sales > 0) {
    const diff = price - row.median;
    const what = row.type.toLowerCase();
    const report = /^\/[a-z0-9/-]+\/$/.test(market.report) ? market.report : '';
    out.push(
      `<h2>How the asking price compares</h2><p>TRREB's Market Watch recorded ${row.sales} ${esc(what)} sales in Markham in ${esc(market.period)}, at a median of ${money(row.median)}${row.average ? ` and an average of ${money(row.average)}` : ''}. This home is listed at ${money(price)}, which is ${diff === 0 ? 'the same as' : `${money(Math.abs(diff))} ${diff > 0 ? 'above' : 'below'}`} that median.</p>` +
        `<p>A city-wide median covers every size, age and neighbourhood, so it is a reference point and not a valuation of this home. ${condo ? 'Size, floor, parking, condition and the building\'s finances' : 'Lot, size, condition and location'} all move the price. ${report ? `Our <a href="${esc(report)}">${esc(market.period)} market report</a> and our ` : 'Our '}<a href="/markham-house-prices/">Markham house prices</a> page ${report ? 'have' : 'has'} the figures for each home type.</p>`,
    );
    faq.push({ q: `Is ${place} priced above or below the Markham median?`, a: `It is listed at ${money(price)}. TRREB's ${market.period} median for ${what} sales in Markham was ${money(row.median)} across ${row.sales} sales, so the asking price is ${diff === 0 ? 'the same' : `${money(Math.abs(diff))} ${diff > 0 ? 'higher' : 'lower'}`}. The median covers every size and neighbourhood.` });
  }

  const pets = listOf(f.PetsAllowed).join(', ');
  const first = condo
    ? `<li><strong>Order the status certificate.</strong> An Ontario condo corporation must give one within 10 days of receiving the request and the fee, which is capped at $100. It shows the common expenses for this unit, any arrears, the budget, the reserve fund and any legal actions. Our guide explains <a href="/blog/condo-status-certificate-markham/">what a status certificate tells you</a>.</li><li><strong>Have a lawyer read it.</strong> The certificate comes with the declaration, by-laws and rules. Ask what they say about pets, renting the unit and renovations${pets ? `. The listing gives pets as "${esc(pets)}"` : ''}.</li><li><strong>Confirm the parking and locker.</strong> ${comes ? `The listing shows ${esc(comes)}. Ask whether each is owned, exclusive use or rented. Get the unit numbers too.` : 'Ask whether a parking space or a locker comes with the unit and how each is held.'}</li>`
    : `<li><strong>Book a home inspection.</strong> An inspection looks at the parts of a house you cannot judge at a showing. Our guide explains <a href="/blog/home-inspection-ontario-buyers/">what a home inspection covers and misses</a>.</li><li><strong>Ask for the survey.</strong> ${lot ? `The listing gives the lot as ${esc(lot)}. ` : ''}If the seller has a survey, check the lot lines, fences and any easements against it.</li><li><strong>Confirm what stays.</strong> Have the appliances, fixtures and any rented equipment written into the offer.</li><li><strong>Confirm the parking.</strong> ${parking ? `The listing shows ${esc(plural(parking, 'parking space'))}.` : 'Ask what parking comes with the home.'}</li>`;
  out.push(
    `<h2>What to check before you make an offer</h2><ol>${first}<li><strong>Get your financing in writing.</strong> A lender looks at the property tax${fee ? ' and the monthly fee' : ''} as well as the price.</li><li><strong>See it in person.</strong> ${l.tour ? 'The listing has a virtual tour, but ' : ''}photos do not show noise, light at different hours or the condition of ${condo ? 'the hallways and elevators' : 'the roof, the basement and the yard'}.</li></ol><p>Our page on <a href="/buyers/">buying a home in Markham</a> sets out the steps in order. This is general information, not legal advice. Confirm the details with a lawyer.</p>`,
  );
  faq.push({ q: `How do I book a showing for ${place}?`, a: `Use the form on this page or call us. Quote MLS® ${l.key}. We will confirm the listing is still available and arrange a time with the listing brokerage.` });
  faq.push({ q: `Is ${place} still for sale?`, a: `This page is refreshed from TRREB's MLS® System through the day. If the listing sells or is withdrawn the page says so. Contact us to confirm before you make plans.` });
  return { html: out.join(''), faq };
}

/** Title, description, H1 and body for the page. */
export function listingPage(p: PageInput): { title: string; description: string; h1: string; crumb: string; body: string; live: boolean } {
  const l = p.listing;
  const key = l?.key ?? p.gone!.key;
  const address = l?.address ?? p.gone?.address ?? null;
  const community = l?.community ?? p.gone?.community ?? null;
  const city = cityName(l?.city ?? p.gone?.city);
  const lease = l?.lease ?? p.gone?.lease ?? false;
  const place = address ? short(address) : `Home in ${community ?? city}`;
  const areaName = p.area?.name ?? community ?? city;
  const similarIn = p.similarIn ?? areaName;
  const forWhat = lease ? 'for rent' : 'for sale';
  const similar = p.similar.filter((c) => c.key !== key).slice(0, 6);
  const more = similar.length
    ? `<section class="lp-more"><h2>${l ? 'Similar' : 'Current'} homes ${forWhat} in ${esc(similarIn)}</h2><ul class="lp-cards" role="list">${similar.map(card).join('')}</ul></section>`
    : '';
  const cta = `<div class="lp-cta"><a class="btn btn--primary" href="#enquire">Ask a question or book a showing</a>${
    p.phone ? `<a class="btn btn--ghost" href="${esc(p.phone.href)}">Call ${esc(p.phone.label)}</a>` : ''
  }</div>`;

  if (!l) {
    // Sold information is for a signed-in visitor only. Anyone else is pointed at the sign-in page.
    const sold = p.sold && (p.sold.price || p.sold.date)
      ? `<p class="lp-sold"><strong>Sold</strong>${p.sold.price ? ` for ${esc(money(p.sold.price))}` : ''}${p.sold.date ? ` on ${esc(p.sold.date)}` : ''}. Sold information is from TRREB and is shown to signed-in visitors only.</p>`
      : p.signedIn || lease
        ? ''
        : `<p class="lp-signin"><a href="/sold/">Sign in to see sold prices</a> for Markham homes, where TRREB has recorded a sale.</p>`;
    return {
      live: false,
      crumb: place,
      h1: place,
      title: clip(`${place} | No Longer Available`, 60),
      description: fitSentences(`${place}${community ? ` in ${community}` : ''}${cityOf(p.gone?.city) ? `, ${cityOf(p.gone?.city)}` : ''}: this listing is no longer available.`, [`See current homes ${forWhat} in ${similarIn}.`, 'Photos and asking prices from TRREB.'], 160),
      body: `<p class="lp-status">This listing is no longer available. It has left the active listings on TRREB's MLS® System, so its photos, price and description have been taken down.</p>${sold}${cta}${more}${areaBlock(p.area)}<p class="lp-key">MLS® ${esc(key)}</p>`,
    };
  }

  const { noun, schema } = kindOf(l.type, l.style);
  const real = cityOf(l.city);
  const meta = [l.beds != null && plural(l.beds, 'bedroom'), l.baths != null && plural(l.baths, 'bathroom'), l.type].filter(Boolean).join(', ');
  const photos = (l.photos ?? []).filter((u) => /^https:\/\//.test(u));
  const gallery = photos.length
    ? `<div class="lp-photos"><img class="lp-hero" src="${esc(photos[0])}" alt="${esc(place)}, photo 1 of ${photos.length}" width="1920" height="1280" fetchpriority="high" referrerpolicy="no-referrer">${
        photos.length > 1
          ? `<div class="lp-strip" tabindex="0" aria-label="More photos">${photos
              .slice(1)
              .map((u, i) => `<img src="${esc(u)}" alt="${esc(place)}, photo ${i + 2} of ${photos.length}" width="480" height="320" loading="lazy" referrerpolicy="no-referrer">`)
              .join('')}</div>`
          : ''
      }</div>`
    : '';
  const facts = Object.entries(l.facts ?? {}).filter(([k, v]) => !SKIP.has(k) && (!Array.isArray(v) || listOf(v).length > 0));
  const written = sections(l, place, p.market);
  const asking = priceOf(l);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: place,
    url: `${p.origin}/listing/${key}/`,
    ...(photos[0] ? { image: photos.slice(0, 5) } : {}),
    ...(l.price && !lease ? { offers: { '@type': 'Offer', price: l.price, priceCurrency: 'CAD', availability: 'https://schema.org/InStock' } } : {}),
    about: {
      '@type': schema,
      ...(l.beds != null ? { numberOfBedrooms: l.beds } : {}),
      ...(l.baths != null ? { numberOfBathroomsTotal: l.baths } : {}),
      address: { '@type': 'PostalAddress', ...(address ? { streetAddress: short(address) } : {}), ...(real ? { addressLocality: real } : {}), addressRegion: 'ON', addressCountry: 'CA' },
    },
  };
  const long = `${place} | ${asking} | ${areaName}`;
  return {
    live: true,
    crumb: place,
    h1: `${place}: ${noun} ${forWhat}`,
    title: long.length <= 60 ? long : clip(`${place} | ${asking}`, 60),
    description: fitSentences(
      `${place}${community ? `, ${community}` : ''}: ${(meta || noun).toLowerCase()} ${forWhat}${asking ? ` at ${asking}` : ''}${real ? ` in ${real}` : ''}.`,
      lease ? ['Photos and details from the MLS®.', 'Plus similar homes nearby.'] : ['Photos, property tax and land transfer tax.', 'Plus similar homes nearby.'],
      160,
    ),
    body:
      `<p class="lp-price">${esc(asking)}</p><p class="lp-meta">${esc([meta, community, real, l.crossStreet && `near ${l.crossStreet}`].filter(Boolean).join(' · '))}</p>` +
      gallery + cta +
      `<div class="prose">${l.remarks ? `<h2>From the listing brokerage</h2><p>${esc(l.remarks)}</p>` : ''}${
        l.tour && /^https:\/\//.test(l.tour) ? `<p><a href="${esc(l.tour)}" rel="noopener noreferrer nofollow" target="_blank">Virtual tour</a></p>` : ''
      }${
        facts.length
          ? `<h2>Facts on the listing</h2><table><tbody>${facts.map(([k, v]) => `<tr><th>${esc(LABELS[k] ?? (k === 'AssociationFee' ? 'Monthly fee' : k.replace(/([a-z])([A-Z])/g, '$1 $2')))}</th><td>${esc(show(k, v))}</td></tr>`).join('')}</tbody></table>`
          : ''
      }<p class="lp-brokerage">Listing courtesy of ${esc(l.brokerage || 'the listing brokerage')}. MLS® ${esc(key)}.</p></div>` +
      written.html + areaBlock(p.area) + more +
      `<section class="lp-faq"><h2>Questions about ${esc(place)}</h2>${written.faq.map((x) => `<h3>${esc(x.q)}</h3><p>${esc(x.a)}</p>`).join('')}</section>` +
      jsonLd(ld) +
      jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: written.faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) }),
  };
}

// ponytail: self-check, run with `node --experimental-strip-types src/lib/listing-page.ts`.
if (typeof process !== 'undefined' && !!import.meta.filename && import.meta.filename === process.argv[1]) {
  const base = { origin: 'https://x.test', similar: [], signedIn: false };
  const market: Market = { period: 'August 2026', report: '/market-reports/august-2026/', byType: [{ type: 'Detached', sales: 137, average: 1611773, median: 1488000 }, { type: 'Condo apartment', sales: 57, average: 638332, median: 563800 }] };
  const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
  const must = (html: string, wants: string[], what: string) => {
    for (const w of wants) if (!html.includes(w)) throw new Error(`${what}: missing ${w}`);
  };
  const never = (html: string, bans: (string | RegExp)[], what: string) => {
    for (const b of bans) if (typeof b === 'string' ? html.includes(b) : b.test(html)) throw new Error(`${what}: must not say ${b}`);
  };

  const evil = listingPage({ ...base, listing: { key: 'N1234567', price: 899000, address: '1 Main St <b>, Markham, ON', city: 'Markham', community: 'Unionville', beds: 3, baths: 2, type: 'Detached', brokerage: 'A & B <i>', remarks: '<script>x</script>', photos: ['https://img.test/a.jpg', 'javascript:1'], facts: { DaysOnMarket: 4, Basement: ['Finished'] } } });
  never(evil.body, ['<script>x', '<b>', '<i>', 'javascript:', 'Days On Market'], 'escaping');
  must(evil.body, ['Listing courtesy of A &amp; B &lt;i&gt;. MLS® N1234567.', '$899,000', 'Basement'], 'live page');
  if (!evil.live || evil.title.length > 60 || evil.description.length > 160) throw new Error('title or description too long');

  // A detached house in Markham at $1,200,000: Ontario tax 4,475 + 2% of 800,000 = 20,475; no Toronto tax; minimum down 25,000 + 70,000.
  const house = listingPage({ ...base, market, similarIn: 'Unionville', similar: [{ key: 'N7654321', price: 1100000, address: '2 Side St', city: 'Markham', community: 'Unionville', beds: 4, baths: 3, type: 'Detached', brokerage: 'C Realty', photo: 'https://img.test/c.jpg' }], area: { slug: 'unionville', name: 'Unionville', path: '/unionville-markham/', intro: 'Intro.', transit: 'GO.', faq: [{ q: 'Q?', a: 'A.' }], bands: [{ band: 'Detached', range: 'About $1,654,000', what: '26 sales' }] }, listing: { key: 'N1234567', price: 1200000, address: '1 Main St, Markham, ON L3R 1A1', city: 'Markham', community: 'Unionville', beds: 4, baths: 3, type: 'Detached', style: '2-Storey', brokerage: 'X', facts: { TaxAnnualAmount: 6000, TaxYear: 2026, ParkingTotal: 4, LotWidth: 45, LotDepth: 110, LotSizeUnits: 'Feet', GarageType: ['Attached'] } } });
  must(house.body, ['$20,475', 'up to $4,000', '$95,000', '$288,000 below', 'about $500 a month', '45 by 110 feet', 'home inspection', 'Listed by C Realty. MLS® N7654321', 'Similar homes for sale in Unionville', '/unionville-markham/', 'Questions about Unionville', 'no second tax here', 'not legal or tax advice', 'FAQPage', '"@type":"House"'], 'house');
  never(text(house.body), [/status certificate/i, /maintenance fee/i, /condo/i, 'Toronto municipal'], 'house');
  if (house.h1 !== '1 Main St: detached house for sale') throw new Error(house.h1);

  // A condo at $600,000 in Toronto: each tax is 4,475 + 2% of 200,000 = 8,475; relief 4,000 + 4,475; minimum down 25,000 + 10,000.
  const condo = listingPage({ ...base, market, listing: { key: 'C1234567', price: 600000, address: '1 King St 5, Toronto, ON', city: 'Toronto C08', community: 'Moss Park', beds: 2, baths: 2, type: 'Condo Apartment', brokerage: 'X', facts: { AssociationFee: 600, TaxAnnualAmount: 2400, ParkingTotal: 1, Locker: 'Owned', AssociationFeeIncludes: ['Water Included', 'Heat Included'] } } });
  must(condo.body, ['$8,475', '$16,950', 'up to $8,475', '$35,000', 'about $800 a month', 'includes water and heat', 'status certificate', 'Maintenance fee', 'in Toronto, listed for sale'], 'condo');
  never(condo.body, ['How the asking price compares', 'home inspection'], 'a Toronto condo has no Markham comparison');
  const markhamCondo = listingPage({ ...base, market, listing: { key: 'N1234567', price: 563800, address: null, city: 'Markham', community: 'Unionville', beds: 1, baths: 1, type: 'Condo Apartment', brokerage: null, facts: { AssociationFee: 600, AssociationFeeIncludes: ['None'], AssociationAmenities: ['None'] } } });
  must(markhamCondo.body, ['the same as that median', 'Listing courtesy of the listing brokerage. MLS® N1234567.'], 'Markham condo');
  never(markhamCondo.body, [/includes none/i, /amenities on the listing/i, 'Fee includes'], 'an empty feed list was printed');
  if (markhamCondo.h1 !== 'Home in Unionville: condo apartment for sale') throw new Error(markhamCondo.h1);

  const rent = listingPage({ ...base, market, listing: { key: 'N1234567', price: 2800, address: '1 Main St', city: 'Markham', community: 'Cornell', beds: 2, baths: 1, type: 'Att/Row/Townhouse', lease: true, brokerage: 'X', facts: { ParkingTotal: 1 } } });
  must(rent.body, ['$2,800 a month', 'for rent', 'before you apply'], 'rental');
  never(rent.body, [/land transfer/i, /down payment/i, 'How the asking price compares', '"offers"'], 'rental');

  const gone = listingPage({ ...base, listing: null, gone: { key: 'N1234567', address: '1 Main St, Markham, ON', community: 'Unionville', city: 'Markham', lease: false } });
  if (gone.live || !gone.body.includes('no longer available') || !gone.body.includes('/sold/')) throw new Error('gone page');
  never(gone.body, ['Sold</strong>', /\$\d/], 'an off-market page shows no price');
  const sold = listingPage({ ...base, signedIn: true, sold: { price: 580000, date: '2026-09-01' }, listing: null, gone: { key: 'N1234567', address: null, community: null, city: null, lease: false } });
  if (!sold.body.includes('<strong>Sold</strong> for $580,000 on 2026-09-01') || sold.h1 !== 'Home in Markham') throw new Error('sold page');
  // A hidden address stays hidden and a missing city is never filled in: no tax figures, no city in a sentence.
  const bare = listingPage({ ...base, market, listing: { key: 'N1234567', price: 900000, address: null, city: null, community: null, beds: 8, baths: 3, type: 'Detached', brokerage: 'X' } });
  must(bare.body, ['Home in Markham is an 8 bedroom detached house, listed for sale at $900,000.'], 'article and missing city');
  never(bare.body, [/land transfer/i, 'streetAddress', 'addressLocality', 'How the asking price compares'], 'missing city');
  // House style: no dash characters, no exclamation mark and no comma before "and" or "or" in anything we wrote.
  for (const page of [house, condo, markhamCondo, rent, gone, bare]) never(text(page.body), [/[\u2013\u2014!]/, /,\s+(and|or)\b/], 'house style');
  if (minDown(400000) !== 20000 || minDown(700000) !== 45000 || minDown(1500000) !== 300000) throw new Error('minDown');
  if (kindOf('Detached', 'Bungalow-Raised').noun !== 'detached house' || kindOf('Semi-Detached ', 'Bungalow').noun !== 'semi-detached bungalow' || kindOf('Vacant Land').condo) throw new Error('kindOf');
  console.log('listing-page ok', text(house.body).split(/\s+/).length, 'words in the sample house page');
}
