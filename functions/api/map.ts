/**
 * GET /api/map   pins for the map search, same params as /api/listings (home, area, price, beds, city, for)
 *
 * Every matching listing with only what a pin needs: key, position, price and a few facts. Photos and
 * details load one at a time from /api/listings?id= when a pin is chosen. Listings whose seller hid
 * the address are left off the map, since a pin would show where the home is.
 *
 * PropTx's IDX feed leaves Latitude and Longitude empty, so addresses are geocoded with Geocodio
 * (GEOCODIO_API_KEY; Canada supported, results may be stored) and kept in D1, so each listing is
 * looked up once. The daily listing-counts workflow calls this endpoint so new listings are ready.
 */
import { MAP_PAGE, PROPTX_BASE, mapQuery } from '../../src/lib/proptx';
import type { D1 } from '../../src/lib/vow';

interface Context {
  request: Request;
  env: { PROPTX_IDX_TOKEN?: string; GEOCODIO_API_KEY?: string; VOW_DB?: D1 };
  waitUntil(p: Promise<unknown>): void;
}

/** Below this Geocodio accuracy the point is a street or area guess, not the house, so no pin. */
const MIN_ACCURACY = 0.8;
/** Most new lookups one request may spend, well inside Geocodio's 2,500 free a day. */
const MAX_LOOKUPS = 1500;
type Geo = { key: string; lat: number | null; lng: number | null };

let tableReady: Promise<unknown> | null = null;
const ensureTable = (db: D1) =>
  (tableReady ??= db
    .prepare('CREATE TABLE IF NOT EXISTS geocodes_v2 (key TEXT PRIMARY KEY, lat REAL, lng REAL, accuracy REAL, address TEXT NOT NULL, at INTEGER NOT NULL)')
    .bind()
    .run()
    .catch((e) => {
      tableReady = null;
      throw e;
    }));

/**
 * The address as Geocodio reads it best: street number, name and suffix, then city, province,
 * postal code and country. Unit numbers and parking levels are left out, and "Canada" stops it
 * matching a street of the same name in the United States, which it assumes by default.
 * geocodes_v2: the first table was filled before "Canada" was added and is not used.
 */
export function geocodeAddress(r: Record<string, unknown>): string | null {
  const street = [r.StreetNumber, r.StreetName, r.StreetSuffix, r.StreetDirSuffix].filter((x) => typeof x === 'string' && x.trim()).join(' ');
  const city = typeof r.City === 'string' ? r.City : '';
  if (!street || !city) return null;
  return [street, city, `${typeof r.StateOrProvince === 'string' && r.StateOrProvince ? r.StateOrProvince : 'ON'} ${typeof r.PostalCode === 'string' ? r.PostalCode : ''}`.trim(), 'Canada'].join(', ');
}

/** Stored positions for these listings. A row with null lat means "looked up, no reliable point". */
async function stored(db: D1, keys: string[]): Promise<Map<string, Geo>> {
  const out = new Map<string, Geo>();
  for (let i = 0; i < keys.length; i += 90) {
    const chunk = keys.slice(i, i + 90);
    const { results } = await db.prepare(`SELECT key, lat, lng FROM geocodes_v2 WHERE key IN (${chunk.map(() => '?').join(',')})`).bind(...chunk).all<Geo>();
    for (const r of results) out.set(r.key, r);
  }
  return out;
}

