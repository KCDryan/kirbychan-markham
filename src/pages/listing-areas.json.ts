/** What a listing page says about its neighbourhood and Markham prices, taken from the guides and TRREB figures at build time. Read by functions/listing/[key].ts. */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import trreb from '../data/trreb-monthly.json';
import { neighbourhoodPath } from '../lib/format';

/** A guide's answer or intro sentence about schools is about the neighbourhood. Under one address it could read as a promise about that home, so it stays in the guide. */
const noSchools = (f: { q: string; a: string }) => !/school|catchment|boundar/i.test(f.q + ' ' + f.a);

export const GET: APIRoute = async () => {
  const hoods = await getCollection('neighbourhoods', (e) => !e.data.draft);
  const areas = Object.fromEntries(hoods.map((h) => [h.id, { name: h.data.name, path: neighbourhoodPath(h.id), intro: h.data.intro.split(/(?<=\.)\s+/).filter((t) => !/school|catchment|boundar/i.test(t)).join(' '), transit: h.data.quickStats.transit, bands: h.data.priceBands, faq: h.data.faq.filter(noSchools) }]));
  // TRREB Market Watch figures for Markham by home type, so a listing page can set its asking price beside recent sales of the same type.
  const market = { period: trreb.period, report: trreb.report, byType: trreb.markhamByType };
  return new Response(JSON.stringify({ areas, market }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
