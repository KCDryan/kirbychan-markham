/**
 * /llms-full.txt, the full text an AI assistant can read in one request.
 *
 * Every English guide and blog post: the quick answer, the frequently asked
 * questions with their answers and the sources each one was checked against.
 * Generated from the content collections, so it is always the live content.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import site from '../data/site.json';
import { GUIDES, type GuideSlug } from '../lib/guides';
import { publishedPosts } from '../lib/blog-posts';
import { canonical } from '../lib/seo';
import { isoDate } from '../lib/format';

export const GET: APIRoute = async () => {
  const guides = (await getCollection('guides', (g) => !g.data.draft && !g.id.includes('/'))).sort(
    (a, b) => Object.keys(GUIDES).indexOf(a.id) - Object.keys(GUIDES).indexOf(b.id)
  );
  const posts = await publishedPosts();

  const lines: string[] = [];
  const add = (s = '') => lines.push(s);

  add(`# ${site.name}: guides in full`);
  add();
  add(`${site.name} (${site.brokerage.legalName}), Markham, Ontario, Canada. ${site.contact.phone}. ${site.url}`);
  add();
  add('Every figure is dated and cites a primary source, listed under each guide. Market prices are TRREB figures for the period stated and are not an appraisal. Nothing here is legal, tax, mortgage or investment advice.');
  add();

  const block = (
    heading: string,
    path: string,
    updated: Date,
    takeaway: string,
    faq: { q: string; a: string }[],
    sources: { name: string; url: string }[]
  ) => {
    add(`## ${heading}`);
    add();
    add(`URL: ${canonical(path)}`);
    add(`Updated: ${isoDate(updated)}`);
    add();
    add('### Quick answer');
    add();
    add(takeaway);
    add();
    if (faq.length > 0) {
      add('### Questions and answers');
      add();
      for (const item of faq) {
        add(`Q: ${item.q}`);
        add(`A: ${item.a}`);
        add();
      }
    }
    if (sources.length > 0) {
      add('### Sources');
      add();
      for (const s of sources) add(`- ${s.name}: ${s.url}`);
      add();
    }
  };

  add('# Guides');
  add();
  for (const g of guides) {
    const meta = GUIDES[g.id as GuideSlug];
    block(`${meta.label.replace(' Guide', '')}: ${g.data.h1}`, `/${g.id}/`, g.data.updated, g.data.takeaway, g.data.faq, g.data.sources);
  }

  add('# Blog posts');
  add();
  for (const p of posts) {
    block(p.data.h1, `/blog/${p.id}/`, p.data.updated ?? p.data.published, p.data.takeaway, p.data.faq, p.data.sources);
  }

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
