/**
 * Local security test for the blog upload API. Bundles the real Pages Function with esbuild and
 * runs it against node:sqlite standing in for D1, with onecutcontent.com mocked. Nothing leaves
 * this machine.
 *
 *   node scripts/test-upload.mjs
 *
 * Fails loudly on the first broken rule. Run it after any change to src/lib/uploads.ts,
 * functions/api/upload/[action].ts, functions/blog/[[path]].ts or scripts/pull-uploads.mjs.
 */
import { build } from 'esbuild';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import site from '../src/data/site.json' with { type: 'json' };
import { place } from './pull-uploads.mjs';

const out = mkdtempSync(join(tmpdir(), 'upload-test-'));
await build({
  entryPoints: { upload: 'functions/api/upload/[action].ts', blog: 'functions/blog/[[path]].ts' },
  bundle: true, format: 'esm', platform: 'neutral', mainFields: ['module', 'main'], outdir: out, outExtension: { '.js': '.mjs' }, logLevel: 'error',
});
const { onRequest: upload } = await import(pathToFileURL(join(out, 'upload.mjs')).href);
const { onRequest: blog } = await import(pathToFileURL(join(out, 'blog.mjs')).href);

/** D1's prepare/bind/first/run/all over node:sqlite. */
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

// OneCut says Pro for the good key and "unknown key" for any other.
const GOOD_KEY = 'oc_live_test_key_0123456789';
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u === 'https://onecutcontent.com/api/v1/account') {
    return init.headers?.authorization === `Bearer ${GOOD_KEY}` ? Response.json({ pro: true }) : new Response('{}', { status: 401 });
  }
  throw new Error(`Unexpected fetch ${u}`);
};

let passed = 0;
const ok = (cond, name) => {
  if (!cond) throw new Error(`FAILED: ${name}`);
  passed++;
  console.log(`  ok  ${name}`);
};

const ORIGIN = site.url;
const PASSWORD = 'shared test pass 42';
// Posts built from the website's own files, as /blog/built-posts.json lists them. Also the empty post page.
const body = `## One\n\n${'home '.repeat(120)}`;
const builtPost = (slug, day, more = {}) => ({
  slug, category: 'neighbourhoods', headline: `A built post about ${slug} in Markham`, summary: 'What buyers ask about homes near Unionville GO station and Main Street in Markham.',
  quickAnswer: '', faq: [], sources: [], markdown: body, author: '', authorTitle: '', related: [], relatedServices: [], draft: false,
  published: Date.UTC(2026, 0, day), updated: Date.UTC(2026, 0, day), ...more,
});
const SEO_TITLE = 'Unionville GO homes: what buyers ask first';
const SEO_DESC = `What buyers ask about homes near Unionville GO station in Markham ${'and more '.repeat(9)}`.trim();
const BUILT = [
  builtPost('built-full', 5, { title: SEO_TITLE, description: SEO_DESC, guide: 'downsizing-markham' }),
  builtPost('built-two', 9),
  builtPost('built-locked', 2, { locked: 'This post uses special page code.' }),
];
const SHELL_PAGE = '<title>KCUPLOAD-TITLE</title><meta name="description" content="KCUPLOAD-DESC"><article><h1>KCUPLOAD-HONE</h1>KCUPLOAD-BODY</article>';
let builtReadable = true;
const assets = async (url) => {
  const path = new URL(String(url?.url ?? url)).pathname;
  if (path === '/blog/built-posts.json') return builtReadable ? Response.json({ posts: BUILT }) : new Response('broken', { status: 500 });
  if (path.startsWith('/blog/upload-shell/')) return new Response(SHELL_PAGE, { headers: { 'content-type': 'text/html' } });
  return new Response('not found', { status: 404 });
};
const env = { VOW_DB: db, UPLOAD_PASSWORD: PASSWORD, ONECUT_API_KEY: GOOD_KEY, ASSETS: { fetch: assets } };
const up = async (action, body, { cookie, origin = ORIGIN, ip = '203.0.113.70', type = 'application/json', with: e = env } = {}) => {
  const headers = { 'content-type': type, origin, 'cf-connecting-ip': ip, ...(cookie ? { cookie } : {}) };
  const init = body === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) };
  const res = await upload({ request: new Request(`${ORIGIN}/api/upload/${action}`, init), env: e, params: { action }, waitUntil: () => {} });
  return { status: res.status, cookie: res.headers.get('set-cookie'), body: await res.json().catch(() => ({})) };
};

