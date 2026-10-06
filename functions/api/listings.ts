/**
 * GET /api/listings           search, params: home, area, price, beds, bedrooms, city, for, sort, page
 * GET /api/listings?id=KEY    one listing with all its photos
 *
 * Cloudflare Pages Function. Proxies the PropTx IDX feed so PROPTX_IDX_TOKEN stays in the
 * Cloudflare dashboard and never reaches the browser. Responses are cached at the edge for
 * five minutes, well inside PropTx's rate limit.
 */
import { PROPTX_BASE, cleanKey, coverQuery, listingQuery, mediaQuery, photos, searchQuery } from '../../src/lib/proptx';

interface Env {
  PROPTX_IDX_TOKEN?: string;
}

interface Context {
  request: Request;
  env: Env;
  waitUntil(p: Promise<unknown>): void;
}

type Row = Record<string, unknown>;

const TTL = 300;

/** Detail fields shown to the public. Allowlisted so nothing private, such as agent contact or commission, can leak. */
export const DETAIL = [
  'LivingAreaRange', 'ApproximateAge', 'ArchitecturalStyle', 'Basement', 'LotWidth', 'LotDepth', 'LotSizeUnits',
  'DirectionFaces', 'ParkingTotal', 'GarageType', 'HeatType', 'Cooling', 'KitchensTotal', 'RoomsTotal',
  'AssociationFee', 'TaxAnnualAmount', 'TaxYear', 'Locker', 'PetsAllowed', 'Exposure', 'DaysOnMarket',
  // More detail for the listing pages. A field the feed does not carry is simply absent from the row.
  'AssociationFeeIncludes', 'AssociationAmenities', 'BalconyType', 'LaundryFeatures', 'ParkingFeatures', 'InteriorFeatures', 'PropertyFeatures', 'View', 'LegalStories',
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? `public, max-age=${TTL}` : 'no-store',
      'x-robots-tag': 'noindex',
    },
  });

export async function proptx(token: string, path: string): Promise<{ value: Row[]; '@odata.count'?: number }> {
  const res = await fetch(`${PROPTX_BASE}/${path}`, {
    headers: { authorization: `Bearer ${token.trim()}`, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`PropTx ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** Listings the seller has kept off the internet are dropped, and hidden addresses stay hidden. */
export function publicCard(r: Row, cover?: string) {
  const showAddress = r.InternetAddressDisplayYN !== false;
  return {
    key: r.ListingKey,
    price: r.ListPrice,
    address: showAddress ? r.UnparsedAddress ?? [r.UnitNumber && `${r.UnitNumber} -`, r.StreetNumber, r.StreetName, r.StreetSuffix].filter(Boolean).join(' ') : null,
    city: r.City,
    community: r.CityRegion,
    beds: r.BedroomsTotal,
    baths: r.BathroomsTotalInteger,
    type: typeof r.PropertySubType === 'string' ? r.PropertySubType.trim() : r.PropertySubType,
    style: Array.isArray(r.ArchitecturalStyle) ? r.ArchitecturalStyle.join(', ') : null,
    lease: r.TransactionType === 'For Lease',
    brokerage: r.ListOfficeName,
    updated: r.ModificationTimestamp,
    photo: cover ?? null,
  };
}

export async function onRequestGet(ctx: Context): Promise<Response> {
  const { request, env } = ctx;
  if (!env.PROPTX_IDX_TOKEN) return json({ error: 'not-configured' }, 503);

  // Cache on the known params only, in a fixed order, so junk params cannot force fresh PropTx calls.
  const url = new URL(request.url);
  const params = new URLSearchParams();
  for (const k of ['id', 'home', 'area', 'price', 'beds', 'bedrooms', 'city', 'for', 'sort', 'page']) {
    const v = url.searchParams.get(k);
    if (v) params.set(k, v.slice(0, 40));
  }
  const cacheKey = new Request(`${url.origin}/api/listings?${params}`);
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let body: unknown;
  try {
    if (params.has('id')) {
      const key = cleanKey(params.get('id'));
      if (!key) return json({ error: 'bad-id' }, 400);
      const [listing, media] = await Promise.all([
        proptx(env.PROPTX_IDX_TOKEN, `Property?${listingQuery(key)}`),
        proptx(env.PROPTX_IDX_TOKEN, `Media?${mediaQuery(key)}`),
      ]);
      const r = listing.value[0];
      if (!r || r.InternetEntireListingDisplayYN === false) return json({ error: 'not-found' }, 404);
      const facts = Object.fromEntries(DETAIL.map((k) => [k, r[k]]).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)));
      body = {
        ...publicCard(r, photos(media.value as Parameters<typeof photos>[0])[0]),
        remarks: r.PublicRemarks ?? null,
        crossStreet: r.CrossStreet ?? null,
        tour: r.VirtualTourURLUnbranded ?? null,
        photos: photos(media.value as Parameters<typeof photos>[0]),
        facts,
      };
    } else {
      const data = await proptx(env.PROPTX_IDX_TOKEN, `Property?${searchQuery(params)}`);
      const rows = data.value.filter((r) => r.InternetEntireListingDisplayYN !== false);
      const covers = new Map<string, string>();
      if (rows.length) {
        const media = await proptx(env.PROPTX_IDX_TOKEN, `Media?${coverQuery(rows.map((r) => String(r.ListingKey)))}`);
        for (const m of media.value) if (m.MediaURL && !covers.has(String(m.ResourceRecordKey))) covers.set(String(m.ResourceRecordKey), String(m.MediaURL));
      }
      body = {
        total: data['@odata.count'] ?? null,
        listings: rows.map((r) => publicCard(r, covers.get(String(r.ListingKey)))),
      };
    }
  } catch (err) {
    console.error(err);
    // 503, not 502: Cloudflare replaces a 502 body with its own error page.
    return json({ error: 'upstream' }, 503);
  }

  const res = json(body);
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
