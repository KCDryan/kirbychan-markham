import site from '../data/site.json';

export interface SeoInput {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  noindex?: boolean;
  type?: 'website' | 'article' | 'video.other';
}

export function canonical(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const withSlash = clean.endsWith('/') ? clean : `${clean}/`;
  return new URL(withSlash, site.url).toString();
}

export function absolute(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return new URL(pathOrUrl, site.url).toString();
}

export const DEFAULT_OG = '/og-default.png';

/** Full title with the brand suffix, kept under the 60 character target. */
export function pageTitle(title: string): string {
  return title;
}
