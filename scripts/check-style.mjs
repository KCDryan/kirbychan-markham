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
 * The rules live in scripts/lib/house-style.mjs.
 *
 * With BLOG_RUN=1 (the scheduled blog run) a problem in an agent's quick post is
 * reported but does not fail the check: the deploy fixes or holds that post back
 * (scripts/prepare-quick-posts.mjs). Problems anywhere else still fail.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { styleProblems } from './lib/house-style.mjs';

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
const blogRun = process.env.BLOG_RUN === '1';
const problems = [];
const warnings = [];

for (const file of files) {
  const quick = file.split('\\').join('/').includes('content/blog/quick/');
  for (const p of styleProblems(file, await readFile(file, 'utf8'))) {
    (blogRun && quick ? warnings : problems).push(`${relative('.', file)}:${p.line}  ${p.rule}  ->  ${p.text}`);
  }
}

if (warnings.length > 0) {
  console.warn(`House style: ${warnings.length} problem(s) in quick posts, reported only because BLOG_RUN=1:\n`);
  for (const w of warnings) console.warn('  ' + w);
  console.warn('');
}
if (problems.length > 0) {
  console.error(`House style check failed with ${problems.length} problem(s):\n`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`House style check passed across ${files.length} files.`);
