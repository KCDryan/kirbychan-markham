/**
 * Service pages made at /uploadservice/, as the build sees them. Shared by scripts/pull-uploads.mjs
 * (writes them into src/content/services/) and src/lib/service-uploads.ts (the API's own checks), so
 * both agree. Nothing here touches the file system: the API bundles it for Cloudflare.
 *
 * A generated page is always plain data: flat frontmatter with JSON values (valid YAML, one key per
 * line) and a Markdown body with nothing MDX could run.
 */
import { styleProblems } from './house-style.mjs';

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** MDX that would run as code: tags, braces, import or export lines. Same test as src/pages/blog/built-posts.json.ts. */
export const CODE = /^(import|export) |<[A-Za-z/!]|(^|[^\\])\{/m;
const q = (v) => JSON.stringify(v);

/** The .mdx file for a page. `order` places it after the built-in services, `version` marks it as ours. */
export function serviceMdx(p, order, version) {
  return [
    '---',
    `name: ${q(p.name)}`,
    `h1: ${q(p.h1)}`,
    `accent: ${q(p.accent)}`,
    `title: ${q(p.title)}`,
    `description: ${q(p.description)}`,
    `order: ${order}`,
    `summary: ${q(p.summary)}`,
    `problem: ${q(p.problem)}`,
    `steps: ${q(p.steps.map((s) => ({ title: s.title, body: s.body })))}`,
    `faq: ${q(p.faq.map((f) => ({ q: f.q, a: f.a })))}`,
    `keywords: ${q(p.keywords)}`,
    `relatedPosts: ${q(p.relatedPosts)}`,
    `relatedHoods: ${q(p.relatedHoods)}`,
    `relatedServices: ${q(p.relatedServices)}`,
    `uploadVersion: ${q(String(version))}`,
    '---',
    '',
    p.body.trim(),
    '',
  ].join('\n');
}

const isText = (v, min = 1, max = Infinity) => typeof v === 'string' && v.trim().length >= min && v.length <= max;
const texts = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');

/**
 * Why a page cannot go into the build: the services collection schema, an address already taken,
 * anything MDX would run and the house style check. Empty when it is safe to write.
 */
export function buildProblems(p, taken = new Set()) {
  const out = [];
  if (!p || typeof p !== 'object') return ['not a page'];
  if (typeof p.slug !== 'string' || !SLUG.test(p.slug) || p.slug.length < 3 || p.slug.length > 60) out.push('address');
  else if (taken.has(p.slug)) out.push('address already used by another page');
  for (const k of ['name', 'h1', 'accent', 'summary', 'problem', 'body']) if (!isText(p[k])) out.push(k);
  if (!isText(p.title, 1, 60)) out.push('title');
  if (!isText(p.description, 140, 168)) out.push('description');
  if (!Array.isArray(p.steps) || p.steps.length < 3 || !p.steps.every((s) => isText(s?.title) && isText(s?.body))) out.push('steps');
  if (!Array.isArray(p.faq) || !p.faq.every((f) => isText(f?.q) && isText(f?.a))) out.push('faq');
  for (const k of ['keywords', 'relatedPosts', 'relatedHoods', 'relatedServices']) if (!texts(p[k])) out.push(k);
  if (out.length) return out;
  const fields = [p.name, p.h1, p.accent, p.title, p.description, p.summary, p.problem, ...p.steps.flatMap((s) => [s.title, s.body]), ...p.faq.flatMap((f) => [f.q, f.a]), ...p.keywords];
  if (fields.some((f) => f.includes('<'))) out.push('raw HTML');
  if (CODE.test(p.body)) out.push('code in the body');
  for (const problem of styleProblems(`src/content/services/${p.slug}.mdx`, serviceMdx(p, 100, 0))) out.push(`house style, line ${problem}`);
  return out;
}

/** True when a services file was written by pull-uploads (it carries uploadVersion). */
export const isGenerated = (text) => /^uploadVersion:/m.test(text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '');
