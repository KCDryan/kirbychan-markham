/**
 * GET /api/sold   sold search for signed-in accounts, params: home, area, price, beds, sold, sort, page
 *
 * VOW data (PropTx MLS Rules, Article 8). Only verified accounts with a current password get an
 * answer, every search goes in the audit trail, one search returns at most 100 results and each
 * account has a daily limit, so the sold data cannot be scraped.
 */
import { PROPTX_BASE, SOLD_MAX_RESULTS, coverQuery, soldQuery } from '../../src/lib/proptx';
import { SEARCHES_PER_DAY, audit, countSince, currentUser, ensureSchema, type VowEnv } from '../../src/lib/vow';

interface Context {
  request: Request;
  env: VowEnv;
}

type Row = Record<string, unknown>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' },
  });

async function proptx(token: string, path: string): Promise<{ value: Row[]; '@odata.count'?: number }> {
  const res = await fetch(`${PROPTX_BASE}/${path}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } });
  if (!res.ok) throw new Error(`PropTx ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function onRequestGet({ request, env }: Context): Promise<Response> {
  if (!env.VOW_DB || !env.PROPTX_VOW_TOKEN) return json({ error: 'not-configured' }, 503);
  await ensureSchema(env.VOW_DB);
  const user = await currentUser(env.VOW_DB, request);
  if (!user) return json({ error: 'sign-in' }, 401);
  if ((await countSince(env.VOW_DB, 'user_id', user.id, ['search'], 864e5)) >= SEARCHES_PER_DAY) return json({ error: 'limit' }, 429);

  const params = new URL(request.url).searchParams;
  await audit(env.VOW_DB, user.id, 'search', params.toString(), request.headers.get('cf-connecting-ip'));
  try {
    const data = await proptx(env.PROPTX_VOW_TOKEN, `Property?${soldQuery(params)}`);
    // Listings the seller kept off the internet stay off, sold or not (Rules 8.14).
    const rows = data.value.filter((r) => r.InternetEntireListingDisplayYN !== false);
    const covers = new Map<string, string>();
    if (rows.length) {
      const media = await proptx(env.PROPTX_VOW_TOKEN, `Media?${coverQuery(rows.map((r) => String(r.ListingKey)))}`);
      for (const m of media.value) if (m.MediaURL && !covers.has(String(m.ResourceRecordKey))) covers.set(String(m.ResourceRecordKey), String(m.MediaURL));
    }
    return json({
      total: data['@odata.count'] ?? null,
      max: SOLD_MAX_RESULTS,
      listings: rows.map((r) => ({
        key: r.ListingKey,
        soldPrice: r.ClosePrice,
        soldDate: r.CloseDate,
        listPrice: r.ListPrice,
        days: r.DaysOnMarket,
        address: r.InternetAddressDisplayYN !== false ? r.UnparsedAddress : null,
        city: r.City,
        community: r.CityRegion,
        beds: r.BedroomsTotal,
        baths: r.BathroomsTotalInteger,
        type: typeof r.PropertySubType === 'string' ? r.PropertySubType.trim() : null,
        style: Array.isArray(r.ArchitecturalStyle) ? r.ArchitecturalStyle.join(', ') : null,
        brokerage: r.ListOfficeName,
        photo: covers.get(String(r.ListingKey)) ?? null,
      })),
    });
  } catch (err) {
    console.error(err);
    return json({ error: 'upstream', detail: String(err).slice(0, 300) }, 503);
  }
}