/** One Geocodio batch call for every address not seen before, saved to D1. */
async function lookup(db: D1, apiKey: string, todo: { key: string; address: string }[]): Promise<Map<string, Geo>> {
  const out = new Map<string, Geo>();
  if (!todo.length) return out;
  const res = await fetch('https://api.geocod.io/v2/geocode', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(todo.map((t) => [t.key, t.address]))),
  });
  if (!res.ok) {
    console.error('Geocodio', res.status, (await res.text()).slice(0, 200));
    return out;
  }
  const data = (await res.json()) as { results: Record<string, { response?: { results?: { location: { lat: number; lng: number }; accuracy: number }[] } }> };
  const now = Date.now();
  const writes = todo.map((t) => {
    const best = data.results?.[t.key]?.response?.results?.[0];
    const good = best && best.accuracy >= MIN_ACCURACY;
    const geo = { key: t.key, lat: good ? best.location.lat : null, lng: good ? best.location.lng : null };
    out.set(t.key, geo);
    return db
      .prepare('INSERT OR REPLACE INTO geocodes_v2 (key, lat, lng, accuracy, address, at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(t.key, geo.lat, geo.lng, best?.accuracy ?? null, t.address, now);
  });
  // Batched: one D1 call per 100 rows, not one per row.
  for (let i = 0; i < writes.length; i += 100) await db.batch(writes.slice(i, i + 100));
  return out;
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

  if (!env.GEOCODIO_API_KEY || !env.VOW_DB) return json({ error: 'map-not-configured' }, 503);
  // TEMP: check 5 addresses before a full run. Stores nothing. Remove after.
  if (url.searchParams.get('sample') === '5') {
    const r0 = await fetch(`${PROPTX_BASE}/Property?${mapQuery(params, 0).replace('%24top=1000', '%24top=5').replace('$top=1000', '$top=5')}`, { headers: { authorization: `Bearer ${env.PROPTX_IDX_TOKEN}` } });
    const rows0 = ((await r0.json()) as { value: Record<string, unknown>[] }).value.slice(0, 5);
    const addrs = rows0.map((r) => geocodeAddress(r) ?? '');
    const g = await fetch('https://api.geocod.io/v2/geocode', { method: 'POST', headers: { authorization: `Bearer ${env.GEOCODIO_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(addrs) });
    const gj = (await g.json()) as { results?: { query: string; response?: { results?: { location: { lat: number; lng: number }; accuracy: number; accuracy_type: string; formatted_address: string }[] } }[] };
    return json({ sent: addrs, unparsed: rows0.map((r) => r.UnparsedAddress), got: (gj.results ?? []).map((x) => x.response?.results?.[0] && { lat: x.response.results[0].location.lat, lng: x.response.results[0].location.lng, acc: x.response.results[0].accuracy, type: x.response.results[0].accuracy_type, f: x.response.results[0].formatted_address }) });
  }
  await ensureTable(env.VOW_DB);

  const rows: Record<string, unknown>[] = [];
  let more = false;
  // ponytail: 8 pages of 1,000 covers any one Markham search; the map says when there are more.
  for (let page = 0; page < 8; page++) {
    const res = await fetch(`${PROPTX_BASE}/Property?${mapQuery(params, page)}`, { headers: { authorization: `Bearer ${env.PROPTX_IDX_TOKEN}` } });
    if (!res.ok) {
      console.error('PropTx map', res.status, (await res.text()).slice(0, 200));
      return json({ error: 'upstream' }, 503);
    }
    const value = ((await res.json()) as { value: Record<string, unknown>[] }).value;
    rows.push(...value);
    if (value.length < MAP_PAGE) break;
    if (page === 7) more = true;
  }

  // Seller choices first: a hidden listing or a hidden address never gets a pin.
  const shown = rows.filter((r) => r.InternetEntireListingDisplayYN !== false && r.InternetAddressDisplayYN !== false && geocodeAddress(r));
  const known = await stored(env.VOW_DB, shown.map((r) => String(r.ListingKey)));
  const todo = shown
    .filter((r) => !known.has(String(r.ListingKey)))
    .slice(0, MAX_LOOKUPS)
    .map((r) => ({ key: String(r.ListingKey), address: geocodeAddress(r)! }));
  const found = await lookup(env.VOW_DB, env.GEOCODIO_API_KEY, todo);

  const pins: unknown[] = [];
  for (const r of shown) {
    const g = known.get(String(r.ListingKey)) ?? found.get(String(r.ListingKey));
    if (!g || g.lat == null || g.lng == null) continue;
    pins.push({
      k: r.ListingKey,
      la: Math.round(g.lat * 1e5) / 1e5,
      ln: Math.round(g.lng * 1e5) / 1e5,
      p: r.ListPrice,
      b: r.BedroomsTotal,
      ba: r.BathroomsTotalInteger,
      t: typeof r.PropertySubType === 'string' ? r.PropertySubType.trim() : null,
      s: Array.isArray(r.ArchitecturalStyle) ? r.ArchitecturalStyle.join(', ') : null,
      a: r.UnparsedAddress,
    });
  }
  const hidden = rows.length - pins.length;
  const res = json({ pins, hidden, more });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
