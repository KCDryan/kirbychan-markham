/**
 * Pillar guides. Each guide replaces a service page and owns one topic
 * cluster: blog posts with `guide: <slug>` link up to it and the guide lists
 * them. Guides live in src/content/guides/ and are served at /<slug>/.
 */
export const GUIDES = {
  'downsizing-markham': {
    service: 'downsizing',
    label: 'Markham Downsizing Guide',
    short: 'Downsizing',
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
