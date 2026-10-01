/**
 * GET /api/map   pins for the map search, same params as /api/listings (home, area, price, beds, city, for)
 *
 * Every matching listing with only what a pin needs: key, position, price and a few facts. Photos and
 * details load one at a time from /api/listings?id= when a pin is chosen. Listings whose seller hid
 * the address are left off the map, since a pin would show where the home is.
 */
import { MAP_PAGE, PROPTX_BASE, mapQuery } from '../../src/lib/proptx';

interface Context {
  request: Request;
  env: { PROPTX_IDX_TOKEN?: string };
  waitUntil(p: Promise<unknown>): void;
}

const TTL = 300;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status === 200 ? `public, max-age=${TTL}` : 'no-store', 'x-robots-tag': 'noindex' },
  });

export async function onRequestGet({ request, env, waitUntil }: Context): Promise<Response> {
  if (!env.PROPTX_IDX_TOKEN) return json({ error: 'not-configured' }, 503);
  const url = new URL(request.url);
  const params = new URLSearchParams();
  for (const k of ['home', 'area', 'price', 'beds', 'city', 'for']) {
    const v = url.searchParams.get(k);
    if (v) params.set(k, v.slice(0, 40));
  }
  const cacheKey = new Request(`${url.origin}/api/map?${params}`);
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  // TEMP: what the location fields hold. Remove after.
  if (url.searchParams.get('diag') === 'geo') {
    const r = await fetch(`${PROPTX_BASE}/Property?$top=5&$select=ListingKey,Latitude,Longitude,InternetAddressDisplayYN&$filter=${encodeURIComponent("ContractStatus eq 'Available' and City eq 'Markham'")}`, { headers: { authorization: `Bearer ${env.PROPTX_IDX_TOKEN}` } });
    const meta = await (await fetch(`${PROPTX_BASE}/$metadata`, { headers: { authorization: `Bearer ${env.PROPTX_IDX_TOKEN}` } })).text();
    const geo = meta.split(/(?=<)/).filter((l) => /Name="(Latitude|Longitude|Coordinates|GeoLocation|Location|MapCoordinate|CrossStreet|PostalCode|StreetNumber|StreetName)"/.test(l)).map((l) => l.trim());
    return new Response(JSON.stringify({ status: r.status, sample: (await r.text()).slice(0, 700), geo }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  const pins: unknown[] = [];
  let hidden = 0;
  // ponytail: 8 pages of 1,000 covers any one Markham search; the map says when there are more.
  let more = false;
  for (let page = 0; page < 8; page++) {
    const res = await fetch(`${PROPTX_BASE}/Property?${mapQuery(params, page)}`, { headers: { authorization: `Bearer ${env.PROPTX_IDX_TOKEN}` } });
    if (!res.ok) {
      console.error('PropTx map', res.status, (await res.text()).slice(0, 200));
      return json({ error: 'upstream' }, 503);
    }
    const rows = ((await res.json()) as { value: Record<string, unknown>[] }).value;
    for (const r of rows) {
      if (r.InternetEntireListingDisplayYN === false) continue;
      const lat = Number(r.Latitude);
      const lng = Number(r.Longitude);
      if (r.InternetAddressDisplayYN === false || !lat || !lng) {
        hidden++;
        continue;
      }
      pins.push({
        k: r.ListingKey,
        la: Math.round(lat * 1e5) / 1e5,
        ln: Math.round(lng * 1e5) / 1e5,
        p: r.ListPrice,
        b: r.BedroomsTotal,
        ba: r.BathroomsTotalInteger,
        t: typeof r.PropertySubType === 'string' ? r.PropertySubType.trim() : null,
        s: Array.isArray(r.ArchitecturalStyle) ? r.ArchitecturalStyle.join(', ') : null,
        a: r.UnparsedAddress ?? null,
      });
    }
    if (rows.length < MAP_PAGE) break;
    if (page === 7) more = true;
  }
  const res = json({ pins, hidden, more });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
