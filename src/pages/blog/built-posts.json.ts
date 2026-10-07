/**
 * Every published post built from the website's own files (src/content/blog), in the shape the
 * upload page works with, so /upload/ can list, open, edit and remove them (functions/api/upload).
 * Drafts are never included. Posts that came from the upload system are left out: the database
 * already has them. Everything here is already public on the post pages. Never indexed
 * (public/_headers) and not in the sitemap.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { BuiltPost } from '../../lib/uploads';

// MDX that runs code (imports, components, expressions) cannot be kept as plain text.
const CODE = /^(import|export) |<[A-Za-z/!]|(^|[^\\])\{/m;

export const GET: APIRoute = async () => {
  const entries = await getCollection('blog', ({ data }) => !data.draft && !(data.quick && data.uploadVersion));
  const posts: BuiltPost[] = entries.map(({ id, body = '', filePath, data: d }) => ({
    slug: id,
    category: d.category,
    headline: d.h1,
    summary: d.subtitle,
    quickAnswer: d.showTakeaway ? d.takeaway : '',
    faq: d.faq,
    sources: d.sources,
    markdown: body.trim(),
    author: d.author ?? '',
    authorTitle: d.authorTitle ?? '',
    related: d.related,
    relatedServices: d.relatedServices,
    draft: false,
    published: d.published.valueOf(),
    updated: (d.updated ?? d.published).valueOf(),
    // A full post has its own search title and description. A quick post's come from its headline and summary.
    ...(d.quick ? {} : { title: d.title, description: d.description }),
    ...(d.guide ? { guide: d.guide } : {}),
    ...(filePath?.endsWith('.mdx') && CODE.test(body) ? { locked: 'This post uses special page code, so it can only be changed by the website team.' } : {}),
  }));
  return new Response(JSON.stringify({ posts }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
