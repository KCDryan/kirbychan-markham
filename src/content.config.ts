import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORY_SLUGS } from './lib/blog';
import { GUIDE_SLUGS } from './lib/guides';

const seo = {
  title: z.string().max(60, 'Keep titles under 60 characters'),
  description: z
    .string()
    .min(140, "Meta descriptions should run about 150 to 160 characters")
    .max(168, "Meta descriptions should run about 150 to 160 characters"),
  ogImage: z.string().optional(),
  noindex: z.boolean().default(false),
};

const sources = z
  .array(
    z.object({
      name: z.string().min(2),
      url: z.string().url('Every source needs a full https URL'),
    })
  )
  .default([]);

const faq = z
  .array(
    z.object({
      q: z.string(),
      a: z.string(),
    })
  )
  .default([]);

const neighbourhoods = defineCollection({
  loader: glob({ base: './src/content/neighbourhoods', pattern: '**/*.mdx' }),
  schema: z.object({
    ...seo,
    name: z.string(),
    h1: z.string(),
    accent: z.string().describe('The italic accent word inside the H1'),
    order: z.number(),
    intro: z.string(),
    heroEyebrow: z.string().default('Markham, Ontario'),
    personality: z.string().describe('One line used on the homepage grid card'),
    quickStats: z.object({
      priceRange: z.string(),
      propertyTypes: z.string(),
      schools: z.string(),
      transit: z.string(),
      commute: z.string(),
    }),
    priceBands: z
      .array(z.object({ band: z.string(), range: z.string(), what: z.string() }))
      .default([]),
    nearby: z.array(z.string()).length(2).describe('Slugs of two nearby neighbourhoods'),
    relatedServices: z.array(z.string()).default([]),
    faq,
    lastReviewed: z.coerce.date().optional(),
    sources,
    draft: z.boolean().default(false),
  }),
});

const services = defineCollection({
  loader: glob({ base: './src/content/services', pattern: '**/*.mdx' }),
  schema: z.object({
    ...seo,
    name: z.string(),
    h1: z.string(),
    accent: z.string(),
    order: z.number(),
    summary: z.string().describe('One line used on the homepage services grid'),
    problem: z.string(),
    steps: z.array(z.object({ title: z.string(), body: z.string() })).min(3),
    faq,
    draft: z.boolean().default(false),
  }),
});


/**
 * Blog posts at /blog/<slug>/. The file name is the slug. Every post must cite
 * at least one source and scripts/check-blog.mjs enforces the rest of the SEO
 * rules (unique titles, length, internal links, structure) before a build.
 */
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/[^_]*.mdx' }),
  schema: z.object({
    ...seo,
    h1: z.string().min(20).max(90),
    subtitle: z.string().min(40).max(200),
    category: z.enum(CATEGORY_SLUGS),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    takeaway: z.string().min(120).describe('The quick answer box at the top'),
    neighbourhood: z.string().optional().describe('Main neighbourhood slug, used for the share image'),
    related: z.array(z.string()).default([]).describe('Neighbourhood slugs linked at the end'),
    relatedServices: z.array(z.string()).default([]),
    guide: z.enum(GUIDE_SLUGS).optional().describe('The pillar guide this post supports'),
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .min(3)
      .max(8),
    sources: z
      .array(
        z.object({
          name: z.string().min(2),
          url: z.string().url('Every source needs a full https URL'),
        })
      )
      .min(1, 'Every blog post must cite at least one source'),
    draft: z.boolean().default(false),
  }),
});

const videos = defineCollection({
  loader: glob({ base: './src/content/videos', pattern: '**/*.mdx' }),
  schema: z.object({
    ...seo,
    h1: z.string(),
    accent: z.string(),
    youtubeId: z.string().describe('Leave blank until the video is live'),
    category: z.enum([
      'Neighbourhood tour',
      'Market update',
      'Buyer guide',
      'Seller guide',
      'Comparison',
      'Home tour',
    ]),
    published: z.coerce.date(),
    durationMinutes: z.number(),
    summary: z.string(),
    takeaways: z.array(z.string()).default([]),
    transcript: z.string().default(''),
    neighbourhood: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const marketReports = defineCollection({
  loader: glob({ base: './src/content/market-reports', pattern: '**/*.mdx' }),
  schema: z.object({
    ...seo,
    h1: z.string(),
    accent: z.string(),
    period: z.string().describe('For example "August 2026"'),
    published: z.coerce.date(),
    summary: z.string(),
    sources,
    draft: z.boolean().default(false),
  }),
});

/**
 * Markham news roundups. One file per update run. Each item must carry a
 * source URL, which the schema enforces, so an unsourced item fails the build
 * instead of going live.
 */
const news = defineCollection({
  // Files starting with an underscore, such as _template.mdx, are ignored.
  loader: glob({ base: './src/content/news', pattern: '**/[^_]*.mdx' }),
  schema: z.object({
    ...seo,
    h1: z.string(),
    accent: z.string().optional(),
    published: z.coerce.date(),
    summary: z.string(),
    items: z
      .array(
        z.object({
          headline: z.string().min(8),
          date: z.coerce.date(),
          summary: z.string().min(40),
          sourceName: z.string().min(2),
          sourceUrl: z.string().url('Every news item needs a full https source URL'),
          neighbourhoods: z.array(z.string()).default([]),
          topic: z.enum(['Transit', 'Schools', 'Development', 'City', 'Parks', 'Market', 'Other']),
        })
      )
      .min(1),
    draft: z.boolean().default(false),
  }),
});

/**
 * Pillar guides at /<slug>/, one per topic cluster. See src/lib/guides.ts.
 */
const guides = defineCollection({
  loader: glob({ base: './src/content/guides', pattern: '**/[^_]*.mdx' }),
  schema: z.object({
    ...seo,
    h1: z.string().min(20).max(90),
    eyebrow: z.string(),
    lede: z.string().min(60).max(320),
    takeaway: z.string().min(120),
    updated: z.coerce.date(),
    related: z.array(z.string()).default([]),
    relatedServices: z.array(z.string()).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).min(6).max(12),
    sources: z
      .array(z.object({ name: z.string().min(2), url: z.string().url() }))
      .min(3, 'A pillar guide must cite its sources'),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  guides,
  neighbourhoods,
  services,
  blog,
  videos,
  'market-reports': marketReports,
  news,
};
