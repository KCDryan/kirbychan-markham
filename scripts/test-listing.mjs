/**
 * Local test for the listing pages, the listings sitemap and the contact form lead. Bundles the real
 * Pages Functions with esbuild and runs them against node:sqlite standing in for D1, with Resend,
 * Turnstile and PropTx mocked. Nothing leaves this machine.
 *
 *   node scripts/test-listing.mjs
 *
 * Fails loudly on the first broken rule. Run it after any change to functions/listing/[key].ts,
 * functions/sitemap-listings.xml.ts, functions/api/lead.ts, src/lib/listing-page.ts or the listing
 * queries in src/lib/proptx.ts.
 */
import { build } from 'esbuild';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import site from '../src/data/site.json' with { type: 'json' };

const out = mkdtempSync(join(tmpdir(), 'listing-test-'));
await build({
  entryPoints: { listing: 'functions/listing/[key].ts', sitemap: 'functions/sitemap-listings.xml.ts', lead: 'functions/api/lead.ts', vow: 'src/lib/vow.ts' },
  bundle: true, format: 'esm', platform: 'neutral', mainFields: ['module', 'main'], outdir: out, outExtension: { '.js': '.mjs' }, logLevel: 'error',
});
const load = (name) => import(pathToFileURL(join(out, `${name}.mjs`)).href);
const listingModule = await load('listing');
const { onRequestGet: listingsSitemap, onRequestHead: sitemapHead } = await load('sitemap');
const { onRequestPost: lead } = await load('lead');
const vow = await load('vow');

/** D1's prepare/bind/first/run/all over node:sqlite. Every statement is counted. */
const sqlite = new DatabaseSync(':memory:');
let statements = [];
const db = {
  prepare: (sql) => ({
    bind: (...v) => ({
      first: async () => (statements.push(sql), sqlite.prepare(sql).get(...v) ?? null),
      run: async () => (statements.push(sql), sqlite.prepare(sql).run(...v)),
      all: async () => (statements.push(sql), { results: sqlite.prepare(sql).all(...v) }),
    }),
  }),
  batch: async (list) => Promise.all(list.map((s) => s.run())),
};

const emails = [];
/** Answers PropTx. Throwing stands in for a feed that is down. */
let feed = () => [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://api.resend.com/')) {
    emails.push(JSON.parse(init.body));
    return Response.json({ id: 'x' });
  }
  if (u.startsWith('https://challenges.cloudflare.com/')) return Response.json({ success: init.body.get('response') === 'human' });
  if (u.startsWith('https://query.ampre.ca/')) return Response.json({ value: feed(decodeURIComponent(u), init) });
  throw new Error(`Unexpected fetch ${u}`);
};
const edge = new Map();
globalThis.caches = { default: { match: async (req) => edge.get(req.url)?.clone(), put: async (req, res) => void edge.set(req.url, res) } };

let passed = 0;
const ok = (cond, name) => {
  if (!cond) throw new Error(`FAILED: ${name}`);
  passed++;
  console.log(`  ok  ${name}`);
};

const ORIGIN = site.url;
const SECRET = Buffer.alloc(32, 7).toString('base64');
const env = { VOW_DB: db, VOW_SECRET: SECRET, PROPTX_VOW_TOKEN: 'vow', RESEND_API_KEY: 're_test', VOW_EMAIL_FROM: 'Sold Prices <sold@example.com>', TURNSTILE_SECRET_KEY: 'ts' };

