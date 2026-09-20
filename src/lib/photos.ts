import type { ImageMetadata } from 'astro';
import credits from '../data/photo-credits.json';

/**
 * Drop-in photo lookup.
 *
 * Any image placed in src/assets/photos/ is picked up automatically by its path
 * without the extension. For example:
 *
 *   src/assets/photos/home-hero.jpg               -> key "home-hero"
 *   src/assets/photos/kirby-portrait.jpg          -> key "kirby-portrait"
 *   src/assets/photos/neighbourhoods/cornell.jpg  -> key "neighbourhoods/cornell"
 *
 * No code change is needed to add or replace a photo. If no file matches a key,
 * callers fall back to a labelled placeholder so the build never breaks.
 */
const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/photos/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}',
  { eager: true }
);

const byKey = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  const key = path
    .replace('/src/assets/photos/', '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase();
  byKey.set(key, mod.default);
}

export function photo(key: string): ImageMetadata | undefined {
  return byKey.get(key.toLowerCase());
}

export function neighbourhoodPhoto(slug: string): ImageMetadata | undefined {
  return photo(`neighbourhoods/${slug}`);
}

/**
 * What a neighbourhood photo shows, from src/data/photo-credits.json. Used as
 * alt text: the card's link already names the place, so the alt describes the
 * picture instead of repeating the name.
 */
export function photoAlt(slug: string): string | undefined {
  return credits.find((c) => c.slug === slug)?.shows;
}
