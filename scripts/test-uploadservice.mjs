/**
 * Local test for the service page chat. Bundles the real Pages Function with esbuild (resolving
 * packages the way Cloudflare does) and runs it against node:sqlite standing in for D1. The Anthropic
 * API is a mock answering on a fake fetch, so nothing leaves this machine and no key is needed.
 *
 *   node scripts/test-uploadservice.mjs
 *
 * Fails loudly on the first broken rule. Run it after any change to src/lib/service-uploads.ts,
 * src/lib/service-ai.ts, functions/api/uploadservice/[action].ts or scripts/pull-uploads.mjs.
 */
import { build } from 'esbuild';
import { DatabaseSync } from 'node:sqlite';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import site from '../src/data/site.json' with { type: 'json' };
import { placeServices } from './pull-uploads.mjs';
import { buildProblems } from './lib/service-pages.mjs';
import { samplePage, sampleCatalog } from './lib/service-sample.mjs';

const out = mkdtempSync(join(tmpdir(), 'uploadservice-test-'));
await build({
  entryPoints: { service: 'functions/api/uploadservice/[action].ts', upload: 'functions/api/upload/[action].ts' },
  bundle: true, format: 'esm', platform: 'browser', conditions: ['workerd', 'worker', 'browser'], outdir: out, outExtension: { '.js': '.mjs' }, logLevel: 'error',
});
const { onRequest: service } = await import(pathToFileURL(join(out, 'service.mjs')).href);
const { onRequest: upload } = await import(pathToFileURL(join(out, 'upload.mjs')).href);

const sqlite = new DatabaseSync(':memory:');
const db = {
  prepare: (sql) => ({
    bind: (...v) => ({
      first: async () => sqlite.prepare(sql).get(...v) ?? null,
      run: async () => sqlite.prepare(sql).run(...v),
      all: async () => ({ results: sqlite.prepare(sql).all(...v) }),
    }),
  }),
};

let passed = 0;
const ok = (cond, name) => {
  if (!cond) throw new Error(`FAILED: ${name}`);
  passed++;
  console.log(`  ok  ${name}`);
};

// ---- The mock Anthropic API: answers queued pages as a streamed message, records each request ----
const KEY = 'sk-ant-test-not-a-real-key';
const HOOK = 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/test';
const requests = [];
const answers = [];
let hooks = 0;
const sse = (events) => new Response(events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } });
globalThis.fetch = async (url, init = {}) => {
  const u = String(url?.url ?? url);
  if (u === HOOK) {
    hooks++;
    return new Response('{}');
  }
  if (u.startsWith('https://api.anthropic.com/v1/messages')) {
    const headers = new Headers(init.headers);
    requests.push({ url: u, body: JSON.parse(init.body), beta: headers.get('anthropic-beta') ?? '', key: (headers.get('authorization') ?? headers.get('x-api-key') ?? '').replace(/^Bearer /, '') });
    const { page, stop = 'end_turn' } = answers.shift() ?? { page: samplePage() };
    const text = JSON.stringify(page);
    return sse([
      ['message_start', { type: 'message_start', message: { id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } }],
      ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: text.slice(0, 50) } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: text.slice(50) } }],
      ['content_block_stop', { type: 'content_block_stop', index: 0 }],
      ['message_delta', { type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 99 } }],
      ['message_stop', { type: 'message_stop' }],
    ]);
  }
  throw new Error(`Unexpected fetch ${u}`);
};

// ---- What the built site would serve: the site facts for the chat and the built blog posts ----
const catalog = sampleCatalog();
const builtPost = (p) => ({ slug: p.slug, category: p.category, headline: p.title, summary: `${p.description} More about this topic for Markham readers.`, title: p.title, description: p.description, quickAnswer: p.excerpt, faq: [], sources: [], markdown: 'x', author: '', authorTitle: '', related: [], relatedServices: [], draft: false, published: 1, updated: 1 });
const assets = async (url) => {
  const path = new URL(String(url?.url ?? url)).pathname;
  if (path === '/uploadservice/site.json') return Response.json({ taken: catalog.taken, services: catalog.services, guides: catalog.guides });
  if (path === '/blog/built-posts.json') return Response.json({ posts: catalog.posts.map(builtPost) });
  return new Response('not found', { status: 404 });
};

