import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORY_SLUGS } from './lib/blog';
import { GUIDE_SLUGS } from './lib/guides';

/**
 * Chinese, Japanese, Farsi and Arabic carry far more meaning per character than
 * English, so a translated field that reads at the right length is much shorter
 * by `.length`. Minimum lengths drop for those scripts. Maximums stay, because
 * they exist to stop Google truncating the snippet.
 */
const DENSE_SCRIPT = /[\u4e00-\u9fff\u3040-\u30ff\u0600-\u06ff]/;
export const atLeast = (min: number) => (s: string) =>
  s.length >= (DENSE_SCRIPT.test(s) ? Math.ceil(min * 0.3) : min);

const seo = {
  title: z.string().max(60, 'Keep titles under 60 characters'),
  description: z
    .string()
    .refine(atLeast(140), 'Meta descriptions should run about 150 to 160 characters')
    .refine((s) => s.length <= 168, 'Meta descriptions should run about 150 to 160 characters'),
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
 * Blog posts at /blog/<slug>/. The file name is the slug.
 *
 * Two kinds of post share the collection and the layout:
 *
 * - Full posts in src/content/blog/. Researched and sourced, with every SEO
 *   field set by hand. scripts/check-blog.mjs enforces the strict rules.
 * - Quick posts in src/content/blog/quick/, written by agents in TinaCMS with a
 *   short form: headline, summary, category, date, author and body. The
 *   missing fields are derived below, so every page and feed sees the same
 *   shape of data. A file is a quick post when it has `headline` and no `h1`.
 */
const blogSources = z
  .array(
    z.object({
      name: z.string().min(2),
      url: z.string().url('Every source needs a full https URL'),
    })
  );

const author = {
  author: z.string().optional().describe('Name shown in the byline. Blank means the team'),
  authorTitle: z.string().optional().describe('For example "Sales Representative"'),
};

const fullPost = z.object({
  quick: z.literal(false),
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
  sources: blogSources.min(1, 'Every blog post must cite at least one source'),
  draft: z.boolean().default(false),
  ...author,
});

const quickPost = z.object({
  quick: z.literal(true),
  headline: z.string().min(10, 'The headline needs at least 10 characters').max(90, 'Keep the headline under 90 characters'),
  summary: z.string().min(50, 'The summary needs at least 50 characters').max(300, 'Keep the summary under 300 characters'),
  category: z.enum(CATEGORY_SLUGS),
  published: z.coerce.date(),
  updated: z.coerce.date().optional(),
  sources: blogSources.default([]),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  draft: z.boolean().default(false),
  ...author,
});

/** Shorten to at most `max` characters on a word boundary. */
const clip = (text: string, max: number) => {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 1)).replace(/[\s,;:.]+$/, '');
};

const blog = defineCollection({
  loader: glob({
    base: './src/content/blog',
    pattern: '**/[^_]*.mdx',
    // Quick posts live in quick/ but are served at /blog/<file-name>/ like any other post.
    generateId: ({ entry }) => entry.replace(/\.mdx$/, '').split('/').pop()!,
  }),
  schema: z
    .preprocess(
      (raw) => {
        if (!raw || typeof raw !== 'object') return raw;
        const r = raw as Record<string, unknown>;
        return { ...r, quick: 'headline' in r && !('h1' in r) };
      },
      z.discriminatedUnion('quick', [fullPost, quickPost])
    )
    .transform((d) => {
      if (!d.quick) return d;
      const { headline, summary, ...rest } = d;
      return {
        ...rest,
        title: clip(headline, 60),
        description: clip(summary, 160),
        ogImage: undefined,
        noindex: false,
        h1: headline,
        subtitle: summary,
        takeaway: summary,
        neighbourhood: undefined,
        related: [] as string[],
        relatedServices: [] as string[],
        guide: undefined,
      };
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
    h1: z.string().refine(atLeast(20)).refine((s) => s.length <= 90),
    eyebrow: z.string(),
    lede: z.string().refine(atLeast(60)).refine((s) => s.length <= 320),
    takeaway: z.string().refine(atLeast(120)),
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
