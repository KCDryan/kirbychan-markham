/**
 * PropTx (TRREB) RESO Web API query building, shared by functions/api/listings.ts.
 * Docs: https://developer.ampre.ca/docs/query-options
 *
 * Every value that reaches an OData $filter comes from an allowlist or is parsed as a number,
 * so a visitor can never inject their own filter.
 */
export const PROPTX_BASE = 'https://query.ampre.ca/odata';
export const PAGE_SIZE = 24;

export const CITIES = ['Markham', 'Richmond Hill', 'Vaughan', 'Whitchurch-Stouffville', 'Aurora', 'Newmarket', 'Toronto', 'Pickering'];

/** One-click home types. Values are PropTx's own labels, checked against the live feed. */
export const HOMES: Record<string, { label: string; hint: string; filter: string }> = {
  bungalow: {
    label: 'Bungalows',
    hint: 'Living on one floor',
    // Raised bungalows are left out: they have stairs at the front door.
    filter: "ArchitecturalStyle/any(a:a eq 'Bungalow' or a eq 'Bungaloft')",
  },
  condo: { label: 'Condo apartments', hint: 'Building with an elevator', filter: "PropertySubType eq 'Condo Apartment'" },
  townhouse: { label: 'Townhouses', hint: 'Less upkeep than a house', filter: "PropertySubType in ('Att/Row/Townhouse','Condo Townhouse')" },
  house: { label: 'Houses', hint: 'Detached and semi-detached', filter: "(PropertySubType eq 'Detached' or startswith(PropertySubType,'Semi-Detached'))" },
};

/** Every HOMES button a listing appears under, matching the filters above. A detached bungalow is under both. */
export function homeKinds(r: { PropertySubType?: unknown; ArchitecturalStyle?: unknown }): string[] {
  const sub = String(r.PropertySubType ?? '').trim();
  const styles = Array.isArray(r.ArchitecturalStyle) ? r.ArchitecturalStyle : [];
  const kinds: string[] = [];
  if (styles.includes('Bungalow') || styles.includes('Bungaloft')) kinds.push('bungalow');
  if (sub === 'Condo Apartment') kinds.push('condo');
  if (sub === 'Att/Row/Townhouse' || sub === 'Condo Townhouse') kinds.push('townhouse');
  if (sub === 'Detached' || sub.startsWith('Semi-Detached')) kinds.push('house');
  return kinds;
}

/**
 * Our neighbourhood guides mapped to TRREB community names (PropTx CityRegion), checked against the
 * live feed. Downtown Markham is not a TRREB community, so it has no entry.
 */
export const AREAS: Record<string, { label: string; communities: string[] }> = {
  unionville: { label: 'Unionville', communities: ['Unionville', 'Village Green-South Unionville'] },
  cornell: { label: 'Cornell', communities: ['Cornell'] },
  'berczy-village': { label: 'Berczy Village', communities: ['Berczy'] },
  'markham-village': { label: 'Markham Village', communities: ['Markham Village', 'Old Markham Village'] },
  wismer: { label: 'Wismer', communities: ['Wismer'] },
  greensborough: { label: 'Greensborough', communities: ['Greensborough'] },
  thornhill: {
    label: 'Thornhill',
    communities: ['Thornhill', 'Royal Orchard', 'Aileen-Willowbrook', 'Grandview', 'German Mills', 'Thornlea', 'Bayview Glen'],
  },
  'milliken-mills': { label: 'Milliken Mills', communities: ['Milliken Mills East', 'Milliken Mills West'] },
  'angus-glen': { label: 'Angus Glen', communities: ['Angus Glen'] },
  cathedraltown: { label: 'Cathedraltown', communities: ['Cathedraltown'] },
  'box-grove': { label: 'Box Grove', communities: ['Box Grove'] },
};

export const areaOf = (region: unknown) => Object.keys(AREAS).find((k) => AREAS[k].communities.includes(String(region))) ?? null;

/** One-click price ranges, [min, max]. */
export const PRICES: Record<string, { label: string; min?: number; max?: number }> = {
  u800: { label: 'Under $800,000', max: 800000 },
  '800-1200': { label: '$800,000 to $1.2 million', min: 800000, max: 1200000 },
  '1200-1600': { label: '$1.2 to $1.6 million', min: 1200000, max: 1600000 },
  o1600: { label: 'Over $1.6 million', min: 1600000 },
};

const CARD_FIELDS = [
  'ListingKey', 'ListPrice', 'UnparsedAddress', 'UnitNumber', 'StreetNumber', 'StreetName', 'StreetSuffix',
  'City', 'CityRegion', 'BedroomsTotal', 'BathroomsTotalInteger', 'PropertySubType', 'ArchitecturalStyle', 'TransactionType',
  'ListOfficeName', 'InternetEntireListingDisplayYN', 'InternetAddressDisplayYN', 'ModificationTimestamp',
];

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const int = (v: string | null, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};

/** The filters the active and sold searches share: city, neighbourhood, home type, price band and bedrooms. */
/** Parking spaces and lockers are sold on the MLS® as "Residential Condo & Other", but nobody searching for a home wants them. */
export const NOT_HOMES = "PropertySubType ne 'Parking Space' and PropertySubType ne 'Locker'";

