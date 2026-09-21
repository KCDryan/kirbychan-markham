/**
 * Thin page guard for the built site.
 *
 * Google drops pages it judges not worth keeping in the index, and a pile of
 * thin pages on one domain drags the rest down with it. This lists every
 * indexable page in dist/ by word count and fails when an English page that is
 * open to indexing carries less than MIN words of body text.
 *
 * Usage: node scripts/check-thin.mjs [--list]
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const MIN = 300;
// Pages that are meant to be short: they are navigation, not answers.
const ALLOW = new Set(['/', '/videos/', '/blog/', '/neighbourhoods/', '/services/', '/market-reports/', '/news/', '/client-stories/', '/map-of-markham/']);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

const pages = [];
for (const file of await walk('dist')) {
  // The TinaCMS editor at /admin/ is not a content page and is served with noindex.
  if (relative('dist', file).split(sep)[0] === 'admin') continue;
  const html = await readFile(file, 'utf8');
  const body = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) ?? ['', ''])[1];
  const words = body
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9Ѐ-ӿͰ-Ͽ؀-ۿ一-鿿぀-ヿ]/.test(w)).length;
  const url = `/${relative('dist', file).split(sep).join('/').replace(/index\.html$/, '')}`;
  pages.push({ url, words, noindex: /name="robots" content="noindex/.test(html) });
}

pages.sort((a, b) => a.words - b.words);
if (process.argv.includes('--list')) {
  for (const p of pages) console.log(String(p.words).padStart(5), p.noindex ? 'noindex' : 'index  ', p.url);
}

const translated = /^\/(zh|fr|fa|ru|es|el|ja)\//;
// Blog category and numbered pages are navigation too.
const listing = /^\/blog\/(category\/[^/]+|page\/\d+)\/$/;
const thin = pages.filter((p) => !p.noindex && !translated.test(p.url) && !ALLOW.has(p.url) && !listing.test(p.url) && p.words < MIN);
if (thin.length > 0) {
  console.error(`Thin page check failed: ${thin.length} indexable page(s) under ${MIN} words.`);
  console.error('Add substance, or set noindex, or remove the page. Thin pages hold back the whole site.');
  for (const p of thin) console.error(`  ${String(p.words).padStart(5)} words  ${p.url}`);
  process.exit(1);
}
console.log(`Thin page check passed: ${pages.length} pages, none indexable under ${MIN} words.`);
