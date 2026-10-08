/**
 * GET /listing/<ListingKey>/   one page per MLS® listing, rendered from the live feed.
 *
 * A new listing has a page the moment it is in the PropTx feed: nothing is built ahead. The page is
 * poured into the built shell (/homes-for-sale/listing-shell/) so it carries the site's header,
 * footer, styles and security headers.
 *
 * When a listing leaves the feed, its address does not stay up as a thin page. If the Markham
 * community we stored maps to a neighbourhood guide on this site, the address 301s to that guide
 * so the visit and the link equity land there. It does not 301 to a homes-for-sale category or
 * any other hub. If no guide matches, the address answers 410 Gone. The 410 page says the home
 * has sold (or has been leased), links to similar active Markham listings when the feed returns
 * them, and otherwise links to the Markham listings page. The shell's enquiry form stays on the
 * page. Photos, price and description of the gone listing are not shown, and neither is anything
 * from the VOW sold feed.
 *
 * The same MLS key can come back if a deal falls through. The feed is read before any redirect
 * or 410, so an active listing is a normal page again once a cached 301 has expired. The redirect
 * is cached for ten minutes, the same as a live page. Some browsers keep a 301 for longer than
 * Cache-Control asks, and those visitors stay on the neighbourhood page until that copy expires.
 *
 * A listing the seller keeps off the internet (InternetEntireListingDisplayYN false) has no page.
 * Anything remembered about it from an earlier day is deleted. A key this site never showed is a
 * 404, not a 410. A feed outage is a 503: it is not turned into a redirect or a 410.
 *
 * Search engines are offered live Markham homes for sale only (site.json "indexListings"). A rental
 * or a home in another city still has its page, for the search and the map, but carries noindex.
 */
import site from '../../src/data/site.json';
import { AREAS, CITIES, areaOf, cleanKey, coverQuery, homeKinds, listingQuery, mediaQuery, photos, searchQuery } from '../../src/lib/proptx';
import { goneRedirect, listingPage, type Area, type Gone, type Listing, type Market } from '../../src/lib/listing-page';
import { COOKIE, currentUser, ensureSchema, keys, type D1, type User } from '../../src/lib/vow';
import { DETAIL, proptx, publicCard } from '../api/listings';

interface Env {
  PROPTX_IDX_TOKEN?: string;
  VOW_SECRET?: string;
  VOW_DB?: D1;
  ASSETS: { fetch(input: URL | Request): Promise<Response> };
}
interface Context {
  request: Request;
  env: Env;
  params: { key: string };
  waitUntil(p: Promise<unknown>): void;
}

const SHELL = '/homes-for-sale/listing-shell/';
const TTL = 600;
const INDEX = (site as { indexListings?: boolean }).indexListings === true;
/** The city without TRREB's district suffix: "Toronto C14" is Toronto. */
const cityOf = (city: unknown) => String(city ?? '').replace(/\s+[CEW]\d{2}$/, '').trim();

/**
 * public/_headers gives the shell these when Cloudflare serves it. They are set here as well, only
 * where missing, so a listing page can never go out without them. Photos come from PropTx's image
 * host and the enquiry form loads the Turnstile check.
 */
const SECURITY: Record<string, string> = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy':
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; img-src 'self' data: https:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://static.cloudflareinsights.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://cloudflareinsights.com; upgrade-insecure-requests",
};

export const LISTING_SCHEMA =
  'CREATE TABLE IF NOT EXISTS listing_pages (key TEXT PRIMARY KEY, address TEXT, community TEXT, city TEXT, lease INTEGER NOT NULL DEFAULT 0, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL)';
/** Remembers a listing while it is active, so its page can stay up after it leaves the feed. */
export const remember = (db: D1, key: string, address: string | null, community: string | null, city: string | null, lease: boolean, now = Date.now()) =>
  db
    .prepare('INSERT INTO listing_pages (key, address, community, city, lease, first_seen, last_seen) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6) ON CONFLICT(key) DO UPDATE SET address = ?2, community = ?3, city = ?4, lease = ?5, last_seen = ?6')
    .bind(key, address, community, city, lease ? 1 : 0, now);
/**
 * A page of the feed remembered in one statement. D1 allows 100 bound values a statement and a
 * Worker a limited number of statements a request, so the rows travel as one JSON value.
 */
export const rememberMany = (db: D1, rows: [key: string, address: string | null, community: string | null, city: string | null][], now = Date.now()) =>
  db
    .prepare(
      "INSERT INTO listing_pages (key, address, community, city, lease, first_seen, last_seen) SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]'), 0, ?2, ?2 FROM json_each(?1) WHERE true " +
        'ON CONFLICT(key) DO UPDATE SET address = excluded.address, community = excluded.community, city = excluded.city, lease = 0, last_seen = excluded.last_seen',
    )
    .bind(JSON.stringify(rows), now);
