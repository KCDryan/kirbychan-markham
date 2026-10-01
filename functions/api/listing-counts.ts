/**
 * GET /api/listing-counts
 *
 * How many Markham homes are for sale right now, by neighbourhood and home type. Read once a day
 * by .github/workflows/refresh-listing-counts.yml, which saves it to src/data/listing-counts.json
 * so the counts are in the static pages. Counts only: no prices or other listing data.
 */
import { NOT_HOMES, PROPTX_BASE, areaOf, homeKinds } from '../../src/lib/proptx';

interface Context {
  request: Request;
  env: { PROPTX_IDX_TOKEN?: string };
  waitUntil(p: Promise<unknown>): void;
}

const FILTER = `ContractStatus eq 'Available' and startswith(PropertyType,'Residential') and TransactionType eq 'For Sale' and City eq 'Markham' and ${NOT_HOMES}`;

export async function onRequestGet({ request, env, waitUntil }: Context): Promise<Response> {
  if (!env.PROPTX_IDX_TOKEN) return new Response('{"error":"not-configured"}', { status: 503 });
  // Up to ten PropTx calls per answer, so one answer is shared for an hour whoever asks.
  const cacheKey = new Request(new URL('/api/listing-counts', request.url));
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  type Counts = { total: number; bungalow: number; condo: number; townhouse: number; house: number };
  const blank = (): Counts => ({ total: 0, bungalow: 0, condo: 0, townhouse: 0, house: 0 });
  const markham = blank();
  const areas: Record<string, Counts> = {};

  // Pages by $skip in a fixed order rather than following @odata.nextLink: on 2026-10-01 PropTx began
  // answering the nextLink (skiptoken) request with a 500 while plain $skip pages still worked.
  // ponytail: 10 pages of 1,000 covers Markham many times over; raise it if the city ever lists more.
  const PAGE = 1000;
  for (let page = 0; page < 10; page++) {
    const path = `Property?$top=${PAGE}&$skip=${page * PAGE}&$orderby=ListingKey&$select=ListingKey,CityRegion,PropertySubType,ArchitecturalStyle&$filter=${encodeURIComponent(FILTER)}`;
    const res: Response = await fetch(`${PROPTX_BASE}/${path}`, { headers: { authorization: `Bearer ${env.PROPTX_IDX_TOKEN}` } });
    if (!res.ok) return new Response(JSON.stringify({ error: 'upstream', status: res.status, page }), { status: 503 });
    const data = (await res.json()) as { value: Record<string, unknown>[] };
    for (const r of data.value) {
      const kinds = homeKinds(r) as (keyof Counts)[];
      const area = areaOf(r.CityRegion);
      const buckets = area ? [markham, (areas[area] ??= blank())] : [markham];
      for (const b of buckets) {
        b.total++;
        for (const k of kinds) b[k]++;
      }
    }
    if (data.value.length < PAGE) break;
  }

  const res = new Response(JSON.stringify({ updated: new Date().toISOString(), markham, areas }, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600', 'x-robots-tag': 'noindex' },
  });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