const ORIGIN = site.url;
const PASSWORD = 'shared test pass 42';
const env = { VOW_DB: db, UPLOAD_PASSWORD: PASSWORD, ANTHROPIC_API_KEY: KEY, ASSETS: { fetch: assets } };
const call = async (fn, base, action, body, { cookie, origin = ORIGIN, type = 'application/json', with: e = env, raw } = {}) => {
  const headers = { 'content-type': type, origin, 'cf-connecting-ip': '203.0.113.9', ...(cookie ? { cookie } : {}) };
  const init = body === undefined ? { headers } : { method: 'POST', headers, body: raw ?? JSON.stringify(body) };
  const waits = [];
  const res = await fn({ request: new Request(`${ORIGIN}/api/${base}/${action}`, init), env: e, params: { action }, waitUntil: (p) => waits.push(p) });
  const text = await res.text();
  await Promise.all(waits);
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, text, body: json, lines: text.split('\n').filter(Boolean).map((l) => JSON.parse(l)) };
};
const sv = (action, body, opts) => call(service, 'uploadservice', action, body, opts);

console.log('Sign in and security');
ok((await sv('list')).status === 401 && (await sv('chat', { messages: ['x'] })).status === 401 && (await sv('publish', { page: samplePage() })).status === 401, 'everything but export needs a session');
const login = await call(upload, 'upload', 'login', { password: PASSWORD });
const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];
ok(/^__Host-kc_upload=[0-9a-f]{64}$/.test(cookie), 'the blog sign in starts the session');
const me = await sv('me', undefined, { cookie });
ok(me.body.signedIn === true && me.body.aiReady === true && me.body.hookReady === false, 'the same cookie signs in to service pages');
ok((await sv('save', { page: samplePage() }, { cookie, origin: 'https://evil.example' })).status === 403, 'a request from another site is refused');
ok((await sv('save', { page: samplePage() }, { cookie, type: 'text/plain' })).status === 403, 'a request that is not JSON is refused');
const listed = await sv('list', undefined, { cookie });
ok(listed.headers.get('x-content-type-options') === 'nosniff' && listed.headers.get('cache-control') === 'no-store', 'answers are nosniff and no-store');
ok((await sv('export')).status === 200, 'export is public');

console.log('Without an API key');
const noKey = { ...env, ANTHROPIC_API_KEY: undefined };
ok((await sv('me', undefined, { cookie, with: noKey })).body.aiReady === false, 'the page is told the AI is off');
const off = await sv('chat', { messages: ['A page about power of attorney sales'] }, { cookie, with: noKey });
ok(off.status === 503 && /ANTHROPIC_API_KEY/.test(off.body.error) && requests.length === 0, 'chat says so plainly and calls nothing');
ok((await sv('list', undefined, { cookie, with: noKey })).status === 200 && (await sv('preview', { page: samplePage() }, { cookie, with: noKey })).status === 200, 'everything else still works');

console.log('Size limits');
ok((await sv('chat', { messages: ['x'.repeat(4001)] }, { cookie })).status === 413, 'one message over 4,000 characters is refused');
ok((await sv('chat', { messages: ['x'.repeat(3000), 'y'.repeat(3000), 'z'.repeat(3000)] }, { cookie })).status === 413, 'messages over 8,000 characters in all are refused');
ok((await sv('chat', { messages: ['ok'], draft: { ...samplePage(), body: 'w '.repeat(31_000) } }, { cookie })).status === 413, 'a draft over 60 KB is refused');
ok((await sv('chat', { messages: ['x'] }, { cookie, raw: 'x'.repeat(200_000) })).status === 413, 'a huge request is refused before it is read');
ok(requests.length === 0 && sqlite.prepare('SELECT COUNT(*) AS n FROM service_calls').get().n === 0, 'and none of them reached the AI or counted');