console.log('Blog upload sign in');
ok((await up('list')).status === 401 && (await up('unpublish', { slug: 'x' })).status === 401, 'uploads need a session');
ok((await up('login', { password: PASSWORD }, { origin: 'https://evil.example' })).status === 403, 'a sign in from another site is refused');
ok((await up('login', { password: PASSWORD }, { type: 'text/plain' })).status === 403, 'a sign in that is not JSON is refused');
ok((await up('login', { password: 'not the password' })).status === 401, 'a wrong password is refused');
const signIn = (await up('login', { password: PASSWORD })).cookie ?? '';
ok(/^__Host-kc_upload=[0-9a-f]{64}; Path=\/; HttpOnly; Secure; SameSite=Strict/.test(signIn), 'the shared password starts a __Host- HttpOnly Secure session');
const cookie = signIn.split(';')[0];
ok((await up('list', undefined, { cookie })).status === 200, 'a signed in session can list uploads');
for (let i = 0; i < 10; i++) await up('login', { password: `guess ${i}` }, { ip: '192.0.2.77' });
ok((await up('login', { password: PASSWORD }, { ip: '192.0.2.77' })).status === 429, 'ten wrong passwords lock that address for an hour');
const short = { ...env, UPLOAD_PASSWORD: 'short' };
ok((await up('me', undefined, { with: short })).body.ready === false && (await up('login', { password: 'short' }, { with: short })).status === 503, 'a password under 12 characters is never accepted');

console.log('OneCut Content');
if (site.requireOneCutPro) {
  const noKey = { ...env, ONECUT_API_KEY: undefined };
  ok((await up('me', undefined, { cookie, with: noKey })).body.needsPro === true && (await up('list', undefined, { cookie, with: noKey })).status === 403, 'without a OneCut Pro account everything past sign in is closed');
  ok((await up('connect', { key: 'oc_live_wrong_key_0123456789' }, { cookie, with: noKey })).status === 400, 'a key OneCut does not know is refused');
}
const post = {
  headline: 'Living near Unionville GO in Markham',
  summary: 'What buyers ask about homes near Unionville GO station and Main Street in Markham.',
  slug: 'living-near-unionville-go',
  category: 'neighbourhoods',
  markdown: `## One\n\n${'home '.repeat(120)}<script>x</script> [bad](javascript:alert(1))`,
};
if (site.oneCutOnly) {
  ok((await up('publish', { post }, { cookie })).status === 403, 'a new post that OneCut did not write is not saved');
  ok((await up('publish', { post, ticket: 'f'.repeat(64) }, { cookie })).status === 403, 'a made up ticket is refused');
}
ok(sqlite.prepare('SELECT COUNT(*) AS n FROM uploads').get().n === 0, 'nothing was saved along the way');

console.log('Posts already on the website');
const row = (slug) => sqlite.prepare('SELECT live, post FROM uploads WHERE slug = ?').get(slug);
let list = (await up('list', undefined, { cookie })).body.posts;
ok(list.map((p) => p.slug).join() === 'built-two,built-full,built-locked' && list.every((p) => p.source === 'website' && p.live), 'the list has every built post, newest first, marked as on the website');
ok(list[2].locked && !list[0].locked, 'a post that cannot be edited says why');
builtReadable = false;
ok((await up('list', undefined, { cookie })).status === 200 && (await up('list', undefined, { cookie })).body.posts.length === 0, 'the list still answers when the built posts cannot be read');
builtReadable = true;
const got = await up('get', { slug: 'built-full' }, { cookie });
ok(got.status === 200 && got.body.source === 'website' && got.body.post.title === SEO_TITLE && got.body.post.guide === 'downsizing-markham', 'a built post opens for editing with its own search title and guide');
ok((await up('get', { slug: 'no-such-post' }, { cookie })).status === 404 && (await up('get', { slug: 'built-locked' }, { cookie })).status === 409, 'an unknown post is not found and a locked one does not open');
ok((await up('publish', { post: { ...BUILT[2], headline: 'A locked post someone tries to change' }, replace: true }, { cookie })).status === 409, 'a locked post cannot be saved over');

const edited = { ...got.body.post, headline: 'A built post, now edited on the upload page' };
ok(/Google title/.test((await up('preview', { post: { ...edited, title: 'Too short' } }, { cookie })).body.error) && /Google description/.test((await up('publish', { post: { ...edited, description: 'Too short' }, replace: true }, { cookie })).body.error), 'a search title or description of the wrong length is refused');
const shown = (await up('preview', { post: edited }, { cookie })).body.html ?? '';
ok(shown.includes(`<title>${SEO_TITLE}</title>`) && shown.includes(`content="${SEO_DESC}"`) && shown.includes('<h1>A built post, now edited on the upload page</h1>'), 'the preview uses the search title and description');
ok((await up('publish', { post: edited }, { cookie })).body.error === 'exists', 'saving over a built post asks first');
ok(row('built-full') === undefined, 'and nothing is saved until the answer is yes');
ok((await up('publish', { post: edited, replace: true }, { cookie })).status === 200, 'saving a built post needs no OneCut ticket');
const saved = JSON.parse(row('built-full').post);
ok(row('built-full').live === 1 && saved.published === BUILT[0].published && saved.fromWebsite === true && saved.title === SEO_TITLE && saved.guide === 'downsizing-markham', 'it is stored as an edit: same date, search title and guide');
list = (await up('list', undefined, { cookie })).body.posts;
ok(list.filter((p) => p.slug === 'built-full').length === 1 && list[0].slug === 'built-full' && list[0].source === 'upload', 'the saved post is listed once, as uploaded here');
if (site.oneCutOnly) ok((await up('publish', { post: { ...post, slug: 'brand-new-post' }, replace: true }, { cookie })).status === 403 && row('brand-new-post') === undefined, 'a brand new address still needs a OneCut ticket');

