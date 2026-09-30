/**
 * GET /api/listings           search, params: for, city, type, min, max, beds, baths, sort, page
 * GET /api/listings?id=KEY    one listing with all its photos
 *
 * Cloudflare Pages Function. Proxies the PropTx IDX feed so PROPTX_IDX_TOKEN stays in the
 * Cloudflare dashboard and never reaches the browser. Responses are cached at the edge for
 * five minutes, well inside PropTx's rate limit.
 */
import { PROPTX_BASE, cleanKey, listingQuery, mediaQuery, photos, searchQuery } from '../../src/lib/proptx';

interface Env {
  PROPTX_IDX_TOKEN?: string;
}

interface Context {
  request: Request;
  env: Env;
  waitUntil(p: Promise<unknown>): void;
}

type Row = Record<string, unknown> & { Media?: Parameters<typeof photos>[0] };

const TTL = 300;

/** Detail fields shown to the public. Allowlisted so nothing private, such as agent contact or commission, can leak. */
const DETAIL = [
  'LivingAreaRange', 'ApproximateAge', 'ArchitecturalStyle', 'Basement', 'LotWidth', 'LotDepth', 'LotSizeUnits',
  'DirectionFaces', 'ParkingTotal', 'GarageType', 'HeatType', 'Cooling', 'KitchensTotal', 'RoomsTotal',
  'AssociationFee', 'TaxAnnualAmount', 'TaxYear', 'Locker', 'PetsAllowed', 'Exposure', 'DaysOnMarket',
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

async function proptx(token: string, path: string): Promise<{ value: Row[]; '@odata.count'?: number }> {
  const res = await fetch(`${PROPTX_BASE}/${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`PropTx ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** Listings the seller has kept off the internet are dropped, and hidden addresses stay hidden. */
function publicCard(r: Row) {
  const showAddress = r.InternetAddressDisplayYN !== false;
  return {
    key: r.ListingKey,
    price: r.ListPrice,
    address: showAddress ? r.UnparsedAddress ?? [r.UnitNumber && `${r.UnitNumber} -`, r.StreetNumber, r.StreetName, r.StreetSuffix].filter(Boolean).join(' ') : null,
    city: r.City,
    community: r.CityRegion,
    beds: r.BedroomsTotal,
    baths: r.BathroomsTotalInteger,
    type: r.PropertySubType,
    lease: r.TransactionType === 'For Lease',
    brokerage: r.ListOfficeName,
    updated: r.ModificationTimestamp,
    photo: photos(r.Media)[0] ?? null,
  };
}

export async function onRequestGet(ctx: Context): Promise<Response> {
  const { request, env } = ctx;
  if (!env.PROPTX_IDX_TOKEN) return json({ error: 'not-configured' }, 503);

  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(request);
  if (hit) return hit;

  const params = new URL(request.url).searchParams;
  // TEMP diagnostic: fixed probe queries only. Remove once filters are confirmed.
  if (params.get('diag') === 'fields') {
    const get = (path: string) => fetch(`${PROPTX_BASE}/${path}`, { headers: { authorization: `Bearer ${env.PROPTX_IDX_TOKEN}` } }).then(async (r) => ({ status: r.status, text: await r.text() }));
    const meta = (await get('$metadata')).text;
    const lines = meta.split(/(?=<)/).filter((l) => /Name="(ListPrice|BedroomsTotal|BathroomsTotalInteger|CityRegion|ListOfficeName|UnparsedAddress|StreetSuffix|UnitNumber|ModificationTimestamp|MediaURL|ImageSizeDescription|Order|ResourceRecordKey|PreferredPhotoYN|MediaCategory|ShortDescription|CrossStreet|VirtualTourURLUnbranded|TaxAnnualAmount|KitchensTotal|RoomsTotal|ParkingTotal|DirectionFaces|LotWidth|LotDepth|LotSizeUnits|Exposure|DaysOnMarket|TaxYear|AssociationFee|Cooling|HeatType|BedroomsAboveGrade|CountyOrParish|CommunityName|Community|Media)"/.test(l)).slice(0, 80);
    const clauses = ["ContractStatus eq 'Available'", "TransactionType eq 'For Sale'", "City eq 'Markham'", "ListPrice ge 900000", "BedroomsTotal ge 3", "BathroomsTotalInteger ge 2", "PropertySubType eq 'Detached'", "ArchitecturalStyle/any(a: a eq 'Bungalow')", "startswith(PropertyType,'Residential')"];
    const probes: Record<string, number | string> = {};
    for (const c of clauses) { const r = await get(`Property?$top=1&$select=ListingKey&$filter=${encodeURIComponent(c)}`); probes[c] = r.status === 200 ? 200 : r.text.slice(0, 160); }
    const ex = await get(`Property?$top=1&$select=ListingKey&$expand=${encodeURIComponent('Media($select=MediaURL,ImageSizeDescription,Order;$orderby=Order;$top=8)')}`);
    probes.expand = ex.status === 200 ? ex.text.slice(0, 600) : ex.text.slice(0, 200);
    const tally: Record<string, Record<string, number>> = { PropertyType: {}, PropertySubType: {}, ArchitecturalStyle: {}, AccessibilityFeatures: {} };
    let next: string | null = `Property?$top=1000&$select=PropertyType,PropertySubType,ArchitecturalStyle,AccessibilityFeatures&$filter=${encodeURIComponent("ContractStatus eq 'Available' and TransactionType eq 'For Sale' and City eq 'Markham'")}`;
    for (let i = 0; next && i < 3; i++) {
      const r = JSON.parse((await get(next)).text);
      for (const row of r.value) for (const k of Object.keys(tally)) for (const v of [row[k]].flat()) if (v != null) tally[k][v] = (tally[k][v] ?? 0) + 1;
      next = r['@odata.nextLink']?.replace(`${PROPTX_BASE}/`, '') ?? null;
    }
    return new Response(JSON.stringify({ lines, probes, tally }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
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
        ...publicCard(r),
        remarks: r.PublicRemarks ?? null,
        crossStreet: r.CrossStreet ?? null,
        tour: r.VirtualTourURLUnbranded ?? null,
        photos: photos(media.value as Parameters<typeof photos>[0], ['Largest', 'Large', 'Medium']),
        facts,
      };
    } else {
      const data = await proptx(env.PROPTX_IDX_TOKEN, `Property?${searchQuery(params)}`);
      body = {
        total: data['@odata.count'] ?? null,
        listings: data.value.filter((r) => r.InternetEntireListingDisplayYN !== false).map(publicCard),
      };
    }
  } catch (err) {
    console.error(err);
    // 503, not 502: Cloudflare replaces a 502 body with its own error page.
    return json({ error: 'upstream', detail: String(err).slice(0, 300) }, 503);
  }

  const res = json(body);
  ctx.waitUntil(cache.put(request, res.clone()));
  return res;
}
