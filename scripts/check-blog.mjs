/**
 * SEO and quality gate for blog posts in src/content/blog/.
 *
 * Runs in CI and in `npm run verify`. The automated blog writer must pass it
 * before it is allowed to push. It fails the build when a post:
 *   - has a file name that is not a short lowercase kebab-case slug
 *   - has a title, description or H1 that duplicates another page
 *   - has a title under 30 or over 60 characters
 *   - is dated in the future, or updated before it was published
 *   - is under 900 words, or has fewer than four H2 sections
 *   - uses a Markdown H1 in the body (the layout already renders the H1)
 *   - links to fewer than three internal pages, or to none of the
 *     neighbourhood guides, services, buyer or seller pages
 *   - links internally without a trailing slash, or externally without https
 *   - repeats a source URL, or has an FAQ question without a question mark
 *   - contains a placeholder such as TODO, TBD, lorem or [insert
 *
 * Usage: node scripts/check-blog.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';

const BLOG = 'src/content/blog';
const problems = [];
const fail = (file, message) => problems.push(`  ${file}: ${message}`);

function split(text) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  return { data: parse(m[1]), body: m[2] };
}

function words(body) {
  return body
    .replace(/<[^>]+>/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/[#*_>`|[\]-]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

async function frontmatterValues(dir, key) {
  const out = [];
  let names = [];
  try {
    names = await readdir(dir);
  } catch {
    return out;
  }
  for (const name of names.filter((n) => n.endsWith('.mdx') && !n.startsWith('_'))) {
    const parsed = split(await readFile(join(dir, name), 'utf8'));
    if (parsed?.data?.[key]) out.push({ file: `${dir}/${name}`, value: String(parsed.data[key]).trim().toLowerCase() });
  }
  return out;
}

const hoodSlugs = (await readdir('src/content/neighbourhoods')).filter((n) => n.endsWith('.mdx')).map((n) => n.replace(/\.mdx$/, ''));
const serviceSlugs = (await readdir('src/content/services')).filter((n) => n.endsWith('.mdx')).map((n) => n.replace(/\.mdx$/, ''));
const moneyPages = new Set([
  ...hoodSlugs.map((s) => `/${s}-markham/`),
  ...serviceSlugs.map((s) => `/services/${s}/`),
  '/buyers/',
  '/sellers/',
  '/downsizing-markham/',
  '/neighbourhoods/',
  '/services/',
]);

const today = new Date().toISOString().slice(0, 10);
const files = (await readdir(BLOG)).filter((n) => n.endsWith('.mdx') && !n.startsWith('_'));

const seen = { title: new Map(), description: new Map(), h1: new Map() };
// Titles and descriptions of the other content collections count as duplicates too.
for (const dir of ['src/content/neighbourhoods', 'src/content/services', 'src/content/videos', 'src/content/market-reports']) {
  for (const key of ['title', 'description']) {
    for (const { file, value } of await frontmatterValues(dir, key)) seen[key].set(value, file);
  }
}

for (const name of files) {
  const file = `${BLOG}/${name}`;
  const slug = name.replace(/\.mdx$/, '');
  const parsed = split(await readFile(file, 'utf8'));
  if (!parsed) {
    fail(file, 'no frontmatter block');
    continue;
  }
  const { data, body } = parsed;
  if (data.draft) continue;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 70) {
    fail(file, 'file name must be lowercase kebab-case, 70 characters or fewer');
  }

  for (const key of ['title', 'description', 'h1']) {
    const value = String(data[key] ?? '').trim().toLowerCase();
    if (!value) continue;
    if (seen[key].has(value)) fail(file, `${key} duplicates ${seen[key].get(value)}`);
    else seen[key].set(value, file);
  }
  const lengths = { h1: [20, 90], subtitle: [40, 200], description: [140, 168] };
  for (const [key, [min, max]] of Object.entries(lengths)) {
    const n = String(data[key] ?? '').length;
    if (n < min || n > max) fail(file, `${key} is ${n} characters, keep it between ${min} and ${max}`);
  }
  if (String(data.takeaway ?? '').length < 120) fail(file, 'takeaway must be at least 120 characters');
  const title = String(data.title ?? '');
  if (title.length < 30 || title.length > 60) fail(file, `title is ${title.length} characters, keep it between 30 and 60`);

  // TinaCMS saves dates as full ISO timestamps, so compare the date part only.
  const iso = (v) => (v instanceof Date ? v.toISOString() : String(v ?? '')).slice(0, 10);
  const published = iso(data.published);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(published)) fail(file, 'published must be a YYYY-MM-DD date');
  else if (published > today) fail(file, `published ${published} is in the future`);
  if (data.updated && iso(data.updated) < published) fail(file, 'updated is earlier than published');

  const count = words(body);
  if (count < 900) fail(file, `body is ${count} words, the minimum is 900`);

  if (/^#\s/m.test(body)) fail(file, 'the body must not contain a Markdown H1 (# ). Start sections at ##');
  const h2 = body.match(/^##\s+.+$/gm) ?? [];
  if (h2.length < 4) fail(file, `only ${h2.length} H2 sections, use at least 4`);

  const links = [...body.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);
  const internal = links.filter((l) => l.startsWith('/'));
  const external = links.filter((l) => /^[a-z]+:/i.test(l));
  const uniqueInternal = new Set(internal.map((l) => l.split('#')[0]));
  if (uniqueInternal.size < 3) fail(file, `links to ${uniqueInternal.size} internal pages in the body, use at least 3`);
  if (![...uniqueInternal].some((l) => moneyPages.has(l))) {
    fail(file, 'link to at least one neighbourhood guide, service, buyers or sellers page in the body');
  }
  for (const l of internal) {
    const path = l.split('#')[0];
    if (path && !path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) fail(file, `internal link ${l} needs a trailing slash`);
    if (path === `/blog/${slug}/`) fail(file, 'links to itself');
  }
  for (const l of external) {
    if (!l.startsWith('https://') && !l.startsWith('mailto:') && !l.startsWith('tel:')) fail(file, `external link ${l} must use https`);
  }

  const urls = (data.sources ?? []).map((s) => s.url);
  if (new Set(urls).size !== urls.length) fail(file, 'the same source URL is listed twice');
  for (const u of urls) if (!String(u).startsWith('https://')) fail(file, `source ${u} must use https`);

  for (const item of data.faq ?? []) {
    if (!String(item.q ?? '').trim().endsWith('?')) fail(file, `FAQ question "${item.q}" must end with a question mark`);
  }

  const guideSlugs = ['downsizing-markham'];
  if (data.guide && !guideSlugs.includes(data.guide)) fail(file, `guide "${data.guide}" is not a guide slug`);
  if (data.guide && !uniqueInternal.has(`/${data.guide}/`)) fail(file, `a post in the ${data.guide} cluster must link to /${data.guide}/ in the body`);
  if (data.neighbourhood && !hoodSlugs.includes(data.neighbourhood)) fail(file, `neighbourhood "${data.neighbourhood}" is not a neighbourhood slug`);
  for (const r of data.related ?? []) if (!hoodSlugs.includes(r)) fail(file, `related "${r}" is not a neighbourhood slug`);
  for (const r of data.relatedServices ?? []) if (!serviceSlugs.includes(r)) fail(file, `relatedServices "${r}" is not a service slug`);

  const whole = `${JSON.stringify(data)}\n${body}`;
  const placeholder = whole.match(/\b(TODO|TBD|FIXME|lorem ipsum)\b|\[insert/i);
  if (placeholder) fail(file, `contains the placeholder "${placeholder[0]}"`);
}

// Quick posts, written by agents in TinaCMS. Lighter rules: the site still
// needs a real headline, a real summary, a named author, a sensible length and
// a unique address, but not the sourcing and linking rules of a full post.
const QUICK = `${BLOG}/quick`;
const quickFiles = (await readdir(QUICK).catch(() => [])).filter((n) => n.endsWith('.mdx') && !n.startsWith('_'));
const fullSlugs = new Set(files.map((n) => n.replace(/\.mdx$/, '')));
for (const name of quickFiles) {
  const file = `${QUICK}/${name}`;
  const slug = name.replace(/\.mdx$/, '');
  const parsed = split(await readFile(file, 'utf8'));
  if (!parsed) {
    fail(file, 'no frontmatter block');
    continue;
  }
  const { data, body } = parsed;
  if (data.draft) continue;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 70) {
    fail(file, 'file name must be lowercase kebab-case, 70 characters or fewer');
  }
  if (fullSlugs.has(slug)) fail(file, `a post already uses the address /blog/${slug}/, choose a different headline`);

  const headline = String(data.headline ?? '').trim();
  if (headline.length < 10 || headline.length > 90) fail(file, `headline is ${headline.length} characters, keep it between 10 and 90`);
  const key = headline.toLowerCase();
  if (key && seen.h1.has(key)) fail(file, `headline duplicates ${seen.h1.get(key)}`);
  else if (key) seen.h1.set(key, file);
  const summary = String(data.summary ?? '').trim();
  if (summary.length < 50 || summary.length > 300) fail(file, `summary is ${summary.length} characters, keep it between 50 and 300`);
  if (!String(data.author ?? '').trim()) fail(file, 'add the author name so the post shows who wrote it');

  const iso = (v) => (v instanceof Date ? v.toISOString() : String(v ?? '')).slice(0, 10);
  const published = iso(data.published);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(published)) fail(file, 'published must be a date');
  else if (published > today) fail(file, `published ${published} is in the future`);

  const count = words(body);
  if (count < 300) fail(file, `body is ${count} words, the minimum for a quick post is 300`);
  if (/^#\s/m.test(body)) fail(file, 'use Heading 2 or smaller in the body. The headline is already the page title');

  for (const l of [...body.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1])) {
    if (/^[a-z]+:/i.test(l) && !/^(https|mailto|tel):/i.test(l)) fail(file, `link ${l} must use https`);
  }
  for (const item of data.faq ?? []) {
    if (!String(item.q ?? '').trim().endsWith('?')) fail(file, `FAQ question "${item.q}" must end with a question mark`);
    if (!String(item.a ?? '').trim()) fail(file, `FAQ question "${item.q}" has no answer`);
  }
  for (const src of data.sources ?? []) {
    if (!String(src.url ?? '').startsWith('https://')) fail(file, `source ${src.url} must be a full https link`);
  }
  for (const r of data.related ?? []) if (!hoodSlugs.includes(r)) fail(file, `related "${r}" is not a neighbourhood slug`);
  for (const r of data.relatedServices ?? []) if (!serviceSlugs.includes(r)) fail(file, `relatedServices "${r}" is not a service slug`);
  const placeholder = `${JSON.stringify(data)}\n${body}`.match(/\b(TODO|TBD|FIXME|lorem ipsum)\b|\[insert/i);
  if (placeholder) fail(file, `contains the placeholder "${placeholder[0]}"`);
}

if (problems.length > 0) {
  console.error(`Blog check failed with ${problems.length} problem(s):`);
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Blog check passed for ${files.length} post(s) and ${quickFiles.length} quick post(s).`);
