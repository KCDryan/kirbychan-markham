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

const ROOTS = ['src/content', 'src/data', 'src/pages', 'src/components', 'src/layouts'];
const EXT = /\.(mdx|md|astro|json)$/;

const RULES = [
  { name: 'em dash', re: /—/g },
  { name: 'en dash', re: /–/g },
  { name: 'comma before and/or', re: /,\s+(and|or)\b/g },
  {
    name: 'American spelling',
    // Whole words only, so CSS keywords such as "color:" or "center" in style
    // blocks are not affected: those are stripped before checking.
    re: /\b(neighborhoods?|favorites?|behaviors?|honors?|labors?|organizations?|realized?|analyzed?|centers?|colors?)\b/gi,
  },
];

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

/** Remove code and style so only human-facing text is checked. */
function prose(file, text) {
  let t = text;
  // Style blocks: CSS uses "color" and "center" legitimately.
  t = t.replace(/<style[\s\S]*?<\/style>/g, (m) => '\n'.repeat(m.split('\n').length - 1));
  // Frontmatter code fences in .astro files are TypeScript, not prose.
  if (file.endsWith('.astro')) {
    t = t.replace(/^---[\s\S]*?\n---/, (m) => '\n'.repeat(m.split('\n').length - 1));
  }
  // YAML comments in MDX templates.
  t = t.replace(/^\s*#.*$/gm, '');
  // Markup attributes such as class:list={[...]} or name="theme-color" are code.
  // Prose inside attributes (alt text, labels) is short and reviewed by hand.
  if (file.endsWith('.astro')) {
    t = t.replace(/\b[\w:-]+=("[^"]*"|\{[^}]*\})/g, '');
  } else {
    t = t.replace(/\b(class|className|style)=("[^"]*"|\{[^}]*\})/g, '');
  }
  return t;
}

const files = (await Promise.all(ROOTS.map((r) => walk(r)))).flat();
const problems = [];

for (const file of files) {
  const text = prose(file, await readFile(file, 'utf8'));
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const rule of RULES) {
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
