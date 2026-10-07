/**
 * Every photo in src/assets/photos must be listed in src/data/photo-credits.json, either with its
 * author, licence and source or marked as our own. /photo-credits/ is built from that file, so a
 * photo that passes here is credited on the site.
 *
 * Usage: node scripts/check-photos.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';

const ROOT = 'src/assets/photos';
const credits = JSON.parse(readFileSync('src/data/photo-credits.json', 'utf8'));
const files = readdirSync(ROOT, { recursive: true }).filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f));
const problems = [];
for (const file of files) {
  const key = file.replace(/\\/g, '/').replace(/\.[^.]+$/, '');
  const c = credits.find((x) => (x.file ?? `neighbourhoods/${x.slug}`) === key);
  if (!c) problems.push(`${ROOT}/${file}: no entry in photo-credits.json`);
  else if (!c.own && !(c.author && c.license && /^https:\/\//.test(c.licenseUrl ?? '') && /^https:\/\//.test(c.source ?? ''))) problems.push(`${ROOT}/${file}: the credit needs author, license, licenseUrl and source`);
  else if (!String(c.shows ?? '').trim()) problems.push(`${ROOT}/${file}: say what the photo shows`);
}
if (problems.length) {
  console.error(`Photo credit check failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Photo credit check passed for ${files.length} photo(s).`);
