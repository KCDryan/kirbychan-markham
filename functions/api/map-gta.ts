/**
 * GET /api/map-gta   the rest of the GTA around Markham, for the map search. Same params as
 * /api/map (home, price, beds, for); there is no neighbourhood here, since a chosen Markham
 * neighbourhood shows only Markham.
 *
 * The owner chose one shared GTA map for both sites: kirbychantoronto.com geocodes the GTA and this
 * site reads its pins, server side (Toronto's API sends no CORS headers). Markham's own pins still
 * come from /api/map, so Markham is complete even while Toronto is still placing addresses, and
 * Markham listings are dropped here so no home appears twice. The filters are applied on this side
 * with Markham's own presets, so every pin on the map matches the buttons the visitor pressed.
 */
import { PRICES, homeKinds } from '../../src/lib/proptx';

const SOURCE = 'https://kirbychantoronto.com/api/map';
type Pin = { k: string; la: number; ln: number; p: number; b: number | null; ba: number | null; t: string | null; s: string | null; a: string; c?: string; r?: string };

interface Context {
  request: Request;
  waitUntil(p: Promise<unknown>): void;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status === 200 ? 'public, max-age=300' : 'no-store', 'x-robots-tag': 'noindex' },
  });

/** The whole GTA for sale or for rent, from Toronto, shared by every visitor for 5 minutes. */
async function gta(lease: boolean, waitUntil: Context['waitUntil']): Promise<Pin[] | null> {
  const key = new Request(`${SOURCE}${lease ? '?for=lease' : ''}`);
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(key);
  const res = hit ?? (await fetch(key, { signal: AbortSignal.timeout(20000) }).catch(() => null));
  if (!res || !res.ok) return null;
  if (!hit) waitUntil(cache.put(key, new Response(res.clone().body, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' } })));
  const body = (await res.json()) as { pins?: Pin[] };
  return Array.isArray(body.pins) ? body.pins : null;
}

export async function onRequestGet({ request, waitUntil }: Context): Promise<Response> {
  const q = new URL(request.url).searchParams;
  const pins = await gta(q.get('for') === 'lease', waitUntil);
  if (!pins) return json({ error: 'upstream' }, 503);

  const home = q.get('home');
  const price = PRICES[q.get('price') ?? ''];
  const beds = Number(q.get('beds')) || 0;
  const out = pins.filter((pin) => {
    if (pin.c === 'Markham') return false; // shown from this site's own data
    if (typeof pin.la !== 'number' || typeof pin.ln !== 'number') return false;
    if (home && !homeKinds({ PropertySubType: pin.t, ArchitecturalStyle: pin.s ? pin.s.split(', ') : [] }).includes(home)) return false;
    if (price?.min && !(pin.p >= price.min)) return false;
    if (price?.max && !(pin.p <= price.max)) return false;
    if (beds && !((pin.b ?? 0) >= beds)) return false;
    return true;
  });
  return json({ pins: out.map(({ k, la, ln, p, b, ba, t, s, a }) => ({ k, la, ln, p, b, ba, t, s, a })) });
}