// A verified account with a session, made with the site's own functions.
await vow.ensureSchema(db);
const k = await vow.keys(SECRET);
const now = Date.now();
sqlite
  .prepare('INSERT INTO accounts (email_hash, email_enc, name_enc, pass_hash, pass_salt, pass_set_at, verified_at, terms_version, terms_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  .run(await vow.blind(k, 'alice@example.com'), await vow.seal(k, 'alice@example.com'), await vow.seal(k, 'Alice Wong'), 'x', 'x', now, now, vow.TERMS_VERSION, now, now);
const aliceId = sqlite.prepare('SELECT id FROM accounts').get().id;
const aliceCookie = (await vow.startSession(db, { id: aliceId, pass_set_at: now })).split(';')[0];
ok(aliceCookie.startsWith(`${vow.COOKIE}=`), 'the test account is signed in with this site\'s own cookie');

console.log('Listing pages');
const SHELL = '/homes-for-sale/listing-shell/';
const SHELL_HTML = `<title>%%LISTING_TITLE%%</title><meta name="description" content="%%LISTING_DESCRIPTION%%"><meta name="robots" content="noindex"><link rel="canonical" href="${ORIGIN}${SHELL}"><h1>%%LISTING_H1%%</h1>%%LISTING_BODY%%<input name="page" value="${SHELL}">`;
let shellHeaders = { 'content-type': 'text/html', 'x-robots-tag': 'noindex, nofollow', 'content-security-policy': "default-src 'self'" };
const listingEnv = {
  ...env,
  PROPTX_IDX_TOKEN: 'idx',
  ASSETS: {
    fetch: async (u) => {
      const path = new URL(u).pathname;
      if (path === SHELL) return new Response(SHELL_HTML, { headers: shellHeaders });
      if (path === '/listing-areas.json') {
        return Response.json({
          areas: { unionville: { name: 'Unionville', path: '/unionville-markham/', intro: 'Intro.', transit: 'GO.', bands: [], faq: [] } },
          market: { period: 'August 2026', report: '/market-reports/august-2026/', byType: [{ type: 'Detached', sales: 137, average: 1611773, median: 1488000 }] },
        });
      }
      return new Response('not found page', { status: 404 });
    },
  },
};
let pending = [];
const ask = async (handler, key, cookie) => {
  const res = await handler({ request: new Request(`${ORIGIN}/listing/${key}/`, { headers: { cookie: cookie ?? '', 'cf-connecting-ip': '203.0.113.9' } }), env: listingEnv, params: { key }, waitUntil: (p) => pending.push(p) });
  await Promise.all(pending);
  pending = [];
  return { status: res.status, html: await res.text(), cache: res.headers.get('cache-control'), robots: res.headers.get('x-robots-tag'), csp: res.headers.get('content-security-policy'), hsts: res.headers.get('strict-transport-security') };
};
const view = (key, cookie) => ask(listingModule.onRequestGet, key, cookie);
const remembered = (key) => sqlite.prepare('SELECT address, community, city, lease FROM listing_pages WHERE key = ?').get(key);

const active = {
  ListingKey: 'N7000001', ListPrice: 1250000, UnparsedAddress: '9 Sample Road, Markham, ON L3R 1A1', City: 'Markham', CityRegion: 'Unionville', BedroomsTotal: 4, BathroomsTotalInteger: 3,
  PropertySubType: 'Detached', TransactionType: 'For Sale', ListOfficeName: 'SAMPLE & SONS REALTY', PublicRemarks: 'Bright <script>alert(1)</script> home.', TaxAnnualAmount: 7200,
  ListAgentFullName: 'Private Agent', InternetEntireListingDisplayYN: true, InternetAddressDisplayYN: true,
};
let row = active;
const closed = () => [{ ListingKey: row?.ListingKey, MlsStatus: 'Sold', ClosePrice: 1199000, CloseDate: '2026-09-15', InternetEntireListingDisplayYN: true }];
const liveFeed = (u) => (u.includes('/Media?') ? [] : u.includes("ListingKey eq '") ? (u.includes('MlsStatus') ? closed() : row ? [row] : []) : []);
feed = liveFeed;

let v = await view('N7000001');
ok(v.status === 200 && v.html.includes('$1,250,000') && v.html.includes('Listing courtesy of SAMPLE &amp; SONS REALTY. MLS® N7000001.') && !v.html.includes('Private Agent'), 'a live listing page shows the price, the listing brokerage and the MLS number. No field outside the allowlist is shown');
ok(v.html.includes(`<link rel="canonical" href="https://kirbychanmarkham.com/listing/N7000001/">`) && v.html.includes('value="/listing/N7000001/"') && !v.html.includes('noindex') && v.robots === null, 'it is indexable with a Markham canonical to itself. The enquiry form carries its address');
ok(!v.html.includes('<script>alert') && v.html.includes('Bright &lt;script&gt;alert(1)&lt;/script&gt; home.'), 'text from the feed is escaped');
ok(v.html.includes('Ontario land transfer tax') && v.html.includes('$21,475') && !v.html.includes('Toronto municipal land transfer tax</th>') && !v.html.includes('Both taxes') && v.html.includes('up to $4,000'), 'a Markham home shows the Ontario land transfer tax alone, with the Ontario refund');
ok(v.html.includes('$238,000 below') && v.html.includes('137 detached sales in Markham in August 2026') && v.html.includes('/unionville-markham/'), 'the asking price is set beside TRREB\'s Markham median for its type. The page links its neighbourhood guide');
ok(v.cache === 'public, max-age=600' && v.csp === "default-src 'self'" && remembered('N7000001')?.address === active.UnparsedAddress, 'it keeps the shell security headers and is remembered for later');
const head = await ask(listingModule.onRequestHead, 'N7000001');
ok(head.status === 200 && head.html === '' && head.cache === 'public, max-age=600' && (await ask(listingModule.onRequestHead, 'nonsense')).status === 404, 'HEAD answers like GET without a body');

shellHeaders = { 'content-type': 'text/html' };
edge.clear();
v = await view('N7000001');
ok(v.csp?.includes("frame-ancestors 'self'") && v.csp.includes('https://challenges.cloudflare.com') && v.hsts?.includes('max-age=31536000'), 'a shell served without security headers still goes out with them');
shellHeaders = { 'content-type': 'text/html', 'x-robots-tag': 'noindex, nofollow', 'content-security-policy': "default-src 'self'" };

row = { ...active, ListingKey: 'N7000002', TransactionType: 'For Lease', ListPrice: 4200 };
v = await view('N7000002');
ok(v.status === 200 && v.robots === 'noindex' && v.html.includes('noindex') && v.html.includes('$4,200 a month') && !/land transfer tax/i.test(v.html), 'a rental has a page with no purchase costs and is not offered to search engines');
row = { ...active, ListingKey: 'C7000007', City: 'Toronto C08', CityRegion: 'Moss Park' };
v = await view('C7000007');
ok(v.status === 200 && v.robots === 'noindex' && v.html.includes('Toronto municipal land transfer tax</th>') && !v.html.includes('How the asking price compares'), 'a home in another city has its page, is not offered to search engines and gets no Markham comparison');
row = { ...active, ListingKey: 'N7000003', InternetAddressDisplayYN: false };
v = await view('N7000003');
ok(v.status === 200 && !v.html.includes('Sample Road') && remembered('N7000003').address === null, 'an address the seller keeps off the internet is neither shown nor stored');
sqlite.prepare("INSERT INTO listing_pages (key, address, community, city, first_seen, last_seen) VALUES ('N7000004', '4 Hidden Street', 'Unionville', 'Markham', 1, 1)").run();
row = { ...active, ListingKey: 'N7000004', InternetEntireListingDisplayYN: false };
v = await view('N7000004');
ok(v.status === 404 && !v.html.includes('Hidden Street') && !remembered('N7000004'), 'a listing the seller keeps off the internet has no page and is forgotten');
row = null;
ok((await view('N7999999')).status === 404 && (await view('<script>')).status === 404, 'a key this site never showed is not a page');

feed = () => {
  throw new Error('feed down');
};
edge.clear();
v = await view('N7000003');
ok(v.status === 503 && !v.html.includes('no longer available') && v.cache === 'no-store', 'when the feed does not answer the page says so and never claims the listing is gone');
feed = liveFeed;

edge.clear();
v = await view('N7000001');
ok(v.status === 200 && v.html.includes('no longer available') && !/\$\d|Bright|Sold<\/strong>|<img/.test(v.html) && v.cache === 'public, max-age=600', 'a listing that left the feed keeps its page without price, photos, remarks or sold data');
ok(v.robots === 'noindex' && v.html.includes('<meta name="robots" content="noindex">'), 'an off-market page is not offered to search engines');
ok(v.html.includes('/sold/') && !v.html.includes('1,199,000'), 'a visitor who is not signed in is pointed to sign in and sees no sold price');
v = await view('N7000001', aliceCookie);
ok(v.html.includes('<strong>Sold</strong> for $1,199,000 on 2026-09-15') && v.cache === 'private, no-store' && v.robots === 'noindex', 'a signed-in account sees the sold price on a page that is never cached');
ok(sqlite.prepare("SELECT COUNT(*) AS n FROM audit WHERE action = 'search' AND detail = 'listing=N7000001'").get().n === 1, 'that sold lookup is in the audit trail');
ok(!(await view('N7000001')).html.includes('1,199,000') && !(await view('N7000001', `${vow.COOKIE}=${'a'.repeat(64)}`)).html.includes('1,199,000'), 'the sold price never reaches the shared cache or a forged session');
const ins = sqlite.prepare("INSERT INTO audit (user_id, at, action, detail) VALUES (?, ?, 'search', 'x')");
for (let i = 0; i < vow.SEARCHES_PER_DAY; i++) ins.run(aliceId, Date.now());
ok(!(await view('N7000001', aliceCookie)).html.includes('1,199,000'), 'sold lookups on listing pages stop at the daily search limit');
sqlite.prepare("DELETE FROM audit WHERE action = 'search'").run();

console.log('Listings sitemap');
sqlite.prepare("INSERT INTO listing_pages (key, address, community, city, first_seen, last_seen) VALUES ('N7000006', '6 Old Street', 'Unionville', 'Markham', 1, 1)").run();
let asked = '';
feed = (u) => {
  asked ||= u;
  return u.includes('$skip=0')
    ? [
        { ListingKey: 'N7000005', UnparsedAddress: "5 O'Brien Avenue", City: 'Markham', CityRegion: 'Unionville', ModificationTimestamp: '2026-10-05T12:00:00Z', InternetAddressDisplayYN: false },
        { ListingKey: 'N7000001', UnparsedAddress: '9 New Name Road', City: 'Markham', CityRegion: 'Unionville' },
        { ListingKey: 'N7000006', InternetEntireListingDisplayYN: false },
        { ListingKey: '<x>', UnparsedAddress: 'Bad key' },
      ]
    : [];
};
statements = [];
const sitemapCtx = { request: new Request(`${ORIGIN}/sitemap-listings.xml`), env: listingEnv, waitUntil: (p) => pending.push(p) };
const sm = await listingsSitemap(sitemapCtx);
await Promise.all(pending);
pending = [];
const smXml = await sm.text();
ok(sm.status === 200 && smXml.includes('<loc>https://kirbychanmarkham.com/listing/N7000005/</loc><lastmod>2026-10-05T12:00:00Z</lastmod>') && !smXml.includes('N7000006') && !smXml.includes('<x>') && sm.headers.get('x-listings') === '2', 'the listings sitemap lists active listings and leaves out the ones kept off the internet');
ok(asked.includes("City eq 'Markham'") && asked.includes("TransactionType eq 'For Sale'") && asked.includes("ContractStatus eq 'Available'"), 'it asks the feed for active Markham homes for sale only');
ok(remembered('N7000005')?.address === null && remembered('N7000001').address === '9 New Name Road' && !remembered('N7000006') && statements.filter((s) => s.startsWith('INSERT INTO listing_pages')).length === 1, 'the sitemap run remembers every listing in one statement without hidden addresses. It forgets withdrawn consent');
const smHead = await sitemapHead(sitemapCtx);
ok(smHead.status === 200 && (await smHead.text()) === '' && smHead.headers.get('content-type').startsWith('application/xml'), 'the sitemap answers HEAD');
feed = () => [];

console.log('Leads');
const form = (extra = {}) => {
  const f = new FormData();
  for (const [key, value] of Object.entries({ name: 'Bob Singh', email: 'bob@example.com', phone: '416-555-0100', neighbourhood: 'Unionville', message: 'Is it still available?', consent: 'yes', source: 'listing-page', page: '/listing/N7000001/', 'cf-turnstile-response': 'human', ...extra })) f.append(key, value);
  return f;
};
const post = (extraEnv = {}, extraForm = {}) => lead({ request: new Request(`${ORIGIN}/api/lead`, { method: 'POST', headers: { accept: 'application/json', 'cf-connecting-ip': '203.0.113.5' }, body: form(extraForm) }), env: { ...env, ...extraEnv } });
const stored = () => sqlite.prepare('SELECT name, email, source, page, emailed, payload FROM leads ORDER BY id').all();

ok((await post({ VOW_DB: undefined })).status === 200 && emails.at(-1).to[0] === 'info@kirbychanmarkham.com' && site.leadsEmail === 'info@kirbychanmarkham.com' && emails.at(-1).reply_to === 'bob@example.com', 'an enquiry is emailed to info@kirbychanmarkham.com with reply-to the sender');
ok((await post()).status === 200 && stored().length === 1 && stored()[0].emailed === 1 && stored()[0].source === 'listing-page' && stored()[0].page === '/listing/N7000001/' && JSON.parse(stored()[0].payload).turnstile === 'verified', 'an enquiry is kept in the database with its form and page and is marked as emailed');
ok(emails.at(-1).text.includes('Page: /listing/N7000001/') && emails.at(-1).text.includes('Form: listing-page'), 'the email says which listing and which form the enquiry came from');
ok((await post({ RESEND_API_KEY: undefined })).status === 200 && stored().length === 2 && stored()[1].emailed === 0, 'when email is down the enquiry is still kept and the visitor is not told it failed');
ok((await post({ RESEND_API_KEY: undefined, VOW_DB: undefined })).status === 502, 'with no database and no email the visitor is told to call');
ok((await post({}, { 'cf-turnstile-response': 'robot' })).status === 403 && (await post({}, { consent: '' })).status === 422 && (await post({}, { email: 'not an email' })).status === 422 && stored().length === 2, 'an enquiry that fails Turnstile or validation is refused and nothing is stored');
ok((await post({}, { company_website: 'https://spam.example' })).status === 200 && stored().length === 2, 'a spam bot that fills the hidden field gets no record');

console.log(`\n${passed} checks passed`);
