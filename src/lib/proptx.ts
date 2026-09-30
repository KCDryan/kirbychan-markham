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
/** TRREB PropertySubType values. */
export const TYPES = ['Detached', 'Semi-Detached', 'Att/Row/Townhouse', 'Condo Townhouse', 'Condo Apartment', 'Link'];

const CARD_FIELDS = [
  'ListingKey', 'ListPrice', 'UnparsedAddress', 'UnitNumber', 'StreetNumber', 'StreetName', 'StreetSuffix',
  'City', 'CityRegion', 'BedroomsTotal', 'BathroomsTotalInteger', 'PropertySubType', 'TransactionType',
  'ListOfficeName', 'InternetEntireListingDisplayYN', 'InternetAddressDisplayYN', 'ModificationTimestamp',
];

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const int = (v: string | null, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};

/** Turns the visitor's search params into a PropTx Property query string. */
export function searchQuery(params: URLSearchParams): string {
  const lease = params.get('for') === 'lease';
  const f = ["ContractStatus eq 'Available'", `TransactionType eq ${q(lease ? 'For Lease' : 'For Sale')}`];
  const city = CITIES.find((c) => c === params.get('city'));
  if (city) f.push(`City eq ${q(city)}`);
  const type = TYPES.find((t) => t === params.get('type'));
  if (type) f.push(`PropertySubType eq ${q(type)}`);
  const min = int(params.get('min'), 1e9);
  const max = int(params.get('max'), 1e9);
  if (min) f.push(`ListPrice ge ${min}`);
  if (max) f.push(`ListPrice le ${max}`);
  const beds = int(params.get('beds'), 10);
  const baths = int(params.get('baths'), 10);
  if (beds) f.push(`BedroomsTotal ge ${beds}`);
  if (baths) f.push(`BathroomsTotalInteger ge ${baths}`);
  const page = int(params.get('page'), 400) || 1;
  const order = { low: 'ListPrice asc', high: 'ListPrice desc' }[params.get('sort') ?? ''] ?? 'ModificationTimestamp desc';
  return new URLSearchParams({
    $filter: f.join(' and '),
    $select: CARD_FIELDS.join(','),
    $expand: 'Media($select=MediaURL,ImageSizeDescription,Order;$orderby=Order;$top=8)',
    $orderby: `${order},ListingKey`,
    $top: String(PAGE_SIZE),
    $skip: String((page - 1) * PAGE_SIZE),
    $count: 'true',
  }).toString();
}

/** A PropTx ListingKey, e.g. N12345678. Anything else is rejected. */
export const cleanKey = (v: string | null) => (v && /^[A-Z]{1,3}\d{5,10}$/i.test(v) ? v.toUpperCase() : null);

export const listingQuery = (key: string) =>
  new URLSearchParams({ $filter: `ListingKey eq ${q(key)} and ContractStatus eq 'Available'`, $top: '1' }).toString();

export const mediaQuery = (key: string) =>
  new URLSearchParams({
    $filter: `ResourceRecordKey eq ${q(key)}`,
    $select: 'MediaURL,ImageSizeDescription,Order,ShortDescription',
    $orderby: 'Order',
    $top: '300',
  }).toString();

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
if (typeof process !== 'undefined' && import.meta.filename === process.argv[1]) {
  const s = new URLSearchParams(searchQuery(new URLSearchParams("city=Markham&type=Detached&min=900000&beds=3&page=2&sort=low&x=1' or 1 eq 1")));
  const filter = s.get('$filter')!;
  if (filter !== "ContractStatus eq 'Available' and TransactionType eq 'For Sale' and City eq 'Markham' and PropertySubType eq 'Detached' and ListPrice ge 900000 and BedroomsTotal ge 3") throw new Error(filter);
  if (s.get('$skip') !== '24' || s.get('$orderby') !== 'ListPrice asc,ListingKey') throw new Error('paging');
  const evil = new URLSearchParams(searchQuery(new URLSearchParams("city=Markham' or 1 eq 1&min=5 or true")));
  if (evil.get('$filter') !== "ContractStatus eq 'Available' and TransactionType eq 'For Sale'") throw new Error('injection');
  if (cleanKey("N1' or 1") !== null || cleanKey('n12345678') !== 'N12345678') throw new Error('key');
  const p = photos([{ MediaURL: 'b', Order: 2 }, { MediaURL: 'a-s', Order: 1, ImageSizeDescription: 'Thumbnail' }, { MediaURL: 'a-l', Order: 1, ImageSizeDescription: 'Large' }]);
  if (p.join() !== 'a-l,b') throw new Error(p.join());
  console.log('proptx ok');
}
