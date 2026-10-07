/**
 * Writes the posts uploaded at /upload/ into src/content/blog/quick/ as .md files, so the build
 * puts them in the blog list, category pages, sitemap and RSS feed. They are already live before
 * this runs (functions/blog/[[path]].ts).
 *
 * The upload page also manages the posts kept in the website's own files. Once one of those has
 * been saved there, the saved version wins: its file (src/content/blog/<slug>.mdx or
 * quick/<slug>.mdx) is left out of this build and the saved version is written instead, so the
 * address is never built twice. One that was removed or put back to a draft there is left out too,
 * so it does not come back.
 *
 * Runs only in the Cloudflare build, which is a throwaway checkout, so nothing is ever committed
 * and no file in the repository is changed. A failure here never stops the build: the posts stay
 * live and the next build tries again.
 */
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import site from '../src/data/site.json' with { type: 'json' };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const q = (v) => JSON.stringify(v); // JSON strings are valid YAML

/** Applies what /api/upload/export answered to a blog folder. Returns how many posts were added and files left out. */
export function place({ posts = [], down = [] }, root = 'src/content/blog') {
  let dropped = 0;
  const drop = (slug) => {
    for (const file of [`${root}/${slug}.mdx`, `${root}/quick/${slug}.mdx`]) {
      if (!existsSync(file)) continue;
      rmSync(file);
      dropped++;
    }
  };
  const added = new Set();
  for (const p of posts) {
    if (!SLUG.test(p.slug)) continue;
    const lines = [
      '---',
      `headline: ${q(p.headline)}`,
      `summary: ${q(p.summary)}`,
      ...(p.title ? [`title: ${q(p.title)}`] : []),
      ...(p.description ? [`description: ${q(p.description)}`] : []),
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
      ...(p.guide ? [`guide: ${q(p.guide)}`] : []),
      `uploadVersion: ${q(String(p.updated))}`,
      '---',
      '',
      p.markdown,
      '',
    ];
    // The saved version is written first, so the post is never missing from the build.
    writeFileSync(`${root}/quick/${p.slug}.md`, lines.join('\n'));
    drop(p.slug);
    added.add(p.slug);
  }
  for (const slug of down) if (typeof slug === 'string' && SLUG.test(slug) && !added.has(slug)) drop(slug);
  return { added: added.size, dropped };
}

if (import.meta.filename === process.argv[1]) {
  if (!process.env.CF_PAGES) {
    console.log('Uploaded posts are only pulled in the Cloudflare build. Nothing was changed.');
  } else {
    try {
      const res = await fetch(`${site.url}/api/upload/export`, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { added, dropped } = place(await res.json());
      console.log(`Uploaded posts: ${added} added to the build, ${dropped} website file${dropped === 1 ? '' : 's'} left out of it.`);
    } catch (e) {
      console.warn(`WARNING: could not fetch uploaded posts (${e.message}). They stay live and the next build adds them.`);
    }
  }
}
