/**
 * Writes the posts uploaded at /upload/ into src/content/blog/quick/ as .md files, so the build
 * puts them in the blog list, category pages, sitemap and RSS feed. They are already live before
 * this runs (functions/blog/[[path]].ts). Runs only in the Cloudflare build, which is a throwaway
 * checkout, so nothing is ever committed. A failure here never stops the build: the posts stay
 * live and the next build tries again.
 */
import { existsSync, writeFileSync } from 'node:fs';
import site from '../src/data/site.json' with { type: 'json' };

const DIR = 'src/content/blog/quick';
const q = (v) => JSON.stringify(v); // JSON strings are valid YAML

try {
  const res = await fetch(`${site.url}/api/upload/export`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { posts } = await res.json();
  let n = 0;
  for (const p of posts) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug) || existsSync(`${DIR}/${p.slug}.mdx`)) continue;
    const lines = [
      '---',
      `headline: ${q(p.headline)}`,
      `summary: ${q(p.summary)}`,
      `category: ${q(p.category)}`,
      `published: ${q(new Date(p.published).toISOString())}`,
      ...(p.updated - p.published > 864e5 ? [`updated: ${q(new Date(p.updated).toISOString())}`] : []),
      ...(p.quickAnswer ? [`quickAnswer: ${q(p.quickAnswer)}`] : []),
      `faq: ${q(p.faq)}`,
      `sources: ${q(p.sources)}`,
      ...(p.author ? [`author: ${q(p.author)}`] : []),
      ...(p.author && p.authorTitle ? [`authorTitle: ${q(p.authorTitle)}`] : []),
      `related: ${q(p.related ?? [])}`,
      `relatedServices: ${q(p.relatedServices ?? [])}`,
      `uploadVersion: ${q(String(p.updated))}`,
      '---',
      '',
      p.markdown,
      '',
    ];
    writeFileSync(`${DIR}/${p.slug}.md`, lines.join('\n'));
    n++;
  }
  console.log(`Uploaded posts: ${n} added to the build.`);
} catch (e) {
  console.warn(`WARNING: could not fetch uploaded posts (${e.message}). They stay live and the next build adds them.`);
}
