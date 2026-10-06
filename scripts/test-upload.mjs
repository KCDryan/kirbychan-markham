/**
 * Local security test for the blog upload API. Bundles the real Pages Function with esbuild and
 * runs it against node:sqlite standing in for D1, with onecutcontent.com mocked. Nothing leaves
 * this machine.
 *
 *   node scripts/test-upload.mjs
 *
 * Fails loudly on the first broken rule. Run it after any change to src/lib/uploads.ts or
 * functions/api/upload/[action].ts.
 */
import { build } from 'esbuild';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import site from '../src/data/site.json' with { type: 'json' };

const out = mkdtempSync(join(tmpdir(), 'upload-test-'));
await build({
  entryPoints: { upload: 'functions/api/upload/[action].ts' },
  bundle: true, format: 'esm', platform: 'neutral', mainFields: ['module', 'main'], outdir: out, outExtension: { '.js': '.mjs' }, logLevel: 'error',
});
const { onRequest: upload } = await import(pathToFileURL(join(out, 'upload.mjs')).href);

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
const env = { VOW_DB: db, UPLOAD_PASSWORD: PASSWORD, ONECUT_API_KEY: GOOD_KEY, ASSETS: { fetch: async () => new Response('', { status: 404 }) } };
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
ok((await up('logout', {}, { cookie })).status === 200 && (await up('list', undefined, { cookie })).status === 401, 'signing out ends the session');
ok(sqlite.prepare('SELECT COUNT(*) AS n FROM uploads').get().n === 0, 'nothing was saved along the way');

console.log(`\nUpload security test passed: ${passed} checks.`);
