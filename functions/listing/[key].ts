/**
 * GET /listing/<ListingKey>/   one page per MLS® listing, rendered from the live feed.
 *
 * A new listing has a page the moment it is in the PropTx feed: nothing is built ahead. The page is
 * poured into the built shell (/homes-for-sale/listing-shell/) so it carries the site's header,
 * footer, styles and security headers.
 *
 * When a listing leaves the feed its page stays up at the same address and says it is no longer
 * available. The photos, price and description go (IDX rules: a withdrawn listing comes down).
 * A signed-in visitor also sees the sold price where TRREB recorded a sale. Sold data never reaches
 * a visitor who is not signed in, a crawler or the shared cache. Each look at it goes in the VOW
 * audit trail and counts toward the account's daily limit, like a search on /sold/.
 *
 * A listing the seller keeps off the internet (InternetEntireListingDisplayYN false) has no page.
 * Anything remembered about it from an earlier day is deleted.
 *
 * Search engines are offered live Markham homes for sale only (site.json "indexListings"). A rental,
 * a home in another city or a listing that has left the market still has its page, for the search
 * and the map, but carries noindex.
 */
import site from '../../src/data/site.json';
import { AREAS, CITIES, PROPTX_BASE, areaOf, cleanKey, closedQuery, coverQuery, homeKinds, listingQuery, mediaQuery, photos, searchQuery } from '../../src/lib/proptx';
import { listingPage, type Area, type Gone, type Listing, type Market, type Sold } from '../../src/lib/listing-page';
import { COOKIE, SEARCHES_PER_DAY, audit, countSince, currentUser, ensureSchema, ipTag, keys, type D1, type User } from '../../src/lib/vow';
import { DETAIL, proptx, publicCard } from '../api/listings';

interface Env {
  PROPTX_IDX_TOKEN?: string;
  PROPTX_VOW_TOKEN?: string;
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

  // A signed-in visitor may see sold data, so their page is never read from or written to the shared cache.
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
  let sold: Sold | undefined;
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
    if (user && k && env.PROPTX_VOW_TOKEN && !gone.lease) {
      try {
        const db = env.VOW_DB;
        // VOW rules: every look at sold data is logged and an account has a daily limit, so sold prices cannot be scraped page by page.
        if ((await countSince(db, 'user_id', user.id, ['search'], 864e5)) < SEARCHES_PER_DAY) {
          await audit(db, user.id, 'search', `listing=${key}`, await ipTag(await k, request));
          const res = await fetch(`${PROPTX_BASE}/Property?${closedQuery(key)}`, { headers: { authorization: `Bearer ${env.PROPTX_VOW_TOKEN.trim()}`, accept: 'application/json' } });
          const row = res.ok ? ((await res.json()) as { value: Record<string, unknown>[] }).value[0] : undefined;
          // A listing the seller kept off the internet stays off, sold or not.
          if (row && row.MlsStatus === 'Sold' && row.InternetEntireListingDisplayYN !== false) sold = { price: typeof row.ClosePrice === 'number' ? row.ClosePrice : null, date: typeof row.CloseDate === 'string' ? row.CloseDate.slice(0, 10) : null };
        }
      } catch {
        sold = undefined;
      }
    }
  }

  // The neighbourhood this listing sits in (Markham only: other cities reuse some community names) and what else is listed there.
  const city = cityOf(listing?.city ?? gone?.city) || 'Markham';
  const lease = listing?.lease ?? gone?.lease ?? false;
  const slug = city === 'Markham' ? areaOf(listing?.community ?? gone?.community ?? null) : null;
  let area: Area | undefined;
  let market: Market | undefined;
  try {
    const data = (await (await env.ASSETS.fetch(new URL('/listing-areas.json', request.url))).json()) as { areas: Record<string, Omit<Area, 'slug'>>; market: Market };
    if (slug && data.areas[slug]) area = { slug, ...data.areas[slug] };
    market = data.market;
  } catch {
    area = undefined;
  }
  // An unknown city makes the search fall back to Markham, so the heading says Markham too.
  const searchCity = CITIES.includes(city) ? city : 'Markham';
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
    listing, gone, area, market, similar, sold, signedIn,
    similarIn: slug && AREAS[slug] ? AREAS[slug].label : searchCity,
  });

  const shell = await env.ASSETS.fetch(new URL(SHELL, request.url));
  if (!shell.ok) return notFound(env, request);
  const attr = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  // Search engines are offered what the listings sitemap lists: live Markham homes for sale. A listing
  // that has left the market keeps its address for visitors but is noindex: the page has little on
  // it and a withdrawn listing should fade from results.
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
  // Sold data is for the signed-in visitor alone.
  headers.set('cache-control', signedIn ? 'private, no-store' : `public, max-age=${TTL}`);
  const res = new Response(html, { status: 200, headers });
  if (!signedIn) ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

/** Link checkers and previews ask with HEAD. Without this they would get a 404 for a page that exists. */
export async function onRequestHead(ctx: Context): Promise<Response> {
  const res = await onRequestGet(ctx);
  return new Response(null, { status: res.status, headers: res.headers });
}
