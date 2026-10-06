/**
 * GET /sitemap-listings.xml   every Markham home for sale, straight from the feed.
 *
 * It also records each active listing in the database, so a listing nobody opened still keeps its
 * page after it leaves the feed. The daily counts workflow calls it once a day for that reason.
 * While site.json "indexListings" is not true the list is empty: the listings are remembered but
 * not offered to search engines.
 */
import site from '../src/data/site.json';
import { MAP_PAGE, activeQuery } from '../src/lib/proptx';
import type { D1 } from '../src/lib/vow';
import { proptx } from './api/listings';
import { LISTING_SCHEMA, forget, rememberMany } from './listing/[key]';

interface Context {
  request: Request;
  env: { PROPTX_IDX_TOKEN?: string; VOW_DB?: D1 };
  waitUntil(p: Promise<unknown>): void;
}

const INDEX = (site as { indexListings?: boolean }).indexListings === true;
const headers = { 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex' };

export async function onRequestGet({ request, env, waitUntil }: Context): Promise<Response> {
  if (!env.PROPTX_IDX_TOKEN) return new Response('not configured', { status: 503, headers });
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(new URL('/sitemap-listings.xml?v=1', request.url));
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const rows: Record<string, unknown>[] = [];
  try {
    // ponytail: 10 pages of 1,000 is far above Markham's count of homes for sale; raise it if the list ever comes back full.
    for (let i = 0; i < 10; i++) {
      const data = await proptx(env.PROPTX_IDX_TOKEN, `Property?${activeQuery(i)}`);
      rows.push(...data.value);
      if (data.value.length < MAP_PAGE) break;
    }
  } catch (err) {
    console.error(err);
    return new Response('feed not answering', { status: 503, headers: { ...headers, 'retry-after': '300' } });
  }
  // A key is checked like any other input before it is written into the XML.
  const valid = rows.filter((r) => /^[A-Z]{1,3}\d{5,10}$/.test(String(r.ListingKey)));
  // Seller choices: a listing kept off the internet has no page. A hidden address is not stored.
  const shown = valid.filter((r) => r.InternetEntireListingDisplayYN !== false);
  const hidden = valid.filter((r) => r.InternetEntireListingDisplayYN === false).map((r) => String(r.ListingKey));

  if (env.VOW_DB) {
    const db = env.VOW_DB;
    waitUntil(
      (async () => {
        await db.prepare(LISTING_SCHEMA).bind().run();
        // One statement for each page of the feed, not one for each listing.
        for (let i = 0; i < shown.length; i += MAP_PAGE) {
          await rememberMany(db, shown.slice(i, i + MAP_PAGE).map((r) => [String(r.ListingKey), r.InternetAddressDisplayYN === false ? null : ((r.UnparsedAddress as string) ?? null), (r.CityRegion as string) ?? null, (r.City as string) ?? null])).run();
        }
        if (hidden.length) await forget(db, hidden).run();
      })().catch((e) => console.error(e)),
    );
  }

  const urls = INDEX
    ? shown.map((r) => `<url><loc>${site.url}/listing/${String(r.ListingKey)}/</loc>${typeof r.ModificationTimestamp === 'string' && /^[\dT:.Z+-]+$/.test(r.ModificationTimestamp) ? `<lastmod>${r.ModificationTimestamp}</lastmod>` : ''}</url>`).join('')
    : '';
  const res = new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { ...headers, 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=21600', 'x-listings': String(shown.length) },
  });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

/** Tools that check a sitemap with HEAD get the same answer without the body. */
export async function onRequestHead(ctx: Context): Promise<Response> {
  const res = await onRequestGet(ctx);
  return new Response(null, { status: res.status, headers: res.headers });
}
