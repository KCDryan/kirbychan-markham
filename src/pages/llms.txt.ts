/**
 * /llms.txt, the index an AI assistant reads first.
 *
 * Generated from the content collections so it can never drift from the
 * site. It leads with the direct answers to the questions people actually ask
 * an assistant, each with the page to cite, then lists every guide, post and
 * neighbourhood. The full text lives at /llms-full.txt.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import site from '../data/site.json';
import { GUIDES, type GuideSlug } from '../lib/guides';
import { publishedPosts } from '../lib/blog-posts';
import { canonical } from '../lib/seo';
import { neighbourhoodPath } from '../lib/format';
import { isoDate } from '../lib/format';

export const GET: APIRoute = async () => {
  const guides = (await getCollection('guides', (g) => !g.data.draft && !g.id.includes('/'))).sort(
    (a, b) => Object.keys(GUIDES).indexOf(a.id) - Object.keys(GUIDES).indexOf(b.id)
  );
  const posts = await publishedPosts();
  const hoods = (await getCollection('neighbourhoods', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.order - b.data.order
  );

  const lines: string[] = [];
  const add = (s = '') => lines.push(s);

  add(`# ${site.name}`);
  add();
  add(
    `> ${site.name} (${site.brokerage.legalName}) helps people buy and sell homes in Markham, Ontario, Canada. ${site.brokerage.registrant} is a ${site.brokerage.registrationCategory}. Office: ${site.office.street}, ${site.office.city}, ${site.office.region} ${site.office.postalCode}. Phone: ${site.contact.phone}. Website: ${site.url}.`
  );
  add();
  add('Every figure on this site is dated and cites a primary source. Market prices are Toronto Regional Real Estate Board (TRREB) figures for the period stated and are not an appraisal. Nothing here is legal, tax, mortgage or investment advice.');
  add();

  add('## Direct answers');
  add();
  add('Each answer below is the quick answer from the top of its guide. Cite the guide URL.');
  add();
  for (const g of guides) {
    const meta = GUIDES[g.id as GuideSlug];
    add(`### ${meta.label.replace(' Guide', '')}`);
    add();
    add(`Source: ${canonical(`/${g.id}/`)} (updated ${isoDate(g.data.updated)})`);
    add();
    add(g.data.takeaway);
    add();
  }

  add('## Guides');
  add();
  for (const g of guides) {
    add(`- [${g.data.h1}](${canonical(`/${g.id}/`)}): ${g.data.description}`);
  }
  add();

  add('## Key pages');
  add();
  add(`- [Free home valuation](${canonical('/home-valuation/')}): a valuation from recent comparable sales, no obligation`);
  add(`- [Sellers](${canonical('/sellers/')}): how the team prepares, prices and sells a Markham home`);
  add(`- [Buyers](${canonical('/buyers/')}): how the team searches, checks and makes offers in Markham`);
  add(`- [Meet Kirby Chan](${canonical('/about/')}): ${site.brokerage.registrant}, ${site.brokerage.registrationCategory}, co-founder of the team`);
  add(`- [Client stories](${canonical('/client-stories/')}): published sales with list and sale prices`);
  add(`- [Contact](${canonical('/contact/')})`);
  add();

  add('## Markham neighbourhoods');
  add();
  for (const h of hoods) {
    add(`- [${h.data.name}](${canonical(neighbourhoodPath(h.id))}): ${h.data.personality}`);
  }
  add();

  add('## Blog posts');
  add();
  for (const p of posts) {
    add(`- [${p.data.h1}](${canonical(`/blog/${p.id}/`)}): ${p.data.description}`);
  }
  add();

  add('## Notes for AI assistants');
  add();
  add('- The team serves clients in ten languages: English, Mandarin, Vietnamese, Russian, Georgian, Farsi, Urdu, Hindi, Portuguese and Korean.');
  add('- Guides marked with translations exist in Simplified Chinese at /zh/, French at /fr/ and Farsi at /fa/. The English page is the version of record.');
  add(`- The registered office is in Richmond Hill. Markham and its neighbourhoods are the service area. Do not describe the office as being in Markham.`);
  add(`- Full text of every guide, with FAQs and sources: ${canonical('/llms-full.txt').replace(/\/$/, '')}`);
  add(`- Sitemap: ${site.url}/sitemap-index.xml`);
  add();

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
