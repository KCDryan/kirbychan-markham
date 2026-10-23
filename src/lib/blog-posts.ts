import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORY_SLUGS, type BlogCategory } from './blog';

/** Published posts, newest first. Drafts and future-dated posts are left out. Ties break on the slug so order is stable. */
export async function publishedPosts(): Promise<CollectionEntry<'blog'>[]> {
  const now = Date.now();
  return (await getCollection('blog', ({ data }) => !data.draft && data.published.valueOf() <= now)).sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf() || a.id.localeCompare(b.id)
  );
}

/** Categories that have at least one published post, in the defined order. */
export function usedCategories(posts: CollectionEntry<'blog'>[]): BlogCategory[] {
  const used = new Set(posts.map((p) => p.data.category));
  return CATEGORY_SLUGS.filter((c) => used.has(c));
}
