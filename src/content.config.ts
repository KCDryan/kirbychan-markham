import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const seo = {
  title: z.string().max(60, 'Keep titles under 60 characters'),
  description: z
    .string()
    .min(140, "Meta descriptions should run about 150 to 160 characters")
    .max(168, "Meta descriptions should run about 150 to 160 characters"),
  ogImage: z.string().optional(),
  noindex: z.boolean().default(false),
};

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
    caseStudy: z.string().optional().describe('Slug of a related case study'),
    faq,
    draft: z.boolean().default(false),
  }),
});

const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.mdx' }),
  schema: z.object({
    ...seo,
    h1: z.string(),
    accent: z.string(),
    subtitle: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    readMinutes: z.number(),
    takeaway: z.string().describe('The quick answer box at the top'),
    neighbourhood: z.string().optional(),
    related: z.array(z.string()).default([]),
    faq,
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

const caseStudies = defineCollection({
  loader: glob({ base: './src/content/case-studies', pattern: '**/*.mdx' }),
  schema: z.object({
    ...seo,
    h1: z.string(),
    accent: z.string(),
    published: z.coerce.date(),
    situation: z.string(),
    difficulty: z.string(),
    result: z.string(),
    atAGlance: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    neighbourhood: z.string().optional(),
    service: z.string().optional(),
    featured: z.boolean().default(false),
    placeholder: z
      .boolean()
      .default(false)
      .describe('True renders a visible notice that this is a layout sample, not a real client'),
    faq,
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
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  neighbourhoods,
  services,
  articles,
  videos,
  'case-studies': caseStudies,
  'market-reports': marketReports,
};
