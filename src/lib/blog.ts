/** Blog categories. Each has a page at /blog/category/<slug>/. */
export const BLOG_CATEGORIES = {
  buying: 'Buying',
  selling: 'Selling',
  neighbourhoods: 'Neighbourhoods',
  market: 'Market',
  condos: 'Condos',
  'new-construction': 'New Construction',
  'moving-to-markham': 'Moving to Markham',
  downsizing: 'Downsizing',
  investing: 'Investing',
  'costs-and-taxes': 'Costs and Taxes',
} as const;

export type BlogCategory = keyof typeof BLOG_CATEGORIES;

export const CATEGORY_SLUGS = Object.keys(BLOG_CATEGORIES) as [BlogCategory, ...BlogCategory[]];

/** Posts per page on /blog/ and its numbered pages. */
export const POSTS_PER_PAGE = 12;

/** Words in an MDX body, ignoring frontmatter, markup and link targets. */
export function wordCount(body: string | undefined): number {
  if (!body) return 0;
  const text = body
    .replace(/^---[\s\S]*?\n---/, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/[#*_>`|[\]-]/g, ' ');
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

/** Reading time in whole minutes at 230 words a minute, never less than 1. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 230));
}
