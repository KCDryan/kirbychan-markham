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

/** Where a listing's home type falls, matching the HOMES filters above. Used for the daily counts. */
export function homeKind(r: { PropertySubType?: unknown; ArchitecturalStyle?: unknown }): string | null {
  const sub = String(r.PropertySubType ?? '').trim();
  const styles = Array.isArray(r.ArchitecturalStyle) ? r.ArchitecturalStyle : [];
  if (styles.includes('Bungalow') || styles.includes('Bungaloft')) return 'bungalow';
  if (sub === 'Condo Apartment') return 'condo';
  if (sub === 'Att/Row/Townhouse' || sub === 'Condo Townhouse') return 'townhouse';
  if (sub === 'Detached' || sub.startsWith('Semi-Detached')) return 'house';
  return null;
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

/** Turns the visitor's search params into a PropTx Property query string. */
export function searchQuery(params: URLSearchParams): string {
  const lease = params.get('for') === 'lease';
  const f = ["ContractStatus eq 'Available'", "startswith(PropertyType,'Residential')", `TransactionType eq ${q(lease ? 'For Lease' : 'For Sale')}`];
  const city = CITIES.find((c) => c === (params.get('city') ?? 'Markham'));
  if (city) f.push(`City eq ${q(city)}`);
  const area = city === 'Markham' ? AREAS[params.get('area') ?? ''] : undefined;
  if (area) f.push(`CityRegion in (${area.communities.map(q).join(',')})`);
  const home = HOMES[params.get('home') ?? ''];
  if (home) f.push(home.filter);
  const price = PRICES[params.get('price') ?? ''];
  if (price?.min) f.push(`ListPrice ge ${price.min}`);
  if (price?.max) f.push(`ListPrice le ${price.max}`);
  const beds = int(params.get('beds'), 10);
  if (beds) f.push(`BedroomsTotal ge ${beds}`);
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

/** PropTx wants literal $ in option names, so build the string by hand. */
const odata = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

/** The main photo for each listing on a results page, one Media query for the whole page. */
export const coverQuery = (keys: string[]) =>
  odata({
    $filter: `ResourceRecordKey in (${keys.map(q).join(',')}) and PreferredPhotoYN eq true and ImageSizeDescription eq 'Large'`,
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
if (typeof process !== 'undefined' && import.meta.filename === process.argv[1]) {
  const s = new URLSearchParams(searchQuery(new URLSearchParams("home=bungalow&price=800-1200&beds=2&page=2&sort=low&x=1' or 1 eq 1")));
  const filter = s.get('$filter')!;
  if (filter !== "ContractStatus eq 'Available' and startswith(PropertyType,'Residential') and TransactionType eq 'For Sale' and City eq 'Markham' and ArchitecturalStyle/any(a:a eq 'Bungalow' or a eq 'Bungaloft') and ListPrice ge 800000 and ListPrice le 1200000 and BedroomsTotal ge 2") throw new Error(filter);
  if (s.get('$skip') !== '24' || s.get('$orderby') !== 'ListPrice asc,ListingKey') throw new Error('paging');
  const evil = new URLSearchParams(searchQuery(new URLSearchParams("city=Markham' or 1 eq 1&home=x' or 1&price=5 or true")));
  if (evil.get('$filter') !== "ContractStatus eq 'Available' and startswith(PropertyType,'Residential') and TransactionType eq 'For Sale'") throw new Error('injection ' + evil.get('$filter'));
  const a = new URLSearchParams(searchQuery(new URLSearchParams('area=thornhill&home=condo'))).get('$filter')!;
  if (!a.includes("City eq 'Markham' and CityRegion in ('Thornhill','Royal Orchard'")) throw new Error(a);
  if (new URLSearchParams(searchQuery(new URLSearchParams('city=Vaughan&area=cornell'))).get('$filter')!.includes('CityRegion')) throw new Error('area outside Markham');
  if (homeKind({ PropertySubType: 'Semi-Detached ', ArchitecturalStyle: ['2-Storey'] }) !== 'house' || homeKind({ PropertySubType: 'Detached', ArchitecturalStyle: ['Bungaloft'] }) !== 'bungalow') throw new Error('homeKind');
  if (!coverQuery(["A1'x"]).includes("'A1''x'")) throw new Error('cover quoting');
  if (cleanKey("N1' or 1") !== null || cleanKey('n12345678') !== 'N12345678') throw new Error('key');
  const p = photos([{ MediaURL: 'b', Order: 2 }, { MediaURL: 'a-s', Order: 1, ImageSizeDescription: 'Thumbnail' }, { MediaURL: 'a-l', Order: 1, ImageSizeDescription: 'Large' }]);
  if (p.join() !== 'a-l,b') throw new Error(p.join());
  console.log('proptx ok');
}
