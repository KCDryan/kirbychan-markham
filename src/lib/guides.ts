/**
 * Pillar guides. Each guide replaces a service page and owns one topic
 * cluster: blog posts with `guide: <slug>` link up to it and the guide lists
 * them. Guides live in src/content/guides/ and are served at /<slug>/.
 */
export const GUIDE_LANGS = ['zh', 'fr', 'fa'] as const;
export type GuideLang = (typeof GUIDE_LANGS)[number];

export const GUIDES = {
  'downsizing-markham': {
    service: 'downsizing',
    label: 'Markham Downsizing Guide',
    short: 'Downsizing',
    langs: GUIDE_LANGS,
  },
  'new-construction-markham': {
    service: 'new-construction',
    label: 'Markham New Construction Guide',
    short: 'New construction',
    langs: GUIDE_LANGS,
  },
  'luxury-homes-markham': {
    service: 'luxury',
    label: 'Markham Luxury Home Guide',
    short: 'Luxury homes',
    langs: GUIDE_LANGS,
  },
  'selling-an-estate-home-markham': {
    service: 'estate-sales',
    label: 'Markham Estate Home Guide',
    short: 'Estate sales',
    langs: GUIDE_LANGS,
  },
  'investment-property-markham': {
    service: 'investors',
    label: 'Markham Investment Property Guide',
    short: 'Investment property',
    langs: GUIDE_LANGS,
  },
  'relocating-to-markham': {
    service: 'relocation',
    label: 'Markham Relocation Guide',
    short: 'Relocation',
    langs: GUIDE_LANGS,
  },
  'upsizing-markham': {
    service: 'upsizing',
    label: 'Markham Upsizing Guide',
    short: 'Upsizing',
    langs: GUIDE_LANGS,
  },
  'selling-a-home-after-separation-markham': {
    service: 'separation-and-divorce',
    label: 'Markham Separation and Divorce Guide',
    short: 'Separation and divorce',
    langs: [],
  },
  'first-time-home-buyers-markham': {
    service: 'first-time-buyers',
    label: 'Markham First Time Home Buyer Guide',
    short: 'First time buyers',
    langs: GUIDE_LANGS,
  },
} as const;

export type GuideSlug = keyof typeof GUIDES;
export const GUIDE_SLUGS = Object.keys(GUIDES) as [GuideSlug, ...GuideSlug[]];

/** Service slugs whose page is now a guide, mapped to the guide path. */
const SERVICE_TO_GUIDE: Record<string, string> = Object.fromEntries(
  Object.entries(GUIDES).map(([slug, g]) => [g.service, `/${slug}/`])
);

/** The public URL of a service: its guide when it has one. */
export function servicePath(serviceSlug: string): string {
  return SERVICE_TO_GUIDE[serviceSlug] ?? `/services/${serviceSlug}/`;
}

export function hasGuide(serviceSlug: string): boolean {
  return serviceSlug in SERVICE_TO_GUIDE;
}

/**
 * The languages a root level path is published in, for example
 * /new-construction-markham/. Empty when the path is not a guide, or when the
 * guide has no translations yet, so no hreflang alternates are emitted for it.
 */
export function guideLangs(path: string): readonly string[] {
  const slug = path.replace(/^\/|\/$/g, '') as GuideSlug;
  const guide = GUIDES[slug];
  if (!guide || guide.langs.length === 0) return [];
  return ['en', ...guide.langs];
}
