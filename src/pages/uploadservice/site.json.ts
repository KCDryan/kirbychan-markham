/**
 * What the service page chat (functions/api/uploadservice) needs to know about the built site: the
 * service pages, the pillar guides and every address a new service page may not take. Public text
 * only. Never indexed (public/_headers) and not in the sitemap.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { GUIDES, servicePath } from '../../lib/guides';
import { takenSlugs } from '../../../scripts/lib/service-taken.mjs';

export const GET: APIRoute = async () => {
  const services = (await getCollection('services', ({ data }) => !data.draft)).map(({ id, data }) => ({
    slug: id,
    name: data.name,
    summary: data.summary,
    url: servicePath(id),
    keywords: data.keywords,
    ...(data.uploadVersion ? { generated: true } : {}),
  }));
  const guides = (await getCollection('guides', ({ id, data }) => !data.draft && !id.includes('/'))).map(({ id, data }) => ({
    slug: id,
    label: GUIDES[id as keyof typeof GUIDES]?.label ?? data.h1,
    url: `/${id}/`,
    description: data.description,
  }));
  const taken = [...takenSlugs()].sort();
  return new Response(JSON.stringify({ taken, services, guides }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
