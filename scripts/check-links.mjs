/**
 * Internal link checker for the built site.
 *
 * Walks dist/, pulls every href and src out of the HTML and confirms that each
 * internal one resolves to a file that was actually built. External links are
 * listed but not requested, so the check stays fast and deterministic in CI.
 *
 * Usage: node scripts/check-links.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const DIST = resolve('dist');
const IGNORE_PREFIXES = ['mailto:', 'tel:', 'javascript:', 'data:', '#'];

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) out.push(...(await walk(full)));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function extract(html) {
  const links = new Set();
  const pattern = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) links.add(match[1]);
  return [...links];
}

function resolvesInDist(link) {
  const [pathOnly] = link.split(/[?#]/);
  if (!pathOnly || pathOnly === '/') return existsSync(join(DIST, 'index.html'));

  const clean = pathOnly.replace(/^\//, '');
  const candidates = [
    join(DIST, clean),
    join(DIST, clean, 'index.html'),
    join(DIST, `${clean}.html`),
    join(DIST, clean.replace(/\/$/, ''), 'index.html'),
  ];
  return candidates.some((candidate) => existsSync(candidate));
}

if (!existsSync(DIST)) {
  console.error('dist/ not found. Run npm run build first.');
  process.exit(1);
}

const files = await walk(DIST);
const broken = [];
const external = new Set();
let checked = 0;

for (const file of files) {
  const html = await readFile(file, 'utf8');
  for (const link of extract(html)) {
    if (IGNORE_PREFIXES.some((prefix) => link.startsWith(prefix))) continue;
    if (/^https?:\/\//i.test(link) || link.startsWith('//')) {
      external.add(link);
      continue;
    }
    if (!link.startsWith('/')) continue; // relative assets emitted by the bundler
    checked += 1;
    if (!resolvesInDist(link)) {
      broken.push({ page: relative(DIST, file), link });
    }
  }
}

console.log(`Pages scanned:     ${files.length}`);
console.log(`Internal links:    ${checked}`);
console.log(`External links:    ${external.size} (not requested)`);

if (broken.length > 0) {
  console.error(`\nBroken internal links: ${broken.length}\n`);
  for (const item of broken) console.error(`  ${item.page}  ->  ${item.link}`);
  process.exit(1);
}

console.log('\nNo broken internal links.');