console.log('Chat');
answers.push({ page: { ...samplePage(), summary: 'We are the best team for a power of attorney sale.' } }, { page: samplePage() });
const chat = await sv('chat', { messages: ['A page about selling under power of attorney'] }, { cookie });
const statuses = chat.lines.filter((l) => l.status).map((l) => l.status);
const done = chat.lines.find((l) => l.done);
ok(chat.headers.get('content-type').startsWith('application/x-ndjson') && statuses[0] === 'Reading your blog posts...' && statuses.includes('Writing the page...') && statuses.includes('Checking the page...'), 'plain status lines stream first');
ok(done && done.page.slug === 'power-of-attorney-home-sale' && done.problems.length === 0 && requests.length === 2, 'one repair round fixed the page');
const first = requests[0];
ok(first.body.model === 'claude-sonnet-5-5' && first.key === KEY && first.beta.includes('server-side-fallback-2026-07-01') && first.body.fallbacks === 'default', 'default model, server side fallbacks');
ok(!('tool_choice' in first.body) && !('temperature' in first.body) && !('top_p' in first.body) && !('top_k' in first.body) && !('thinking' in first.body) && first.body.stream === true, 'no forced tool, no sampling settings, thinking left adaptive, streamed');
ok(first.body.output_config.effort === 'medium' && first.body.output_config.format.type === 'json_schema' && first.body.system[1].cache_control.type === 'ephemeral' && first.body.system[1].text.includes('/blog/power-of-attorney-sell-house-ontario/'), 'medium effort, structured output, the catalog in the cached prefix');
ok(first.body.messages.length === 1 && first.body.messages[0].role === 'user' && first.body.messages[0].content.includes('There is no draft yet'), 'each message is one fresh request');
ok(requests[1].body.messages.length === 1 && /"best"/.test(requests[1].body.messages[0].content) && !requests[1].body.messages[0].content.includes('instructions so far'), 'the repair sends only the problems and the draft');
ok(!chat.text.includes(KEY) && !chat.text.includes('You write service pages'), 'neither the key nor the prompt comes back');
answers.push({ page: { ...samplePage(), name: 'Power of attorney home sales' } });
const again = await sv('chat', { messages: ['A page about selling under power of attorney', 'Change the name'], draft: done.page }, { cookie, with: { ...env, SERVICE_AI_MODEL: 'claude-opus-5-5' } });
ok(requests[2].body.model === 'claude-opus-5-5' && requests[2].body.messages[0].content.includes('"slug":"power-of-attorney-home-sale"') && requests[2].body.messages[0].content.includes('2. Change the name'), 'SERVICE_AI_MODEL wins and the draft and instructions go in as text');
ok(again.lines.find((l) => l.done)?.page.name === 'Power of attorney home sales', 'the change comes back');
answers.push({ page: { ...samplePage(), slug: 'a-new-address-from-the-model' } });
const moved = await sv('chat', { messages: ['Shorter intro'], draft: done.page }, { cookie });
ok(moved.lines.find((l) => l.done)?.page.slug === done.page.slug, 'a changed draft keeps its address, so an edit never makes a second page');
answers.push({ page: {}, stop: 'refusal' });
const refused = await sv('chat', { messages: ['x'] }, { cookie });
ok(/would not write/.test(refused.lines.find((l) => l.error)?.error ?? ''), 'a refusal is a plain message');
answers.push({ page: {}, stop: 'max_tokens' });
ok(/too long/.test((await sv('chat', { messages: ['x'] }, { cookie })).lines.find((l) => l.error)?.error ?? ''), 'a cut off answer is a plain message');

console.log('Rate limit');
const calls = sqlite.prepare('SELECT COUNT(*) AS n FROM service_calls').get().n;
ok(calls === 5, 'each chat counts once, repair round included');
for (let i = calls; i < 20; i++) sqlite.prepare('INSERT INTO service_calls (at) VALUES (?)').run(Date.now());
const before = requests.length;
ok((await sv('chat', { messages: ['one more'] }, { cookie })).status === 429 && requests.length === before, 'the 21st chat in an hour is refused before the AI is called');
sqlite.prepare('UPDATE service_calls SET at = ?').run(Date.now() - 2 * 36e5);

