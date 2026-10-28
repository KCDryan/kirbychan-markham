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
 * Service pages made at /uploadservice/ are written into src/content/services/ the same way
 * (placeServices). Each is fixed and checked first, so one can never stop the build.
 *
 * Runs only in the Cloudflare build, which is a throwaway checkout, so nothing is ever committed
 * and no file in the repository is changed. A failure here never stops the build: the posts stay
 * live and the next build tries again.
 */
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import site from '../src/data/site.json' with { type: 'json' };
import { tidy } from './lib/quick-tidy.mjs';
import { buildProblems, isGenerated, serviceMdx } from './lib/service-pages.mjs';
import { takenSlugs } from './lib/service-taken.mjs';

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

/** Titles and descriptions already on the site, lower case: check-blog fails the build on a duplicate. */
function usedTexts(root) {
  const out = new Set();
  for (const dir of ['src/content/blog', 'src/content/blog/quick', 'src/content/neighbourhoods', 'src/content/services', 'src/content/videos', 'src/content/market-reports']) {
    const full = join(root, dir);
    if (!existsSync(full)) continue;
    for (const name of readdirSync(full).filter((n) => /\.mdx?$/.test(n) && !n.startsWith('_'))) {
      const text = readFileSync(join(full, name), 'utf8');
      if (dir.endsWith('services') && isGenerated(text)) continue;
      const block = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      for (const key of ['title', 'description']) {
        const raw = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim();
        if (!raw) continue;
        let value = raw;
        try {
          value = JSON.parse(raw);
        } catch {
          value = raw.replace(/^['"]|['"]$/g, '');
        }
        out.add(String(value).trim().toLowerCase());
      }
    }
  }
  return out;
}

/**
 * Applies what /api/uploadservice/export answered. Writes each live page as
 * src/content/services/<slug>.mdx (after the built-in services, oldest first) and removes our own
 * file for a page taken down. A page that fails any check is skipped with a warning. A file this
 * script did not write (no uploadVersion) is never changed or removed.
 */
export function placeServices({ pages = [], down = [] }, root = '.') {
  const dir = join(root, 'src/content/services');
  const taken = takenSlugs(root);
  const used = usedTexts(root);
  const ours = (slug) => existsSync(join(dir, `${slug}.mdx`)) && isGenerated(readFileSync(join(dir, `${slug}.mdx`), 'utf8'));
  const result = { added: 0, removed: 0, skipped: [] };
  const skip = (slug, why) => {
    result.skipped.push(slug);
    console.warn(`WARNING: service page "${slug}" left out of this build: ${why}.`);
  };
  const live = [...pages].filter((p) => p && typeof p === 'object').sort((a, b) => (a.updated ?? 0) - (b.updated ?? 0));
  const written = new Set();
  live.forEach((entry) => {
    const raw = entry.page ?? entry;
    const slug = String(raw?.slug ?? '');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return skip(slug, 'not a valid address');
    if (existsSync(join(dir, `${slug}.mdx`)) && !ours(slug)) return skip(slug, 'the site already has a service file at this address');
    // The same mechanical fixes as agents' quick posts. Links and addresses are left alone.
    const count = { dashes: 0, commas: 0, spelling: 0 };
    const fix = (v) => (typeof v === 'string' ? tidy(v, count) : v);
    const page = {
      ...raw,
      ...Object.fromEntries(['name', 'h1', 'accent', 'title', 'description', 'summary', 'problem', 'body'].map((k) => [k, fix(raw[k])])),
      steps: Array.isArray(raw.steps) ? raw.steps.map((s) => ({ title: fix(s?.title), body: fix(s?.body) })) : raw.steps,
      faq: Array.isArray(raw.faq) ? raw.faq.map((f) => ({ q: fix(f?.q), a: fix(f?.a) })) : raw.faq,
    };
    const problems = buildProblems(page, taken);
    if (problems.length) return skip(slug, problems.join(', '));
    if (used.has(String(page.title).trim().toLowerCase()) || used.has(String(page.description).trim().toLowerCase())) return skip(slug, 'its title or description is the same as another page');
    writeFileSync(join(dir, `${slug}.mdx`), serviceMdx(page, 100 + result.added, entry.updated ?? 0));
    used.add(page.title.trim().toLowerCase()).add(page.description.trim().toLowerCase());
    written.add(slug);
    result.added++;
  });
  for (const slug of down) {
    if (typeof slug !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || written.has(slug) || !ours(slug)) continue;
    rmSync(join(dir, `${slug}.mdx`));
    result.removed++;
  }
  return result;
}

if (import.meta.filename === process.argv[1]) {
  if (!process.env.CF_PAGES) {
    console.log('Uploaded posts and service pages are only pulled in the Cloudflare build. Nothing was changed.');
  } else {
    try {
      const res = await fetch(`${site.url}/api/upload/export`, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { added, dropped } = place(await res.json());
      console.log(`Uploaded posts: ${added} added to the build, ${dropped} website file${dropped === 1 ? '' : 's'} left out of it.`);
    } catch (e) {
      console.warn(`WARNING: could not fetch uploaded posts (${e.message}). They stay live and the next build adds them.`);
    }
    try {
      const res = await fetch(`${site.url}/api/uploadservice/export`, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { added, removed, skipped } = placeServices(await res.json());
      console.log(`Service pages: ${added} added to the build, ${removed} removed, ${skipped.length} left out.`);
    } catch (e) {
      console.warn(`WARNING: could not fetch service pages (${e.message}). The next build tries again.`);
    }
  }
}
