// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kirbychanmarkham.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes('/privacy/') &&
        !page.includes('/terms/') &&
        !page.includes('/accessibility/'),
      changefreq: 'weekly',
      lastmod: new Date(),
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
