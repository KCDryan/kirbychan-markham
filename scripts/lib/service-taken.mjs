/**
 * The addresses a service page made at /uploadservice/ may not take, read from the repository.
 * Used by scripts/pull-uploads.mjs at build and by src/pages/uploadservice/site.json.ts, which hands
 * the list to the API.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isGenerated } from './service-pages.mjs';

/**
 * Every address a generated service may not take, read from the repository: built-in services,
 * pillar guides and the services they replace, neighbourhoods and their /<slug>-markham/ routes,
 * top-level pages and Functions plus every source path in public/_redirects (whole and last part).
 */
export function takenSlugs(root = '.') {
  const taken = new Set(['services', 'blog', 'upload', 'uploadservice', 'api', 'admin', 'listing', 'contact']);
  const names = (dir, ext = /\.mdx$/) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((n) => ext.test(n)).map((n) => n.replace(ext, '')) : []);
  for (const s of names('src/content/services')) if (!isGenerated(readFileSync(join(root, 'src/content/services', `${s}.mdx`), 'utf8'))) taken.add(s);
  for (const g of names('src/content/guides')) taken.add(g);
  for (const m of readFileSync(join(root, 'src/lib/guides.ts'), 'utf8').matchAll(/service: '([a-z0-9-]+)'/g)) taken.add(m[1]);
  for (const h of names('src/content/neighbourhoods')) taken.add(h).add(`${h}-markham`);
  for (const dir of ['src/pages', 'functions']) for (const n of names(dir, /(\.[a-z]+)+$|$/)) if (!n.startsWith('[') && !n.startsWith('_')) taken.add(n);
  const redirects = existsSync(join(root, 'public/_redirects')) ? readFileSync(join(root, 'public/_redirects'), 'utf8') : '';
  for (const line of redirects.split('\n')) {
    const from = line.trim().split(/\s+/)[0];
    if (!from?.startsWith('/')) continue;
    const parts = from.replace(/\*$/, '').split('/').filter(Boolean);
    if (!parts.length) continue;
    taken.add(parts.join('/')).add(parts[parts.length - 1]);
  }
  return taken;
}