ok((await up('unpublish', { slug: 'built-two' }, { cookie })).status === 200 && row('built-two').live === -1, 'a built post can be removed');
ok(!(await up('list', undefined, { cookie })).body.posts.some((p) => p.slug === 'built-two'), 'a removed built post leaves the list');
if (site.oneCutOnly) ok((await up('publish', { post: BUILT[1], replace: true }, { cookie })).status === 403, 'a removed post does not come back without a ticket');
// A new draft that was never on the website, saved with a real ticket.
const ticket = 'a'.repeat(64);
sqlite.prepare('INSERT INTO upload_tickets (hash, expires) VALUES (?, ?)').run(createHash('sha256').update(ticket).digest('hex'), Date.now() + 60_000);
ok((await up('publish', { post: { ...post, draft: true }, ticket }, { cookie })).status === 200 && row(post.slug).live === 0, 'a ticket saves a new draft');
let exported = (await up('export')).body;
ok(exported.posts.length === 1 && exported.posts[0].slug === 'built-full' && exported.posts[0].title === SEO_TITLE, 'export has the live saved post with its search title');
ok(exported.down.join() === 'built-two', 'export names the built post that was taken down, not a private draft');
ok((await up('publish', { post: { ...edited, draft: true }, replace: true }, { cookie })).status === 200, 'a built post can be put back to a draft');
exported = (await up('export')).body;
ok(exported.posts.length === 0 && exported.down.sort().join() === 'built-full,built-two', 'a built post held as a draft is taken down at the next build too');
ok((await up('publish', { post: edited, replace: true }, { cookie })).status === 200, 'and published again without a ticket');

console.log('Blog pages');
const view = async (slug) => {
  const res = await blog({ request: new Request(`${ORIGIN}/blog/${slug}/`), env, next: async () => new Response(`<article>the built page of ${slug}</article>`, { headers: { 'content-type': 'text/html' } }) });
  return { status: res.status, html: await res.text() };
};
ok((await view('built-full')).html.includes('<h1>A built post, now edited on the upload page</h1>'), 'a saved built post shows its saved version at once');
ok((await view('built-two')).status === 404, 'a removed built post answers not found');
ok((await view('built-locked')).html.includes('the built page of built-locked'), 'every other post stays the built page');

console.log('Build');
const root = mkdtempSync(join(tmpdir(), 'pull-test-'));
mkdirSync(join(root, 'quick'));
for (const f of ['built-full.mdx', 'built-two.mdx', 'untouched.mdx', 'quick/quick-moved.mdx', 'quick/quick-down.mdx', 'quick/quick-kept.mdx']) writeFileSync(join(root, f), 'repo copy');
const placed = place({ posts: [saved, { ...saved, slug: 'quick-moved' }, { ...saved, slug: 'only-uploaded' }, { ...saved, slug: '../escape' }], down: ['built-two', 'quick-down', 'quick-moved', '../untouched', 7] }, root);
const has = (f) => existsSync(join(root, f));
ok(has('quick/built-full.md') && !has('built-full.mdx') && has('quick/quick-moved.md') && !has('quick/quick-moved.mdx') && has('quick/only-uploaded.md'), 'the uploaded version replaces the website file in the build');
ok(!has('built-two.mdx') && !has('quick/quick-down.mdx') && !has('quick/built-two.md'), 'a taken down post is left out of the build');
ok(has('untouched.mdx') && has('quick/quick-kept.mdx') && placed.added === 3 && placed.dropped === 4, 'every other file is left alone');
const written = readFileSync(join(root, 'quick/built-full.md'), 'utf8');
ok(written.includes(`title: ${JSON.stringify(SEO_TITLE)}`) && written.includes(`description: ${JSON.stringify(SEO_DESC)}`) && written.includes('guide: "downsizing-markham"') && written.includes(`published: "${new Date(BUILT[0].published).toISOString()}"`), 'the build file keeps the search title, description, guide and date');

ok((await up('logout', {}, { cookie })).status === 200 && (await up('list', undefined, { cookie })).status === 401, 'signing out ends the session');

console.log(`\nUpload security test passed: ${passed} checks.`);
