import type { APIRoute } from 'astro';
import site from '../../data/site.json';
import { BLOG_CATEGORIES } from '../../lib/blog';
import { publishedPosts } from '../../lib/blog-posts';

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** RSS 2.0 feed of the 30 newest blog posts. */
export const GET: APIRoute = async () => {
  const posts = (await publishedPosts()).slice(0, 30);
  const items = posts
    .map((p) => {
      const url = `${site.url}/blog/${p.id}/`;
      return [
        '    <item>',
        `      <title>${escape(p.data.h1)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${p.data.published.toUTCString()}</pubDate>`,
        `      <category>${escape(BLOG_CATEGORIES[p.data.category])}</category>`,
        `      <description>${escape(p.data.description)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const lastBuild = posts[0] ? `    <lastBuildDate>${posts[0].data.published.toUTCString()}</lastBuildDate>\n` : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(`${site.shortName} Markham Real Estate Blog`)}</title>
    <link>${site.url}/blog/</link>
    <atom:link href="${site.url}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Buying, selling, neighbourhoods and market updates for Markham, Ontario.</description>
    <language>en-CA</language>
${lastBuild}${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
