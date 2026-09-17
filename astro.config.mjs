// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://kirbychanmarkham.com';

/** Read top level frontmatter values from every MDX file in a folder. */
function frontmatter(folder) {
  // Resolved from this file, so the config works from any working directory.
  const dir = fileURLToPath(new URL(folder, import.meta.url));
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.mdx') || name.startsWith('_')) continue;
    const text = readFileSync(`${dir}${name}`, 'utf8').replace(/\r\n/g, '\n');
    const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    /** @param {string} key */
    const get = (key) => block.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'))?.[1]?.trim();
    out.push({ slug: name.replace(/\.mdx$/, ''), get });
  }
  return out;
}

// Real last modified dates for the sitemap: blog posts use updated or
// published, neighbourhood guides use lastReviewed. Other pages carry no
// lastmod rather than a made up one.
const lastmod = new Map();
const categoryCounts = new Map();
for (const post of frontmatter('./src/content/blog/')) {
  if (post.get('draft') === 'true') continue;
  const date = post.get('updated') ?? post.get('published');
  if (date) lastmod.set(`${SITE}/blog/${post.slug}/`, date);
  const category = post.get('category');
  if (category) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
}
for (const hood of frontmatter('./src/content/neighbourhoods/')) {
  const date = hood.get('lastReviewed');
  if (date) lastmod.set(`${SITE}/${hood.slug}-markham/`, date);
}

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
        const date = lastmod.get(item.url);
        return date ? { ...item, lastmod: new Date(date).toISOString() } : item;
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
