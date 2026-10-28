/**
 * Service pages written with the AI chat at /uploadservice/. They are saved in D1 and go live with the
 * next site build: scripts/pull-uploads.mjs writes each live one into src/content/services/, where
 * src/pages/services/[slug].astro builds it like every other service page.
 *
 * checkPage() is the server's word on a page, whatever the model or the browser sent. It fixes what
 * has one mechanical fix (long dashes, a comma before "and" or "or", American spellings, links to
 * pages that do not exist) and reports the rest:
 *   errors    block Publish. The AI step gets one automatic repair round for them.
 *   warnings  worth a look, never blocking.
 *
 *   node --experimental-strip-types src/lib/service-uploads.ts   (self-check)
 */
import { renderBody } from './uploads.ts';
import { wordCount } from './blog.ts';
import { HOODS } from './post-links.ts';
import type { D1 } from './vow.ts';
import { tidy } from '../../scripts/lib/quick-tidy.mjs';
import { CODE, SLUG, buildProblems } from '../../scripts/lib/service-pages.mjs';

export interface ServicePage {
  slug: string;
  name: string;
  h1: string;
  accent: string;
  title: string;
  description: string;
  summary: string;
  problem: string;
  steps: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  body: string;
  keywords: string[];
  relatedPosts: string[];
  relatedHoods: string[];
  relatedServices: string[];
}

/** Everything the model may link to or take facts from. */
export interface Catalog {
  posts: { slug: string; url: string; title: string; description: string; category: string; excerpt: string }[];
  /** Generated pages also carry their search title and description, so a new page cannot repeat them. */
  services: { slug: string; name: string; summary: string; url: string; keywords: string[]; title?: string; description?: string }[];
  guides: { slug: string; label: string; url: string; description: string }[];
  hoods: { slug: string; label: string; url: string }[];
  /** Addresses a new service page may not use (src/pages/uploadservice/site.json.ts). */
  taken: string[];
}

export const MAX_DRAFT = 60_000;
const SITE = 'https://kirbychanmarkham.com';

/** Words that never go on the site: the playbook's list (section 5), superlatives and promises. */
export const BANNED = [
  "in today's market", 'navigating', 'navigate the', 'delve', 'unlock', 'game changer', 'game-changer', 'nestled', 'vibrant', 'bustling', 'hidden gem',
  'look no further', 'dream home', "whether you're a first-time buyer or", 'in conclusion', "it's important to note", 'it is important to note', 'when it comes to',
  'best', 'number one', '#1', 'guaranteed', 'top-rated', 'top rated', 'ideal for', 'perfect for', 'world-class', 'unmatched', 'unbeatable',
  'not just', "isn't just", 'is not just', 'not only', 'not simply', 'more than just', "isn't about", 'is not about', "it's not about",
];
const VAGUE_ANCHOR = /^(here|click here|this|this page|this post|read more|more|link|learn more|see here)$/i;