function shared(params: URLSearchParams, priceField: string): string[] {
  const f: string[] = [NOT_HOMES];
  // An unknown city falls back to Markham. It must never drop the city filter and search every city.
  const city = CITIES.find((c) => c === params.get('city')) ?? 'Markham';
  if (city) f.push(`City eq ${q(city)}`);
  const area = city === 'Markham' ? AREAS[params.get('area') ?? ''] : undefined;
  if (area) f.push(`CityRegion in (${area.communities.map(q).join(',')})`);
  const home = HOMES[params.get('home') ?? ''];
  if (home) f.push(home.filter);
  const price = PRICES[params.get('price') ?? ''];
  if (price?.min) f.push(`${priceField} ge ${price.min}`);
  if (price?.max) f.push(`${priceField} le ${price.max}`);
  const beds = int(params.get('beds'), 10);
  if (beds) f.push(`BedroomsTotal ge ${beds}`);
  return f;
}

/** Turns the visitor's search params into a PropTx Property query string. */
export function searchQuery(params: URLSearchParams): string {
  const lease = params.get('for') === 'lease';
  const f = ["ContractStatus eq 'Available'", "startswith(PropertyType,'Residential')", `TransactionType eq ${q(lease ? 'For Lease' : 'For Sale')}`, ...shared(params, 'ListPrice')];
  const page = int(params.get('page'), 400) || 1;
  const order = { low: 'ListPrice asc', high: 'ListPrice desc' }[params.get('sort') ?? ''] ?? 'ModificationTimestamp desc';
  return odata({
    $filter: f.join(' and '),
    $select: CARD_FIELDS.join(','),
    $orderby: `${order},ListingKey`,
    $top: String(PAGE_SIZE),
    $skip: String((page - 1) * PAGE_SIZE),
    $count: 'true',
  });
}

/** Map pins: every match, lightly, a page of 1,000 at a time in a fixed order (PropTx's nextLink fails). */
export const MAP_PAGE = 1000;
export function mapQuery(params: URLSearchParams, page: number): string {
  const lease = params.get('for') === 'lease';
  const f = ["ContractStatus eq 'Available'", "startswith(PropertyType,'Residential')", `TransactionType eq ${q(lease ? 'For Lease' : 'For Sale')}`, ...shared(params, 'ListPrice')];
  return odata({
    $filter: f.join(' and '),
    $select: 'ListingKey,ListPrice,BedroomsTotal,BathroomsTotalInteger,PropertySubType,ArchitecturalStyle,UnparsedAddress,StreetNumber,StreetName,StreetSuffix,StreetDirSuffix,City,StateOrProvince,PostalCode,InternetEntireListingDisplayYN,InternetAddressDisplayYN',
    $orderby: 'ListingKey',
    $top: String(MAP_PAGE),
    $skip: String(page * MAP_PAGE),
  });
}

/** Sold search windows, in days. */
export const SOLD_WINDOWS: Record<string, { label: string; days: number }> = {
  '30': { label: 'Last 30 days', days: 30 },
  '90': { label: 'Last 3 months', days: 90 },
  '365': { label: 'Last 12 months', days: 365 },
  '730': { label: 'Last 2 years', days: 730 },
};
export const SOLD_PAGE_SIZE = 20;
/** PropTx MLS Rules 8.27: at most 100 results for any one search. */
export const SOLD_MAX_RESULTS = 100;

/** VOW sold search. Needs the VOW token: the IDX feed has no sold listings. */
export function soldQuery(params: URLSearchParams, today = new Date()): string {
  const window = SOLD_WINDOWS[params.get('sold') ?? ''] ?? SOLD_WINDOWS['90'];
  const since = new Date(today.getTime() - window.days * 864e5).toISOString().slice(0, 10);
  const f = ["MlsStatus eq 'Sold'", "startswith(PropertyType,'Residential')", "TransactionType eq 'For Sale'", `CloseDate ge ${since}`, ...shared(params, 'ClosePrice')];
  const page = Math.min(int(params.get('page'), 100) || 1, SOLD_MAX_RESULTS / SOLD_PAGE_SIZE);
  const order = { low: 'ClosePrice asc', high: 'ClosePrice desc' }[params.get('sort') ?? ''] ?? 'CloseDate desc';
  return odata({
    $filter: f.join(' and '),
    $select: [...CARD_FIELDS, 'ClosePrice', 'CloseDate', 'DaysOnMarket'].join(','),
    $orderby: `${order},ListingKey`,
    $top: String(SOLD_PAGE_SIZE),
    $skip: String((page - 1) * SOLD_PAGE_SIZE),
    $count: 'true',
  });
}

/** PropTx wants literal $ in option names, so build the string by hand. */
const odata = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

/** The main photo for each listing on a results page, one Media query for the whole page. Medium, not Large: Large is 1920px wide, far more than a card needs. */
export const coverQuery = (keys: string[]) =>
  odata({
    $filter: `ResourceRecordKey in (${keys.map(q).join(',')}) and PreferredPhotoYN eq true and ImageSizeDescription eq 'Medium'`,
    $select: 'ResourceRecordKey,MediaURL',
    $top: String(keys.length * 2),
  });