/** A seller who takes a listing off the internet takes its page with it. */
export const forget = (db: D1, keys: string[]) => db.prepare('DELETE FROM listing_pages WHERE key IN (SELECT value FROM json_each(?1))').bind(JSON.stringify(keys));

async function notFound(env: Env, request: Request): Promise<Response> {
  const page = await env.ASSETS.fetch(new URL('/404.html', request.url));
  return new Response(page.body, { status: 404, headers: page.headers });
}

export async function onRequestGet(ctx: Context): Promise<Response> {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const key = cleanKey(ctx.params.key);
  if (!key || !env.PROPTX_IDX_TOKEN) return notFound(env, request);
  if (url.pathname !== `/listing/${key}/`) return Response.redirect(`${url.origin}/listing/${key}/`, 301);

  // A signed-in visitor skips the shared cache, so a key that has come back on the market is served
  // even when other visitors still hold a cached redirect.
  let user: User | null = null;
  const k = env.VOW_DB && (request.headers.get('cookie') ?? '').includes(`${COOKIE}=`) ? keys(env.VOW_SECRET) : null;
  if (k) {
    try {
      await ensureSchema(env.VOW_DB!);
      user = await currentUser(env.VOW_DB!, await k, request);
    } catch {
      user = null;
    }
  }
  const signedIn = Boolean(user);
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(`${url.origin}/listing/${key}/?v=1`);
  if (!signedIn) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  let listing: Listing | null = null;
  let gone: Gone | undefined;
  let similar: Listing[] = [];
  try {
    const [found, media] = await Promise.all([
      proptx(env.PROPTX_IDX_TOKEN, `Property?${listingQuery(key)}`),
      proptx(env.PROPTX_IDX_TOKEN, `Media?${mediaQuery(key)}`),
    ]);
    const r = found.value[0];
    if (r && r.InternetEntireListingDisplayYN === false) {
      // The seller has asked for no internet display: no page and nothing kept from an earlier visit.
      if (env.VOW_DB) {
        const db = env.VOW_DB;
        ctx.waitUntil(db.prepare(LISTING_SCHEMA).bind().run().then(() => forget(db, [key]).run()).catch(() => undefined));
      }
      return notFound(env, request);
    }
    if (r) {
      const all = photos(media.value as Parameters<typeof photos>[0]);
      const facts = Object.fromEntries(DETAIL.map((f) => [f, r[f]]).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)));
      listing = { ...(publicCard(r, all[0]) as unknown as Listing), remarks: (r.PublicRemarks as string) ?? null, crossStreet: (r.CrossStreet as string) ?? null, tour: (r.VirtualTourURLUnbranded as string) ?? null, photos: all, facts };
      if (env.VOW_DB) {
        const db = env.VOW_DB;
        const l = listing;
        // publicCard has already dropped an address the seller keeps off the internet, so none is stored.
        ctx.waitUntil(db.prepare(LISTING_SCHEMA).bind().run().then(() => remember(db, key, l.address, l.community, l.city, l.lease === true).run()).catch(() => undefined));
      }
    }
  } catch (err) {
    console.error(err);
    // The feed did not answer. Saying "no longer available" would be a false statement, so say nothing yet.
    return new Response('The listing feed is not answering. Please try again in a minute.', { status: 503, headers: { 'retry-after': '60', 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' } });
  }

  if (!listing) {
    if (!env.VOW_DB) return notFound(env, request);
    try {
      await env.VOW_DB.prepare(LISTING_SCHEMA).bind().run();
      const row = await env.VOW_DB.prepare('SELECT key, address, community, city, lease FROM listing_pages WHERE key = ?1').bind(key).first<{ key: string; address: string | null; community: string | null; city: string | null; lease: number }>();
      gone = row ? { ...row, lease: row.lease === 1 } : undefined;
    } catch {
      gone = undefined;
    }
    // A key this site never showed is not a page.
    if (!gone) return notFound(env, request);
  }

  // The neighbourhood this listing sits in (Markham only: other cities reuse some community names) and what else is listed there.
  const city = cityOf(listing?.city ?? gone?.city) || 'Markham';
  const lease = listing?.lease ?? gone?.lease ?? false;
  const slug = city === 'Markham' ? areaOf(listing?.community ?? gone?.community ?? null) : null;
  let areaIndex: Record<string, Omit<Area, 'slug'>> = {};
  let market: Market | undefined;
  try {
    const data = (await (await env.ASSETS.fetch(new URL('/listing-areas.json', request.url))).json()) as { areas: Record<string, Omit<Area, 'slug'>>; market: Market };
    areaIndex = data.areas ?? {};
    market = data.market;
  } catch {
    areaIndex = {};
  }
  // A published neighbourhood guide is the only redirect. Checked before the similar-homes search,
  // so a 301 does not call the feed again. A cached 301 hides a relisted key until it expires.
  if (!listing && gone) {
    const target = goneRedirect(gone.community, gone.city, areaIndex);
    if (target) {
      const redirect = new Response(null, { status: 301, headers: { location: `${url.origin}${target}`, 'cache-control': `public, max-age=${TTL}` } });
      ctx.waitUntil(cache.put(cacheKey, redirect.clone()));
      return redirect;
    }
  }
  let area: Area | undefined;
  if (slug && areaIndex[slug]) area = { slug, ...areaIndex[slug] };
  // A live listing searches its own city. A gone listing has no guide to send people to, so the
  // suggestions are active Markham homes: the same neighbourhood when we know it, otherwise the
  // city. Type and price are not kept once the listing leaves the feed, and this page does not
  // read the sold feed, so those filters are not added.
  const searchCity = listing && CITIES.includes(city) ? city : 'Markham';
  try {
    const params = new URLSearchParams({ city: searchCity });
    if (slug && AREAS[slug]) params.set('area', slug);
    if (lease) params.set('for', 'lease');
    if (listing) {
      const home = homeKinds({ PropertySubType: listing.type, ArchitecturalStyle: (listing.style ?? '').split(', ') })[0];
      if (home) params.set('home', home);
      if (listing.beds) params.set('bedrooms', String(Math.min(listing.beds, 5)));
    }
    const data = await proptx(env.PROPTX_IDX_TOKEN, `Property?${searchQuery(params)}`);
    const rows = data.value.filter((r) => r.InternetEntireListingDisplayYN !== false && r.ListingKey !== key).slice(0, 6);
    const covers = new Map<string, string>();
    if (rows.length) {
      const media = await proptx(env.PROPTX_IDX_TOKEN, `Media?${coverQuery(rows.map((r) => String(r.ListingKey)))}`);
      for (const m of media.value) if (m.MediaURL && !covers.has(String(m.ResourceRecordKey))) covers.set(String(m.ResourceRecordKey), String(m.MediaURL));
    }
    similar = rows.map((r) => publicCard(r, covers.get(String(r.ListingKey))) as unknown as Listing);
  } catch {
    similar = [];
  }

  const page = listingPage({
    origin: site.url,
    phone: { label: site.contact.phone, href: site.contact.phoneHref },
    listing, gone, area, market, similar, signedIn,
    similarIn: slug && AREAS[slug] ? AREAS[slug].label : searchCity,
  });

  const shell = await env.ASSETS.fetch(new URL(SHELL, request.url));
  if (!shell.ok) return notFound(env, request);
  const attr = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  // Search engines are offered what the listings sitemap lists: live Markham homes for sale.
  // A 410 stays noindex. The gone listing's photos, price and description are already absent.
  const index = INDEX && !!listing && city === 'Markham' && !lease;
  let html = (await shell.text())
    .split(`${site.url}${SHELL}`).join(`${site.url}/listing/${key}/`)
    // The enquiry form records the page it was sent from: that must be this listing, not the shell.
    .split(`"${SHELL}"`).join(`"/listing/${key}/"`)
    .split('%%LISTING_TITLE%%').join(attr(page.title))
    .split('%%LISTING_DESCRIPTION%%').join(attr(page.description))
    .split('%%LISTING_H1%%').join(attr(page.h1))
    .split('%%LISTING_CRUMB%%').join(attr(page.crumb))
    .split('%%LISTING_BODY%%').join(page.body);
  if (index) html = html.replace(/<meta name="robots" content="noindex"\s*\/?>/, '');

  const headers = new Headers(shell.headers);
  headers.delete('etag');
  headers.delete('content-length');
  headers.delete('x-robots-tag');
  if (!index) headers.set('x-robots-tag', 'noindex');
  for (const [name, value] of Object.entries(SECURITY)) if (!headers.has(name)) headers.set(name, value);
  headers.set('content-type', 'text/html; charset=utf-8');
  // A 410 carries nothing personal, so it can be shared. A live page for a signed-in visitor stays private.
  headers.set('cache-control', listing && signedIn ? 'private, no-store' : `public, max-age=${TTL}`);
  // 410 only after the feed confirmed the key is gone and no neighbourhood guide matches.
  // A feed outage already returned 503. An active listing, including one that has come back, is 200.
  const res = new Response(html, { status: listing ? 200 : 410, headers });
  if (!(listing && signedIn)) ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

/** Link checkers and previews ask with HEAD. Without this they would get a 404 for a page that exists. */
export async function onRequestHead(ctx: Context): Promise<Response> {
  const res = await onRequestGet(ctx);
  return new Response(null, { status: res.status, headers: res.headers });
}