const one = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n) : []);
const sentences = (s: string) => (s.match(/[^.?]+[.?](\s|$)/g) ?? []).length || (s.trim() ? 1 : 0);
const normalUrl = (url: string) => {
  let u = url.trim().replace(/^<|>$/g, '');
  if (u.startsWith(SITE)) u = u.slice(SITE.length) || '/';
  if (!u.startsWith('/') || u.startsWith('//')) return { internal: false, path: u };
  const path = u.split(/[?#]/)[0];
  return { internal: true, path: path.endsWith('/') ? path : `${path}/` };
};

/** Markdown links: the reader's words and the address. */
const LINK = /\[([^\]\n]+)\]\(\s*([^)\s]+)(?:\s+"[^"\n]*")?\s*\)/g;

export interface Checked {
  page: ServicePage;
  errors: string[];
  warnings: string[];
}

/**
 * Cleans and checks a page. A generated service in the catalog with the same address is the page
 * itself being edited, so it is not reported as taken.
 */
export function checkPage(raw: unknown, catalog: Catalog): Checked {
  const r = (raw ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];
  const count = { dashes: 0, commas: 0, spelling: 0 };
  // "--" turns into a long dash when the site is built, so it gets the same fix as one.
  const fix = (s: string) => tidy(s.replace(/\s*-{2,}\s*/g, ' \u2014 '), count) as string;
  const text = (v: unknown, max: number) => fix(one(v, max));

  const page: ServicePage = {
    slug: one(r.slug, 80).toLowerCase(),
    name: text(r.name, 120),
    h1: text(r.h1, 200),
    accent: text(r.accent, 80),
    title: text(r.title, 200),
    description: text(r.description, 400),
    summary: text(r.summary, 300),
    problem: text(r.problem, 1500),
    steps: list(r.steps, 10).map((s) => ({ title: text(s?.title, 200), body: text(s?.body, 1500) })),
    faq: list(r.faq, 10).map((f) => ({ q: text(f?.q, 300), a: text(f?.a, 1500) })),
    body: typeof r.body === 'string' ? fix(r.body.replace(/\r\n?/g, '\n').trim().slice(0, 30_000)) : '',
    keywords: [...new Set(list(r.keywords, 12).map((k) => one(k, 80).toLowerCase()).filter(Boolean))],
    relatedPosts: [],
    relatedHoods: [],
    relatedServices: [],
  };
  if (count.dashes || count.commas || count.spelling) {
    const what = [count.dashes && `${count.dashes} long dash${count.dashes > 1 ? 'es' : ''}`, count.commas && `${count.commas} comma${count.commas > 1 ? 's' : ''} before "and" or "or"`, count.spelling && `${count.spelling} American spelling${count.spelling > 1 ? 's' : ''}`].filter(Boolean);
    warnings.push(`Fixed automatically: ${what.join(', ')}.`);
  }

  // ---- Links: only pages in the catalog, the contact page and the services list ----
  const known = new Map<string, { kind: 'post' | 'service' | 'guide' | 'hood' | 'page'; slug: string }>([
    ['/contact/', { kind: 'page', slug: 'contact' }],
    ['/services/', { kind: 'page', slug: 'services' }],
  ]);
  for (const p of catalog.posts) known.set(normalUrl(p.url).path, { kind: 'post', slug: p.slug });
  for (const s of catalog.services) if (s.slug !== page.slug) known.set(normalUrl(s.url).path, { kind: 'service', slug: s.slug });
  for (const g of catalog.guides) known.set(normalUrl(g.url).path, { kind: 'guide', slug: g.slug });
  for (const h of catalog.hoods) known.set(normalUrl(h.url).path, { kind: 'hood', slug: h.slug });
  const linked: { kind: string; slug: string; path: string }[] = [];
  page.body = page.body.replace(LINK, (_m, words: string, url: string) => {
    const { internal, path } = normalUrl(url);
    const hit = internal ? known.get(path) : undefined;
    if (!hit) {
      warnings.push(internal ? `Removed a link to ${path}, which is not a page on the website. The words "${words}" stay.` : `Removed a link to another website (${path}). The page links only to our own pages.`);
      return words;
    }
    if (VAGUE_ANCHOR.test(words.trim())) errors.push(`The link "${words}" needs words that say where it goes.`);
    linked.push({ ...hit, path });
    return `[${words}](${path})`;
  });
  // Reference links and bare addresses would bypass the checks above.
  page.body = page.body.replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, '');
  if (/https?:\/\/|www\./i.test(page.body)) errors.push('The page text has a web address in it. Use a normal link to one of our pages instead.');

  const ids = (kind: string) => [...new Set(linked.filter((l) => l.kind === kind).map((l) => l.slug))];
  page.relatedPosts = ids('post');
  page.relatedHoods = [...new Set([...ids('hood'), ...list(r.relatedHoods, 12).filter((h): h is string => typeof h === 'string' && h in HOODS)])].slice(0, 4);
  page.relatedServices = [...new Set([...ids('service'), ...list(r.relatedServices, 12).filter((s): s is string => typeof s === 'string' && s !== page.slug && catalog.services.some((c) => c.slug === s))])].slice(0, 3);

  // ---- The address ----
  if (!SLUG.test(page.slug) || page.slug.length < 3 || page.slug.length > 60) errors.push('The web address must be 3 to 60 lowercase letters, numbers and single hyphens.');
  else if (catalog.taken.includes(page.slug) || catalog.services.some((s) => s.slug === page.slug && !s.url.endsWith(`/services/${page.slug}/`))) {
    errors.push(`The web address "${page.slug}" is already used by another page on the website. Choose a different one.`);
  }

  // ---- Lengths ----
  const len = (name: string, v: string, min: number, max: number) => {
    if (v.length < min || v.length > max) errors.push(v ? `The ${name} must be ${min} to ${max} characters. It is ${v.length}.` : `The ${name} is missing.`);
  };
  len('service name', page.name, 3, 60);
  len('main heading', page.h1, 10, 90);
  len('search title', page.title, 30, 60);
  len('search description', page.description, 140, 168);
  len('one line summary', page.summary, 20, 119);
  if (!page.accent || !page.h1.includes(page.accent) || page.accent.split(' ').length > 3) errors.push('The highlighted word must be one to three words taken from the main heading.');
  const ps = sentences(page.problem);
  if (ps < 2 || ps > 4) errors.push(`"The problem" must be 2 to 4 sentences. It is ${ps}.`);
  if (page.steps.length < 3 || page.steps.length > 6) errors.push(`The page needs 3 to 6 steps. It has ${page.steps.length}.`);
  page.steps.forEach((s, i) => {
    if (s.title.length < 3 || s.title.length > 80 || s.body.length < 30 || s.body.length > 600) errors.push(`Step ${i + 1} needs a short title and a body of one to four sentences.`);
  });
  if (page.faq.length < 4 || page.faq.length > 6) errors.push(`The page needs 4 to 6 questions. It has ${page.faq.length}.`);
  page.faq.forEach((f, i) => {
    if (!f.q.endsWith('?') || f.q.length < 10) errors.push(`Question ${i + 1} must be a full question ending with a question mark.`);
    const n = sentences(f.a);
    if (!f.a || n > 3) errors.push(`The answer to question ${i + 1} must be one to three sentences.`);
  });
  if (page.keywords.length < 3 || page.keywords.length > 8) errors.push(`The page needs 3 to 8 search phrases. It has ${page.keywords.length}.`);
  for (const k of page.keywords) {
    const words = k.split(' ');
    if (words.length < 2 || words.length > 7 || !/^[a-z0-9' -]+$/.test(k)) errors.push(`The search phrase "${k}" must be 2 to 7 plain lowercase words.`);
    // A phrase in most posts' titles would link this page from all of them.
    const hits = catalog.posts.filter((p) => `${p.title} ${p.description}`.toLowerCase().includes(k)).length;
    if (catalog.posts.length >= 6 && hits > catalog.posts.length / 3) errors.push(`The search phrase "${k}" is too general. It matches most blog posts.`);
  }

  // ---- The body ----
  const words = wordCount(page.body);
  if (words < 600 || words > 1400) errors.push(`The main text must be 600 to 1,400 words. It is ${words}.`);
  for (const m of page.body.matchAll(/^(#{1,6})\s/gm)) if (m[1].length < 2 || m[1].length > 3) errors.push('Headings in the main text must be level 2 or 3 (## or ###). The page already has its one main heading.');
  if (!/^##\s/m.test(page.body)) errors.push('The main text needs section headings (##).');
  const internal = linked.length;
  if (internal < 5) errors.push(`The main text needs at least 5 links to our own pages. It has ${internal}.`);
  const needPosts = Math.min(3, catalog.posts.length);
  if (page.relatedPosts.length < needPosts) errors.push(`The main text must link to at least ${needPosts} blog posts. It links to ${page.relatedPosts.length}.`);
  if (!linked.some((l) => l.kind === 'guide' || l.kind === 'hood')) errors.push('The main text must link to at least one guide or neighbourhood page.');
  if (!/\]\(\/contact\/\)/.test(page.body.slice(-500))) errors.push('The page must end with a sentence inviting the reader to contact us, with a link to /contact/.');
  if (CODE.test(page.body) || /[{}]/.test(page.body)) errors.push('The main text has code or curly brackets in it. Plain words only.');
  if (/!\[/.test(page.body)) errors.push('Pictures are not supported on these pages yet.');

  // ---- Every field: house style and compliance ----
  const fields: [string, string][] = [
    ['service name', page.name], ['main heading', page.h1], ['search title', page.title], ['search description', page.description],
    ['summary', page.summary], ['problem', page.problem], ...page.steps.flatMap((s, i): [string, string][] => [[`step ${i + 1}`, `${s.title} ${s.body}`]]),
    ...page.faq.flatMap((f, i): [string, string][] => [[`question ${i + 1}`, `${f.q} ${f.a}`]]), ['main text', page.body.replace(/\]\([^)]*\)/g, ']')], ['search phrases', page.keywords.join(', ')],
  ];
  const report = (what: string, where: string[]) => where.length && errors.push(`${what} (in the ${[...new Set(where)].join(', ')}).`);
  report('Raw HTML or code is not allowed', fields.filter(([, t]) => /[<>]/.test(t)).map(([n]) => n));
  report('No exclamation marks', fields.filter(([, t]) => /!(?!\[)/.test(t)).map(([n]) => n));
  report('No emoji', fields.filter(([, t]) => /\p{Extended_Pictographic}/u.test(t)).map(([n]) => n));
  report('No italics', fields.filter(([, t]) => /(?<![*\w])\*(?![*\s])[^*\n]+?(?<![\s*])\*(?![*\w])|(?<![_\w])_(?![_\s])[^_\n]+?(?<![\s_])_(?![_\w])/.test(t)).map(([n]) => n));
  for (const phrase of BANNED) {
    const re = new RegExp(`(^|[^a-z0-9#])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`, 'i');
    report(`The words "${phrase}" are not allowed on the website`, fields.filter(([, t]) => re.test(t)).map(([n]) => n));
  }
  // Figures: every number of two or more digits, dollar amount and percentage has to appear, as written,
  // in the catalog text of a post this page links to. The model cannot check facts, so this blocks invented ones.
  const sourced = catalog.posts.filter((p) => page.relatedPosts.includes(p.slug)).map((p) => `${p.title} ${p.description} ${p.excerpt}`).join(' ');
  const figures = new Set<string>();
  for (const [, t] of fields) {
    for (const m of t.matchAll(/\$\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?%|\d[\d,]*\d(?:\.\d+)?/g)) {
      const f = m[0].replace(/[,.]+$/, '');
      if ((f.startsWith('$') || f.endsWith('%') || /\d{2}/.test(f.replace(/[,.]/g, ''))) && !sourced.includes(f)) figures.add(f);
    }
  }
  if (figures.size) errors.push(`These figures are not in the blog posts the page links to, so they cannot be checked: ${[...figures].join(', ')}. Remove them or link the post they come from.`);
  const other = [...catalog.posts.flatMap((p) => [p.title, p.description]), ...catalog.services.filter((s) => s.slug !== page.slug).flatMap((s) => [s.name, s.title ?? '', s.description ?? ''])].map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (page.title && other.includes(page.title.toLowerCase())) errors.push('The search title is the same as another page on the website.');
  if (page.description && other.includes(page.description.toLowerCase())) errors.push('The search description is the same as another page on the website.');

  // ---- SEO hints ----
  const primary = page.keywords[0] ?? '';
  if (primary) {
    const opening = `${page.summary} ${page.problem} ${page.body.replace(/\]\([^)]*\)/g, ']')}`.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
    if (!opening.includes(primary)) warnings.push(`The main search phrase "${primary}" is not in the first 100 words.`);
    if (!page.title.toLowerCase().includes(primary.split(' ')[0])) warnings.push(`The search title does not start with the main search phrase "${primary}".`);
    const headings = page.body.match(/^#{2,3}\s.*$/gm) ?? [];
    if (!headings.some((h) => h.toLowerCase().includes(primary))) warnings.push(`No heading uses the main search phrase "${primary}".`);
  }

  // Last, the exact rules the site build applies, so a page that passes here can never stop a deploy.
  if (!errors.length) for (const p of buildProblems(page, new Set(catalog.taken))) errors.push(`The site build would refuse this page: ${p}.`);
  return { page, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

// ---- Preview: every field escaped, the body through the blog's sanitizing renderer ----
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** A plain preview of the page as one HTML document, for a sandboxed frame. */
export function previewHtml(p: ServicePage): string {
  const at = p.accent ? p.h1.indexOf(p.accent) : -1;
  const h1 = at >= 0 ? `${esc(p.h1.slice(0, at))}<span class="accent">${esc(p.accent)}</span>${esc(p.h1.slice(at + p.accent.length))}` : esc(p.h1);
  return `<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(p.title)}</title>
<style>body{font:17px/1.65 system-ui,sans-serif;color:#1b2320;max-width:760px;margin:0 auto;padding:16px}h1{font-size:2rem;line-height:1.2}.accent{color:#1f5045}.lede{font-size:1.15rem;color:#4a5753}.google{border:1px solid #d9e1de;border-radius:8px;padding:12px;margin-bottom:24px;background:#f6f8f7}.google b{color:#1a0dab;display:block}.google small{color:#006621}ol li{margin-bottom:12px}a{color:#1f5045}details{border-top:1px solid #d9e1de;padding:8px 0}</style></head><body>
<div class="google"><small>kirbychanmarkham.com/services/${esc(p.slug)}/</small><b>${esc(p.title)}</b>${esc(p.description)}</div>
<p><small>How we help</small></p><h1>${h1}</h1><p class="lede">${esc(p.summary)}</p>
<h2>The problem</h2><p>${esc(p.problem)}</p>
<h2>How we handle it</h2><ol>${p.steps.map((s) => `<li><strong>${esc(s.title)}</strong><br>${esc(s.body)}</li>`).join('')}</ol>
${renderBody(p.body).html}
<h2>${esc(p.name)} questions</h2>${p.faq.map((f) => `<details open><summary><strong>${esc(f.q)}</strong></summary><p>${esc(f.a)}</p></details>`).join('')}
</body></html>`;
}

// ---- D1 ----
const SCHEMA = `
CREATE TABLE IF NOT EXISTS service_uploads (slug TEXT PRIMARY KEY, live INTEGER NOT NULL, page TEXT NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS service_calls (at INTEGER NOT NULL)`;
let ready: Promise<unknown> | null = null;
export const ensureServiceSchema = (db: D1) =>
  (ready ??= (async () => {
    for (const sql of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) await db.prepare(sql).bind().run();
  })().catch((e) => {
    ready = null;
    throw e;
  }));

/** live: 1 on the website, 0 a draft or unpublished, -1 removed from the list. */
export async function getService(db: D1, slug: string): Promise<{ live: number; page: ServicePage; updated: number } | null> {
  const row = await db.prepare('SELECT live, page, updated FROM service_uploads WHERE slug = ?').bind(slug).first<{ live: number; page: string; updated: number }>();
  return row ? { live: row.live, page: JSON.parse(row.page), updated: row.updated } : null;
}

// Self-check: node --experimental-strip-types src/lib/service-uploads.ts
if (typeof process !== 'undefined' && !!import.meta.filename && import.meta.filename === process.argv[1]) {
  void (async () => {
    const { samplePage, sampleCatalog } = await import('../../scripts/lib/service-sample.mjs');
    const assert = (c: unknown, m: string) => {
      if (!c) throw new Error(`service-uploads: ${m}`);
    };
    const ok = checkPage(samplePage(), sampleCatalog());
    assert(ok.errors.length === 0, `the sample page passes, got ${ok.errors.join(' | ')}`);
    assert(ok.page.relatedPosts.length === 4 && ok.page.relatedHoods.includes('unionville'), 'related posts and neighbourhoods come from the links');
    const bad = (change: Partial<ServicePage>, re: RegExp, what: string) => {
      const got = checkPage({ ...samplePage(), ...change }, sampleCatalog()).errors.join(' | ');
      assert(re.test(got), `${what}: ${got}`);
    };
    bad({ problem: `${samplePage().problem} About 47% of sellers do this.` }, /figures.*47%/, 'an invented figure');
    bad({ summary: 'We are the best team for selling a home in Markham.' }, /"best"/, 'a banned word');
    bad({ slug: 'downsizing-markham' }, /already used/, 'a taken address');
    bad({ problem: 'Selling a home is hard. <script>alert(1)</script> We help.' }, /Raw HTML/, 'raw HTML');
    // Written with escapes and a joined comma so this file itself keeps the house style.
    const C = ',';
    const fixed = checkPage({ ...samplePage(), problem: `Selling a home in your neighbo${'r'}hood is hard \u2014 and slow. Families${C} and buyers wait.` }, sampleCatalog());
    assert(fixed.page.problem === 'Selling a home in your neighbourhood is hard and slow. Families and buyers wait.', `mechanical fixes, got ${fixed.page.problem}`);
    const linkless = checkPage({ ...samplePage(), body: `${samplePage().body}\n\nSee [the old page](/nowhere/) and [a site](https://example.com/).` }, sampleCatalog());
    assert(!linkless.page.body.includes('/nowhere/') && !linkless.page.body.includes('example.com') && linkless.warnings.some((w) => /nowhere/.test(w)), 'unknown and outside links dropped with a warning');
    assert(!previewHtml({ ...samplePage(), title: '<b>x</b>' }).includes('<b>x</b>'), 'preview escapes fields');
    console.log('service-uploads ok');
  })();
}
