/**
 * /api/upload/me         GET   signed in or not, plus whether uploads are set up
 * /api/upload/login      POST  password
 * /api/upload/logout     POST
 * /api/upload/preview    POST  post   the finished page, exactly as it will look
 * /api/upload/publish    POST  post   live at once (or saved only, when post.draft); replace: true to update a post already up
 * /api/upload/get        POST  slug   a saved post, to edit it
 * /api/upload/list       GET   every post, newest first: uploaded ones (source "upload") and the ones built
 *                              from the website's own files that have not been saved here (source "website")
 * /api/upload/unpublish  POST  slug   removes the post from the website and from the list (live = -1;
 *                              the row stays so the built copy answers 404 until the next build)
 * /api/upload/export     GET   public: live uploaded posts, plus the addresses of website posts taken
 *                              down here ("down"), read by scripts/pull-uploads.mjs at build
 *
 * Posts built from the website's own files come from /blog/built-posts.json (builtPosts). Saving or
 * removing one stores it in the uploads table, which wins from then on. If that file cannot be read
 * the list simply has the uploaded posts.
 *
 * One shared password, set by the owner as the UPLOAD_PASSWORD secret in Cloudflare. Ten wrong
 * passwords from one address in an hour (or fifty from anywhere) pause sign in for the hour.
 *
 * /api/upload/connect    POST  key    the agent's OneCut Content website key (client websites only)
 * /api/upload/write      POST  topic  OneCut Content writes the article; answers one JSON line per step, the
 *                              last one {done, blog}. Uses the connected OneCut account and its tokens
 *
 * Client websites (requireOneCutPro in src/data/site.json) also need a OneCut Content account on Pro
 * or above. After signing in, the agent pastes their website key from onecutcontent.com once; it is
 * checked there, then kept encrypted in the database. An ONECUT_API_KEY secret works too. No key,
 * a revoked key or a lower plan closes everything except signing in, connecting and export, so
 * posts already published stay on the site.
 *
 * With oneCutOnly in site.json as well, OneCut Content is the only way to make a post: each article
 * it finishes writing comes with a one-use ticket and a new post is not saved without one. Posts
 * already saved or already built into the website can still be edited, unpublished and removed.
 * ponytail: the ticket proves an article was written, not that the saved words are that article. A
 * signed-in owner editing requests by hand could swap the text. Bind the ticket to a hash of the
 * article if that ever matters.
 */
import { randomHex, same, sameOrigin, sha256 } from '../../../src/lib/vow';
import site from '../../../src/data/site.json';
import { SHELL, builtPosts, cleanPost, ensureUploadSchema, fillShell, getUpload, rebuild, type Post, type UploadEnv } from '../../../src/lib/uploads';

interface Context {
  request: Request;
  env: UploadEnv;
  params: { action: string };
  waitUntil(p: Promise<unknown>): void;
}

const COOKIE = '__Host-kc_upload';
const SESSION_HOURS = 12;
const HOUR = 36e5;

const json = (body: unknown, status = 200, cookie?: string) => {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  if (cookie) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
};
const problem = (message: string, status = 400) => json({ error: message }, status);

type Verdict = 'pro' | 'not-pro' | 'bad-key' | 'unknown';

/** What onecutcontent.com says about this key's account. 'unknown' when it cannot be reached. */
export async function oneCutVerdict(key: string, fetcher: typeof fetch = fetch): Promise<Verdict> {
  try {
    const res = await fetcher('https://onecutcontent.com/api/v1/account', { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    if (res.ok) return ((await res.json()) as { pro?: boolean }).pro === true ? 'pro' : 'not-pro';
    return res.status === 401 ? 'bad-key' : res.status === 402 ? 'not-pro' : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Whether the site's OneCut account is on Pro or above. The answer is kept for ten minutes.
 * ponytail: if onecutcontent.com cannot be reached (not a yes or a no), uploads stay open, since the
 * password still guards them. Close on outage instead if plans are ever dodged this way.
 */
export async function oneCutPro(key: string | undefined, fetcher: typeof fetch = fetch): Promise<boolean> {
  key = key?.trim();
  if (!key) return false;
  const cache = typeof caches === 'undefined' ? undefined : (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(`https://onecut.invalid/pro/${await sha256(key)}`);
  const hit = await cache?.match(cacheKey);
  if (hit) return (await hit.text()) === '1';
  const verdict = await oneCutVerdict(key, fetcher);
  if (verdict === 'unknown') return true;
  await cache?.put(cacheKey, new Response(verdict === 'pro' ? '1' : '0', { headers: { 'cache-control': 'max-age=600' } }));
  return verdict === 'pro';
}

// The website key at rest: AES-256-GCM under a key made from the upload password, stored as "iv.ciphertext".
// Changing the password makes it unreadable, so the agent pastes the key again.
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer)));
const unb64 = (t: string) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
const aesKey = async (password: string) =>
  crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`onecut-key|${password}`)), 'AES-GCM', false, ['encrypt', 'decrypt']);
