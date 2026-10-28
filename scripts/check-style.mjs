/**
 * House style check for published content.
 *
 * Fails when content in src/ contains:
 *   - an em dash or an en dash
 *   - a comma directly before "and" or "or"
 *   - a common American spelling where Canadian English is required
 *
 * Runs in CI and in `npm run verify`, and the automated updater must pass it
 * before it is allowed to push. Usage: node scripts/check-style.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tidy } from './lib/quick-tidy.mjs';
import { RULES, prose } from './lib/house-style.mjs';

const ROOTS = ['src/content', 'src/data', 'src/pages', 'src/components', 'src/layouts', 'src/views', 'src/i18n'];
const EXT = /\.(mdx|md|astro|json)$/;

async function walk(dir) {
  const out = [];
  let entries = [];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) out.push(...(await walk(full)));
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

const files = (await Promise.all(ROOTS.map((r) => walk(r)))).flat();
const problems = [];

// Agents' quick posts (.mdx) get the mechanical fixes at deploy
// (scripts/prepare-quick-posts.mjs), so check them as they will be deployed.
const deployFixed = (file) => /^src\/content\/blog\/quick\/(?!_)[^/]+\.mdx$/.test(relative('.', file).split('\\').join('/'));

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const text = prose(file, deployFixed(file) ? tidy(raw, { dashes: 0, commas: 0, spelling: 0 }) : raw);
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.skip?.(file.split('\\').join('/'))) continue;
      rule.re.lastIndex = 0;
      if (rule.re.test(line)) {
        problems.push(`${relative('.', file)}:${i + 1}  ${rule.name}  ->  ${line.trim().slice(0, 110)}`);
      }
    }
  });
}

if (problems.length > 0) {
  console.error(`House style check failed with ${problems.length} problem(s):\n`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`House style check passed across ${files.length} files.`);
