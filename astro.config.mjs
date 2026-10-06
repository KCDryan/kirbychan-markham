// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://kirbychanmarkham.com';

/** Read top level frontmatter values from every MDX file in a folder, including agents' quick/ posts under blog/. */
function frontmatter(folder, sub = '') {
  // Resolved from this file, so the config works from any working directory.
  const dir = fileURLToPath(new URL(folder + sub, import.meta.url));
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!/\.mdx?$/.test(name) || name.startsWith('_')) continue;
    const text = readFileSync(`${dir}${name}`, 'utf8').replace(/\r\n/g, '\n');
    const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    /** @param {string} key */
    const get = (key) => block.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'))?.[1]?.trim();
    out.push({ slug: name.replace(/\.mdx?$/, ''), get });
  }
  return out;
}

// Real last modified dates for the sitemap: blog posts use updated or
// published, neighbourhood guides use lastReviewed. Other pages carry no
// lastmod rather than a made up one.
const lastmod = new Map();
const categoryCounts = new Map();
for (const post of [...frontmatter('./src/content/blog/'), ...frontmatter('./src/content/blog/', 'quick/')]) {
  if (post.get('draft') === 'true') continue;
  const date = post.get('updated') ?? post.get('published');
  if (date) lastmod.set(`${SITE}/blog/${post.slug}/`, date);
  const category = post.get('category');
  if (category) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
}
for (const lang of ['', 'fa/', 'fr/', 'zh/']) {
  for (const guide of frontmatter('./src/content/guides/', lang)) {
    const date = guide.get('updated');
    if (date) lastmod.set(`${SITE}/${lang}${guide.slug}/`, date);
  }
}
let hoodsDate = '';
for (const hood of frontmatter('./src/content/neighbourhoods/')) {
  const date = hood.get('lastReviewed');
  if (!date) continue;
  lastmod.set(`${SITE}/${hood.slug}-markham/`, date);
  if (date > hoodsDate) hoodsDate = date;
}
// Pages built from other content change when that content does: the neighbourhood index and hubs
// with the newest guide check, the blog lists with the newest post and the listings landing pages
// every morning with the listing counts (src/data/listing-counts.json).
const postsDate = [...lastmod].filter(([u]) => u.includes('/blog/')).map(([, d]) => d).sort().pop();
const countsDate = JSON.parse(readFileSync(fileURLToPath(new URL('./src/data/listing-counts.json', import.meta.url)), 'utf8')).updated;
/** @param {string} url */
function derivedLastmod(url) {
  const path = new URL(url).pathname;
  if (path === '/neighbourhoods/' || path.startsWith('/best-markham-neighbourhoods-for-')) return hoodsDate || undefined;
  if (path === '/' || path === '/blog/' || path.startsWith('/blog/category/') || path.startsWith('/blog/page/')) return postsDate;
  if (/^\/homes-for-sale\/([a-z-]+\/)?$/.test(path) && path !== '/homes-for-sale/listing/' && path !== '/homes-for-sale/map/') return countsDate;
  return undefined;
}

// The news index sets noindex while it has nothing to list, so the sitemap has
// to agree with it rather than asking Google to crawl a page we told it to skip.
const newsCount = frontmatter('./src/content/news/').filter((n) => n.get('draft') !== 'true').length;

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        if (page.includes('/contact/thank-you/')) return false;
        // The blog upload page and the empty post pages it fills are noindex.
        if (/\/upload\/$|\/blog\/upload-shell\//.test(page)) return false;
        // The single-listing page is filled in the browser and is noindex.
        if (page.includes('/homes-for-sale/listing/')) return false;
        // The news index is noindex while the collection is empty, so listing it
        // in the sitemap would ask Google to crawl a page we told it to skip.
        if (/\/news\/$/.test(page) && newsCount === 0) return false;
        // Category pages with fewer than three posts are noindex, so they stay out.
        const category = page.match(/\/blog\/category\/([^/]+)\/$/)?.[1];
        if (category && (categoryCounts.get(category) ?? 0) < 3) return false;
        return true;
      },
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-CA',
          zh: 'zh-Hans',
          fr: 'fr-CA',
          fa: 'fa',
          ru: 'ru',
          es: 'es',
          el: 'el',
          ja: 'ja',
        },
      },
      serialize: (item) => {
        const date = lastmod.get(item.url) ?? derivedLastmod(item.url);
        // x-default points at the English page, matching the <link rel="alternate"> tags in Base.
        const en = item.links?.find((l) => l.lang === 'en-CA');
        const links = en ? [...item.links, { url: en.url, lang: 'x-default' }] : item.links;
        return { ...item, links, ...(date ? { lastmod: new Date(date).toISOString() } : {}) };
      },
    }),
  ],
  image: {
    // Keeps the build deterministic. Swap in real photos under src/assets and
    // import them for astro:assets optimisation. See README.
    responsiveStyles: true,
  },
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true },
  },
});