export async function sealKey(password: string, key: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return `${b64(iv)}.${b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(password), new TextEncoder().encode(key)))}`;
}
export async function unsealKey(password: string, sealed: string): Promise<string> {
  try {
    const [iv, ct] = sealed.split('.');
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await aesKey(password), unb64(ct)));
  } catch {
    return '';
  }
}

async function signedIn(env: UploadEnv, request: Request): Promise<boolean> {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-kc_upload=([0-9a-f]{64})/)?.[1];
  if (!token) return false;
  const row = await env.VOW_DB!.prepare('SELECT expires FROM upload_sessions WHERE hash = ?').bind(await sha256(token)).first<{ expires: number }>();
  return !!row && row.expires > Date.now();
}

async function page(env: UploadEnv, request: Request, post: Post): Promise<string | null> {
  const res = await env.ASSETS!.fetch(new URL(`${SHELL}${post.category}/`, request.url));
  return res.ok ? fillShell(await res.text(), post) : null;
}

export async function onRequest({ request, env, params, waitUntil }: Context): Promise<Response> {
  const action = params.action;
  const postUrl = (slug: string) => `${new URL(request.url).origin}/blog/${slug}/`;
  const db = env.VOW_DB;
  const password = env.UPLOAD_PASSWORD?.trim() ?? '';
  if (!db || password.length < 12) return action === 'me' ? json({ ready: false, signedIn: false }) : problem('Uploads are not set up yet.', 503);
  await ensureUploadSchema(db);

  if (action === 'export' && request.method === 'GET') {
    const { results } = await db.prepare('SELECT slug, live, post FROM uploads ORDER BY updated DESC').bind().all<{ slug: string; live: number; post: string }>();
    const rows = results.map((r) => ({ ...r, post: JSON.parse(r.post) as Post }));
    // down: website posts removed or held as a draft here, so the build leaves their files out. Other drafts stay private.
    return json({ posts: rows.filter((r) => r.live === 1).map((r) => r.post), down: rows.filter((r) => r.live !== 1 && r.post.fromWebsite).map((r) => r.slug) });
  }

  if (request.method === 'POST') {
    if (!sameOrigin(request) || !request.headers.get('content-type')?.startsWith('application/json')) return problem('Refused.', 403);
  } else if (request.method !== 'GET') return problem('Not allowed.', 405);
  const body = request.method === 'POST' ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {};

  if (action === 'login' && request.method === 'POST') {
    const now = Date.now();
    const ip = await sha256(`${password}|${request.headers.get('cf-connecting-ip') ?? ''}`);
    const fails = await db.prepare('SELECT COUNT(*) AS n, SUM(ip = ?) AS mine FROM upload_fails WHERE at > ?').bind(ip, now - HOUR).first<{ n: number; mine: number | null }>();
    if ((fails?.mine ?? 0) >= 10 || (fails?.n ?? 0) >= 50) return problem('Too many wrong passwords. Please wait an hour and try again.', 429);
    const given = typeof body.password === 'string' ? body.password.trim() : '';
    if (!same(await sha256(given), await sha256(password))) {
      await db.prepare('INSERT INTO upload_fails (ip, at) VALUES (?, ?)').bind(ip, now).run();
      return problem('That password is not right. Please try again.', 401);
    }
    const token = randomHex();
    await db.prepare('DELETE FROM upload_sessions WHERE expires < ?').bind(now).run();
    await db.prepare('INSERT INTO upload_sessions (hash, expires) VALUES (?, ?)').bind(await sha256(token), now + SESSION_HOURS * HOUR).run();
    return json({ ok: true }, 200, `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`);
  }

  // Client websites: signed in is not enough, the OneCut account has to be on Pro.
  const oneCutKey = async () => {
    const row = await db.prepare("SELECT value FROM upload_settings WHERE name = 'onecut_key'").bind().first<{ value: string }>();
    return ((row && (await unsealKey(password, row.value))) || env.ONECUT_API_KEY || '').trim();
  };
  const oneCutOnly = (site as { oneCutOnly?: boolean }).oneCutOnly === true;
  const needsPro = async () => (site as { requireOneCutPro?: boolean }).requireOneCutPro === true && !(await oneCutPro(await oneCutKey()));

  if (action === 'me') {
    const inside = await signedIn(env, request);
    if (!inside) return json({ ready: true, signedIn: false });
    // canWrite: a OneCut account is connected, so the page offers "Write a new post".
    return (await needsPro()) ? json({ ready: true, signedIn: true, needsPro: true }) : json({ ready: true, signedIn: true, ...((await oneCutKey()) ? { canWrite: true } : {}), ...(oneCutOnly ? { oneCutOnly: true } : {}) });
  }
  if (!(await signedIn(env, request))) return problem('Please sign in again.', 401);

  if (action === 'connect' && request.method === 'POST') {
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    if (!/^oc_live_[\w-]{16,200}$/.test(key)) return problem('That does not look like a OneCut website key. It starts with oc_live_.');
    const verdict = await oneCutVerdict(key);
    if (verdict === 'bad-key') return problem('OneCut does not know this key. Create a new website key in your OneCut account and paste it here.');
    if (verdict === 'not-pro') return problem('This OneCut account is not on Pro. Publishing blog posts needs OneCut Content Pro.', 403);
    if (verdict === 'unknown') return problem('OneCut could not be reached. Please try again in a minute.', 503);
    await db.prepare("INSERT OR REPLACE INTO upload_settings (name, value) VALUES ('onecut_key', ?)").bind(await sealKey(password, key)).run();
    return json({ ok: true });
  }

  if (action === 'logout' && request.method === 'POST') {
    const token = request.headers.get('cookie')?.match(/__Host-kc_upload=([0-9a-f]{64})/)?.[1] ?? '';
    await db.prepare('DELETE FROM upload_sessions WHERE hash = ?').bind(await sha256(token)).run();
    return json({ ok: true }, 200, `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
  }

  if (action !== 'logout' && (await needsPro())) return problem('Publishing blog posts needs a OneCut Content Pro account.', 403);

  if (action === 'write' && request.method === 'POST') {
    const key = await oneCutKey();
    if (!key) return problem('Connect a OneCut Content account first.', 403);
    const topic = typeof body.topic === 'string' ? body.topic.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
    if (topic.length < 3) return problem('Tell us what the post should be about.');
    let res: Response;
    try {
      res = await fetch('https://onecutcontent.com/api/v1/blogs', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', accept: 'application/x-ndjson' },
        body: JSON.stringify({ topic, words: 1500 }),
      });
    } catch {
      return problem('OneCut could not be reached. Please try again in a minute.', 503);
    }
    if (!res.ok || !res.body) {
      const said = ((await res.json().catch(() => ({}))) as { error?: string }).error;
      return problem(said || 'OneCut could not write the post. Please try again.', res.status === 402 || res.status === 429 ? res.status : 502);
    }
    // Passed straight through: a line per step as OneCut works, then the finished article. When it
    // did finish, one more line carries the ticket that lets this article be saved as a new post.
    let tail = '';
    const decoder = new TextDecoder();
    const ticketed = res.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          tail = (tail + decoder.decode(chunk, { stream: true })).slice(-200_000);
          controller.enqueue(chunk);
        },
        async flush(controller) {
          if (!/"done":\s*true/.test(tail)) return;
          const ticket = randomHex();
          const now = Date.now();
          await db.prepare('DELETE FROM upload_tickets WHERE expires < ?').bind(now).run();
          await db.prepare('INSERT INTO upload_tickets (hash, expires) VALUES (?, ?)').bind(await sha256(ticket), now + 24 * HOUR).run();
          controller.enqueue(new TextEncoder().encode(`\n${JSON.stringify({ ticket })}\n`));
        },
      })
    );
    return new Response(ticketed, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
  }

  if (action === 'list' && request.method === 'GET') {
    const { results } = await db.prepare('SELECT live, post FROM uploads WHERE live >= 0 ORDER BY updated DESC LIMIT 500').bind().all<{ live: number; post: string }>();
    const taken = new Set((await db.prepare('SELECT slug FROM uploads').bind().all<{ slug: string }>()).results.map((r) => r.slug));
    const item = (p: Post, live: boolean, source: 'upload' | 'website', locked?: string) =>
      ({ slug: p.slug, headline: p.headline, live, draft: !!p.draft, updated: p.updated, url: postUrl(p.slug), source, ...(locked ? { locked } : {}) });
    return json({
      posts: [
        ...results.map((r) => item(JSON.parse(r.post) as Post, r.live === 1, 'upload')),
        ...(await builtPosts(env, request.url)).filter((p) => !taken.has(p.slug)).map((p) => item(p, true, 'website', p.locked)),
      ].sort((a, b) => b.updated - a.updated),
    });
  }

  if ((action === 'preview' || action === 'publish') && request.method === 'POST') {
    const post = cleanPost(body.post);
    if (typeof post === 'string') return problem(post);
    const existing = await getUpload(db, post.slug);
    // The same address in the website's own files: saving is an edit of that post and it keeps its date.
    const built = (await builtPosts(env, request.url)).find((p) => p.slug === post.slug);
    if (built?.locked && !existing) return problem(built.locked, 409);
    const now = Date.now();
    post.published = existing?.post.published ?? built?.published ?? now;
    post.updated = now;
    if (built || existing?.post.fromWebsite) post.fromWebsite = true;

    if (action === 'preview') {
      const html = await page(env, request, post);
      return html ? json({ html, exists: existing ? !existing.removed : !!built }) : problem('The preview could not be made. Please try again.', 500);
    }
    // Any other page built at this address (a blog list page or a post the list above could not read) keeps it.
    if (!existing && !built && (await env.ASSETS!.fetch(new URL(`/blog/${post.slug}/`, request.url))).ok) {
      return problem('The site already has a post with this title. Change the title a little and try again.', 409);
    }
    // OneCut only: a new post needs the ticket from an article OneCut wrote. It is used up when saved.
    // A post is new unless it is saved here and not removed or it is built into the website.
    if (oneCutOnly && (existing ? existing.removed : !built)) {
      const ticket = typeof body.ticket === 'string' && /^[0-9a-f]{64}$/.test(body.ticket) ? await sha256(body.ticket) : '';
      const row = ticket ? await db.prepare('SELECT expires FROM upload_tickets WHERE hash = ?').bind(ticket).first<{ expires: number }>() : null;
      if (!row || row.expires < now) return problem('New posts on this website are written with OneCut Content. Press "Write a new post" to start one.', 403);
      await db.prepare('DELETE FROM upload_tickets WHERE hash = ?').bind(ticket).run();
    }
    // Same title as a post in the list (live or draft): ask before replacing it.
    if ((existing ? !existing.removed : built) && body.replace !== true) return json({ error: 'exists', live: existing?.live ?? true, url: postUrl(post.slug) }, 409);
    await db
      .prepare('INSERT INTO uploads (slug, live, post, updated) VALUES (?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET live = excluded.live, post = excluded.post, updated = excluded.updated')
      .bind(post.slug, post.draft ? 0 : 1, JSON.stringify(post), now)
      .run();
    if (!post.draft || existing?.live) waitUntil(rebuild(env));
    return json({ ok: true, draft: post.draft, url: postUrl(post.slug) });
  }

  if (action === 'get' && request.method === 'POST') {
    const slug = typeof body.slug === 'string' ? body.slug : '';
    const found = await getUpload(db, slug);
    if (found) return json({ post: found.post, live: found.live, source: 'upload' });
    const built = (await builtPosts(env, request.url)).find((p) => p.slug === slug);
    if (built?.locked) return problem(built.locked, 409);
    return built ? json({ post: built, live: true, source: 'website' }) : problem('That post was not found.', 404);
  }

  if (action === 'unpublish' && request.method === 'POST') {
    const slug = typeof body.slug === 'string' ? body.slug : '';
    const now = Date.now();
    // A post in the website's own files gets a row (or its row is marked), so its page answers 404
    // and the build leaves the file out.
    const built = (await builtPosts(env, request.url)).find((p) => p.slug === slug);
    if (built) {
      const { locked: _locked, ...post } = built;
      await db
        .prepare(
          `INSERT INTO uploads (slug, live, post, updated) VALUES (?, -1, ?, ?)
           ON CONFLICT(slug) DO UPDATE SET live = -1, updated = excluded.updated, post = json_set(uploads.post, '$.fromWebsite', json('true'))`
        )
        .bind(slug, JSON.stringify({ ...post, fromWebsite: true }), now)
        .run();
    } else await db.prepare('UPDATE uploads SET live = -1, updated = ? WHERE slug = ?').bind(now, slug).run();
    waitUntil(rebuild(env));
    return json({ ok: true });
  }

  return problem('Not found.', 404);
}
