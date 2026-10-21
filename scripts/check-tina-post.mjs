/**
 * Checks quick posts saved from TinaCMS as soon as they are committed, so a bad
 * save shows up on the Tina commit instead of stopping the next blog run.
 *
 *   - house style (the same rules and skips as scripts/check-style.mjs)
 *   - sources: a URL on a BLOCKED domain is an error, a URL that is not a primary
 *     source is a warning (scripts/lib/source-domains.mjs, BLOG-PLAYBOOK.md section 4)
 *   - body links: a markdown link ](https://...) to a BLOCKED domain is an error
 *
 * Usage: node scripts/check-tina-post.mjs [--base <sha>] [files...]
 * With no files it checks the quick posts changed in <sha>..HEAD (default HEAD~1).
 * A base of all zeros (a push that creates a branch) checks HEAD~1..HEAD. Exits 1
 * on any error. Under GitHub Actions it also writes ::error and ::warning annotations.
 * It never changes a file: a person decides what to do about each problem.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { styleProblems } from './lib/house-style.mjs';
import { sourceKind } from './lib/source-domains.mjs';

const QUICK = 'src/content/blog/quick/';
const BLOCKED_WHY = 'is another brokerage, agent, portal, lender, law firm, property manager or content farm (BLOG-PLAYBOOK §4)';

function changedQuickPosts(base) {
  try {
    const out = execFileSync('git', ['diff', '--name-only', '--diff-filter=d', base, 'HEAD', '--', QUICK], { encoding: 'utf8' });
    return out.split('\n').filter((f) => /\.mdx?$/.test(f) && !f.split('/').pop().startsWith('_'));
  } catch {
    console.error(`Could not list the files changed in ${base}..HEAD. Check out with fetch-depth: 0 or pass the files.`);
    process.exit(1);
  }
}

/** Source URLs in the frontmatter `sources:` list, with their line numbers. */
function sourceUrls(text) {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return [];
  const out = [];
  let inSources = false;
  for (let i = 1; i < lines.length && lines[i].trim() !== '---'; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) inSources = /^sources:/.test(line);
    const m = inSources && line.match(/^\s*(?:-\s+)?url:\s*['"]?([^'"\s]+)/);
    if (m) out.push({ line: i + 1, url: m[1] });
  }
  return out;
}

/** Markdown link targets ](https://...) in the body, with their line numbers. */
function bodyLinks(text) {
  const lines = text.split('\n');
  let start = 0;
  if (lines[0].trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    start = end === -1 ? lines.length : end + 1;
  }
  const out = [];
  for (let i = start; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/\]\((https?:\/\/[^)\s]+)/g)) out.push({ line: i + 1, url: m[1] });
  }
  return out;
}

const gha = process.env.GITHUB_ACTIONS === 'true';
// Annotation messages must not contain raw newlines, % or the :: separator.
const ann = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

const args = process.argv.slice(2);
let base = 'HEAD~1';
const at = args.indexOf('--base');
if (at !== -1) {
  const sha = args.splice(at, 2)[1];
  if (!sha) {
    console.error('--base needs a commit sha.');
    process.exit(1);
  }
  if (!/^0+$/.test(sha)) base = sha;
}
const files = args.length ? args : changedQuickPosts(base);
if (!files.length) {
  console.log(`No quick posts changed in ${base}..HEAD.`);
  process.exit(0);
}

let errors = 0;
let warnings = 0;
const report = (level, file, line, rule, text) => {
  const where = `${relative('.', file)}:${line}`;
  (level === 'error' ? console.error : console.warn)(`  ${where}  ${rule}  ->  ${text}`);
  if (gha) console.log(`::${level} file=${relative('.', file)},line=${line},title=${rule}::${ann(text)}`);
  if (level === 'error') errors++;
  else warnings++;
};

for (const file of files) {
  if (!existsSync(file)) {
    report('error', file, 1, 'missing file', 'not found');
    continue;
  }
  const text = await readFile(file, 'utf8');
  for (const p of styleProblems(file, text)) report('error', file, p.line, p.rule, p.text);
  for (const s of sourceUrls(text)) {
    const kind = sourceKind(s.url);
    if (kind === 'blocked') {
      report('error', file, s.line, 'blocked source', `${s.url} ${BLOCKED_WHY}`);
    } else if (kind === 'other') {
      report('warning', file, s.line, 'not a primary source', `${s.url}: check BLOG-PLAYBOOK §4`);
    }
  }
  for (const l of bodyLinks(text)) {
    if (sourceKind(l.url) === 'blocked') {
      report('error', file, l.line, 'blocked link', `${l.url} ${BLOCKED_WHY}`);
    }
  }
}

const summary = `${files.length} quick post(s) checked: ${errors} error(s), ${warnings} warning(s).`;
if (errors) {
  console.error(`\nTina post check failed. ${summary}`);
  process.exit(1);
}
console.log(`\nTina post check passed. ${summary}`);