console.log('Checks');
const problems = async (page) => (await sv('preview', { page }, { cookie })).body;
const page = samplePage();
let p = await problems({ ...page, problem: `${page.problem} About 47% of owners sell within a year.` });
ok(p.problems.some((e) => /47%/.test(e)), 'an invented figure blocks publishing');
p = await problems({ ...page, problem: `${page.problem} The tax is 1.5% of the value above $50,000.` });
ok(!p.problems.some((e) => /figures/.test(e)), 'a figure from a linked post is allowed');
ok((await problems({ ...page, summary: 'The number one team for a power of attorney home sale.' })).problems.some((e) => /number one/.test(e)), 'a banned phrase blocks publishing');
ok((await problems({ ...page, body: `${page.body}\n\nIt is not just a sale.` })).problems.some((e) => /not just/.test(e)), 'a contrast phrase the build would refuse is caught');
p = await problems({ ...page, body: `${page.body}\n\nAlso see [our old page](/old-page/).` });
ok(!p.page.body.includes('/old-page/') && p.warnings.some((w) => /old-page/.test(w)) && p.problems.length === 0, 'an unknown link is dropped with a warning');
ok((await problems({ ...page, slug: 'downsizing-markham' })).problems.some((e) => /already used/.test(e)), 'an address the site already uses is refused');
ok((await problems({ ...page, slug: 'estate-sales' })).problems.some((e) => /already used/.test(e)), 'so is a built in service');
sqlite.prepare('INSERT INTO service_uploads (slug, live, page, updated) VALUES (?, 1, ?, 1)').run('other-live-page', JSON.stringify({ ...page, slug: 'other-live-page' }));
ok((await problems(page)).problems.some((e) => /search title is the same/.test(e)), 'a title another live service page uses is refused');
sqlite.prepare('DELETE FROM service_uploads').run();
ok((await problems({ ...page, faq: [...page.faq.slice(0, 3), { q: 'Is it safe?', a: 'Yes <img src=x onerror=alert(1)>.' }] })).problems.some((e) => /Raw HTML/.test(e)), 'raw HTML is refused');
ok((await problems({ ...page, body: `${page.body}\n\nNothing {runs} here.` })).problems.some((e) => /curly/.test(e)), 'MDX code is refused');
// The faults are written with escapes and a joined comma so this file itself keeps the house style.
const C = ',';
p = await problems({ ...page, problem: `Selling a parent's home in your neighbo${'r'}hood is slow \u2014 and hard. We help${C} and we explain.` });
ok(p.page.problem === 'Selling a parent\'s home in your neighbourhood is slow and hard. We help and we explain.' && p.warnings.some((w) => /Fixed automatically/.test(w)), 'long dashes, commas and spellings are fixed');
p = await problems(page);
ok(p.problems.length === 0 && !p.html.includes('<script') && p.html.includes('<h1>Selling a home under <span class="accent">power of attorney</span> in Markham</h1>'), 'the sample page passes and previews safely');
const evil = await problems({ ...page, name: '<script>alert(1)</script>' });
ok(!evil.html.includes('<script>alert') && evil.html.includes('&lt;script&gt;'), 'every field is escaped in the preview');

console.log('Save, publish, list, unpublish, export');
const row = (slug) => sqlite.prepare('SELECT live, page FROM service_uploads WHERE slug = ?').get(slug);
ok((await sv('publish', { page: { ...page, summary: 'The best service page.' } }, { cookie })).status === 422 && row(page.slug) === undefined, 'a page with problems cannot be published');
let saved = await sv('save', { page }, { cookie });
ok(saved.status === 200 && row(page.slug).live === 0 && /not on the website/.test(saved.body.message) && hooks === 0, 'save keeps a draft and does not rebuild');
ok((await sv('publish', { page }, { cookie })).body.error === 'exists', 'publishing over a saved page asks first');
let pub = await sv('publish', { page, replace: true }, { cookie });
ok(pub.status === 200 && row(page.slug).live === 1 && /every morning/.test(pub.body.message) && hooks === 0, 'published, live with the next morning build when there is no hook');
pub = await sv('publish', { page, replace: true }, { cookie, with: { ...env, DEPLOY_HOOK_URL: HOOK } });
ok(/about 4 minutes/.test(pub.body.message) && hooks === 1, 'with a deploy hook the site rebuilds now');
const list = (await sv('list', undefined, { cookie })).body.pages;
ok(list.length === 1 && list[0].live && list[0].url.endsWith('/services/power-of-attorney-home-sale/'), 'the list shows the live page');
ok((await sv('get', { slug: page.slug }, { cookie })).body.page.h1 === page.h1, 'a page opens for editing');
let exported = (await sv('export')).body;
ok(exported.pages.length === 1 && exported.pages[0].slug === page.slug && typeof exported.pages[0].updated === 'number' && exported.down.length === 0, 'export has the live page');
await sv('save', { page: { ...page, slug: 'a-private-draft' } }, { cookie });
ok((await sv('export')).body.pages.length === 1, 'a draft is never exported as live');
ok((await sv('unpublish', { slug: page.slug }, { cookie })).status === 200 && row(page.slug).live === 0, 'unpublish keeps it as a draft');
exported = (await sv('export')).body;
ok(exported.pages.length === 0 && exported.down.includes(page.slug), 'export names it as taken down');
ok((await sv('remove', { slug: 'a-private-draft' }, { cookie })).status === 200 && !(await sv('list', undefined, { cookie })).body.pages.some((x) => x.slug === 'a-private-draft'), 'remove takes it out of the list');
ok((await sv('get', { slug: 'a-private-draft' }, { cookie })).status === 404, 'and it no longer opens');
ok((await call(upload, 'upload', 'logout', {}, { cookie })).status === 200 && (await sv('list', undefined, { cookie })).status === 401, 'signing out of the blog page signs out here too');

