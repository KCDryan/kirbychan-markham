/**
 * GET /api/listings           search, params: for, city, type, min, max, beds, baths, sort, page
 * GET /api/listings?id=KEY    one listing with all its photos
 *
 * Cloudflare Pages Function. Proxies the PropTx IDX feed so PROPTX_IDX_TOKEN stays in the
 * Cloudflare dashboard and never reaches the browser. Responses are cached at the edge for
 * five minutes, well inside PropTx's rate limit.
 */
import { PROPTX_BASE, cleanKey, coverQuery, listingQuery, mediaQuery, photos, searchQuery } from '../../src/lib/proptx';

interface Env {
  PROPTX_IDX_TOKEN?: string;
  PROPTX_VOW_TOKEN?: string;
  PROPTX_DLA_TOKEN?: string;
}

interface Context {
  request: Request;
  env: Env;
  waitUntil(p: Promise<unknown>): void;
}

type Row = Record<string, unknown>;

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
function publicCard(r: Row, cover?: string) {
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

  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(request);
  if (hit) return hit;

  const params = new URL(request.url).searchParams;
  // TEMP diagnostic: fixed probe queries only. Remove once community names and sold fields are confirmed.
  if (params.get('diag') === 'vow') {
    const out: Record<string, unknown> = { vowSet: !!env.PROPTX_VOW_TOKEN, dlaSet: !!env.PROPTX_DLA_TOKEN };
    const tokens = Object.entries({ idx: env.PROPTX_IDX_TOKEN, vow: env.PROPTX_VOW_TOKEN, dla: env.PROPTX_DLA_TOKEN }).filter(([, t]) => t) as [string, string][];
    const get = (t: string, path: string) => fetch(`${PROPTX_BASE}/${path}`, { headers: { authorization: `Bearer ${t}` } }).then(async (r) => ({ status: r.status, text: await r.text() }));
    const meta = (await get(env.PROPTX_IDX_TOKEN!, '$metadata')).text;
    out.fields = meta.split(/(?=<)/).filter((l) => /Name="(ClosePrice|CloseDate|SoldEntryTimestamp|PurchaseContractDate|SoldConditionalEntryTimestamp|CommunityCode|CityRegion|OriginalListPrice|ListingContractDate|ExpirationDate|DaysOnMarket|PreviousListPrice|StatusChangeTimestamp|UnavailableDate|TerminatedDate)"/.test(l)).map((l) => l.trim()).slice(0, 30);
    const tally: Record<string, number> = {};
    let next: string | null = `Property?$top=1000&$select=CityRegion&$filter=${encodeURIComponent("ContractStatus eq 'Available' and City eq 'Markham' and startswith(PropertyType,'Residential')")}`;
    for (let i = 0; next && i < 3; i++) {
      const r = JSON.parse((await get(env.PROPTX_IDX_TOKEN!, next)).text);
      for (const row of r.value) tally[String(row.CityRegion)] = (tally[String(row.CityRegion)] ?? 0) + 1;
      next = r['@odata.nextLink']?.replace(`${PROPTX_BASE}/`, '') ?? null;
    }
    out.communities = tally;
    for (const [name, t] of tokens) {
      const probes: Record<string, string> = {};
      for (const f of ["MlsStatus eq 'Sold'", "StandardStatus eq 'Closed'", "ContractStatus eq 'Unavailable'", "City eq 'Markham'"]) {
        const r = await get(t, `Property?$top=0&$count=true&$filter=${encodeURIComponent(f)}`);
        probes[f] = `${r.status} ${r.text.slice(0, 160)}`;
      }
      const s1 = await get(t, `Property?$top=3&$select=ListingKey,MlsStatus,StandardStatus,ContractStatus,ListPrice,ClosePrice,CloseDate,PurchaseContractDate,CityRegion,PropertySubType&$orderby=ModificationTimestamp desc&$filter=${encodeURIComponent("MlsStatus eq 'Sold' and City eq 'Markham'")}`);
      probes.sample = `${s1.status} ${s1.text.slice(0, 900)}`;
      const st: Record<string, number> = {};
      const s2 = JSON.parse((await get(t, `Property?$top=2000&$select=MlsStatus&$filter=${encodeURIComponent("City eq 'Markham'")}`)).text || '{"value":[]}');
      for (const row of s2.value ?? []) st[row.MlsStatus] = (st[row.MlsStatus] ?? 0) + 1;
      probes.statuses = JSON.stringify(st);
      out[name] = probes;
    }
    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
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
    return json({ error: 'upstream', detail: String(err).slice(0, 300) }, 503);
  }

  const res = json(body);
  ctx.waitUntil(cache.put(request, res.clone()));
  return res;
}