/** A PropTx ListingKey, e.g. N12345678. Anything else is rejected. */
export const cleanKey = (v: string | null) => (v && /^[A-Z]{1,3}\d{5,10}$/i.test(v) ? v.toUpperCase() : null);

export const listingQuery = (key: string) => odata({ $filter: `ListingKey eq ${q(key)} and ContractStatus eq 'Available'`, $top: '1' });

export const mediaQuery = (key: string) =>
  odata({
    $filter: `ResourceRecordKey eq ${q(key)} and MediaCategory eq 'Photo' and ImageSizeDescription eq 'Large'`,
    $select: 'MediaURL,ImageSizeDescription,Order',
    $orderby: 'Order',
    $top: '100',
  });

type Media = { MediaURL?: string; ImageSizeDescription?: string; Order?: number; ShortDescription?: string };

/** One URL per photo, in order, at the best size for the use. */
export function photos(media: Media[] = [], prefer = ['Large', 'Largest', 'Medium']): string[] {
  const byOrder = new Map<number, Media[]>();
  for (const m of media) if (m.MediaURL) byOrder.set(m.Order ?? 0, [...(byOrder.get(m.Order ?? 0) ?? []), m]);
  return [...byOrder.keys()].sort((a, b) => a - b).map((o) => {
    const set = byOrder.get(o)!;
    for (const size of prefer) {
      const hit = set.find((m) => m.ImageSizeDescription === size);
      if (hit) return hit.MediaURL!;
    }
    return set[0].MediaURL!;
  });
}

// ponytail: self-check, run with `node --experimental-strip-types src/lib/proptx.ts`.
if (typeof process !== 'undefined' && !!import.meta.filename && import.meta.filename === process.argv[1]) {
  const s = new URLSearchParams(searchQuery(new URLSearchParams("home=bungalow&price=800-1200&beds=2&page=2&sort=low&x=1' or 1 eq 1")));
  const filter = s.get('$filter')!;
  if (filter !== "ContractStatus eq 'Available' and startswith(PropertyType,'Residential') and TransactionType eq 'For Sale' and PropertySubType ne 'Parking Space' and PropertySubType ne 'Locker' and City eq 'Markham' and ArchitecturalStyle/any(a:a eq 'Bungalow' or a eq 'Bungaloft') and ListPrice ge 800000 and ListPrice le 1200000 and BedroomsTotal ge 2") throw new Error(filter);
  if (s.get('$skip') !== '24' || s.get('$orderby') !== 'ListPrice asc,ListingKey') throw new Error('paging');
  const evil = new URLSearchParams(searchQuery(new URLSearchParams("city=Markham' or 1 eq 1&home=x' or 1&price=5 or true")));
  if (evil.get('$filter') !== "ContractStatus eq 'Available' and startswith(PropertyType,'Residential') and TransactionType eq 'For Sale' and PropertySubType ne 'Parking Space' and PropertySubType ne 'Locker' and City eq 'Markham'") throw new Error('injection ' + evil.get('$filter'));
  if (!new URLSearchParams(searchQuery(new URLSearchParams('city=Mississauga'))).get('$filter')!.includes("City eq 'Markham'")) throw new Error('unknown city must fall back to Markham');
  const a = new URLSearchParams(searchQuery(new URLSearchParams('area=thornhill&home=condo'))).get('$filter')!;
  if (!a.includes("City eq 'Markham' and CityRegion in ('Thornhill','Royal Orchard'")) throw new Error(a);
  if (new URLSearchParams(searchQuery(new URLSearchParams('city=Vaughan&area=cornell'))).get('$filter')!.includes('CityRegion')) throw new Error('area outside Markham');
  if (homeKinds({ PropertySubType: 'Semi-Detached ', ArchitecturalStyle: ['2-Storey'] }).join() !== 'house' || homeKinds({ PropertySubType: 'Detached', ArchitecturalStyle: ['Bungaloft'] }).join() !== 'bungalow,house') throw new Error('homeKinds');
  const sold = new URLSearchParams(soldQuery(new URLSearchParams('home=condo&price=u800&sold=30&page=9'), new Date('2026-09-30T12:00:00Z')));
  if (!sold.get('$filter')!.includes("CloseDate ge 2026-08-31") || !sold.get('$filter')!.includes('ClosePrice le 800000') || sold.get('$skip') !== '80') throw new Error('sold ' + sold);
  if (!coverQuery(["A1'x"]).includes("'A1''x'")) throw new Error('cover quoting');
  if (cleanKey("N1' or 1") !== null || cleanKey('n12345678') !== 'N12345678') throw new Error('key');
  const p = photos([{ MediaURL: 'b', Order: 2 }, { MediaURL: 'a-s', Order: 1, ImageSizeDescription: 'Thumbnail' }, { MediaURL: 'a-l', Order: 1, ImageSizeDescription: 'Large' }]);
  if (p.join() !== 'a-l,b') throw new Error(p.join());
  console.log('proptx ok');
}