console.log('Build placement');
const root = mkdtempSync(join(tmpdir(), 'pull-services-'));
for (const dir of ['src/content/services', 'src/content/guides', 'src/content/neighbourhoods', 'src/content/blog/quick', 'src/lib', 'public', 'src/pages', 'functions']) mkdirSync(join(root, dir), { recursive: true });
cpSync('src/lib/guides.ts', join(root, 'src/lib/guides.ts'));
cpSync('public/_redirects', join(root, 'public/_redirects'));
cpSync('src/content/services/downsizing.mdx', join(root, 'src/content/services/downsizing.mdx'));
writeFileSync(join(root, 'src/content/services/hand-made.mdx'), '---\nname: "Hand made"\n---\n');
writeFileSync(join(root, 'src/content/services/old-generated.mdx'), '---\nname: "Old"\nuploadVersion: "1"\n---\n');
writeFileSync(join(root, 'src/content/blog/a-post.mdx'), '---\ntitle: "Same Title As A Blog Post In Markham Here"\n---\n');
const good = samplePage();
const placed = placeServices({
  pages: [
    { ...good, updated: 2 },
    { ...good, slug: 'too-short-description', description: 'Short.', updated: 3 },
    { ...good, slug: 'hand-made', updated: 4 },
    { ...good, slug: 'contrast-phrase', title: 'Contrast Phrase Page About Markham Selling', body: `${good.body}\n\nIt is not just a sale.`, updated: 5 },
    { ...good, slug: 'same-title', title: 'Same Title As A Blog Post In Markham Here', updated: 6 },
    { ...good, slug: 'downsizing', updated: 7 },
    { ...good, slug: 'needs-tidy', title: 'Tidy Page About Markham Homes For Sellers', description: `How a power of attorney home sale works in Markham \u2014 who signs, what the lawyer checks and how we price a house in your neighbo${'r'}hood for sale today.`, updated: 8 },
  ],
  down: ['old-generated', 'hand-made', 'downsizing', '../escape'],
}, root);
const has = (f) => existsSync(join(root, 'src/content/services', f));
ok(has('power-of-attorney-home-sale.mdx') && has('needs-tidy.mdx') && placed.added === 2, 'valid pages are written');
ok(!has('too-short-description.mdx') && !has('contrast-phrase.mdx') && !has('same-title.mdx') && placed.skipped.length === 5, 'invalid, style failing and duplicate pages are skipped');
ok(readFileSync(join(root, 'src/content/services/hand-made.mdx'), 'utf8') === '---\nname: "Hand made"\n---\n' && readFileSync(join(root, 'src/content/services/downsizing.mdx'), 'utf8') === readFileSync('src/content/services/downsizing.mdx', 'utf8'), 'files this script did not write are never changed or removed');
ok(!has('old-generated.mdx') && placed.removed === 1, 'a taken down page removes only our own file');
const written = readFileSync(join(root, 'src/content/services/power-of-attorney-home-sale.mdx'), 'utf8');
const front = parse(written.match(/^---\n([\s\S]*?)\n---/)[1]);
ok(front.order === 100 && front.uploadVersion === '2' && front.keywords.length === 4 && front.steps.length === 4 && /^title: "Power of Attorney Home Sale in Markham: How It Works"$/m.test(written), 'flat frontmatter with JSON values that YAML reads, ordered after the built in services');
const tidied = readFileSync(join(root, 'src/content/services/needs-tidy.mdx'), 'utf8');
ok(!/\u2014/.test(tidied) && /neighbourhood/.test(tidied) && /order: 101/.test(tidied), 'the mechanical fixes run before writing');
ok(buildProblems(good, new Set(['power-of-attorney-home-sale'])).includes('address already used by another page'), 'the build refuses a taken address');

console.log(`\nService page test passed: ${passed} checks.`);
