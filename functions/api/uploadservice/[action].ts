/**
 * The service page chat at /uploadservice/. Same sign in as /upload/ (the same password, session and
 * cookie, made by /api/upload/login).
 *
 * /api/uploadservice/me         GET   signed in? aiReady (the API key is set)? hookReady (a deploy hook is set)?
 * /api/uploadservice/chat       POST  { messages: string[], draft?: page }  one JSON line per step, then
 *                                     { done: true, page, warnings, problems } or { error }
 * /api/uploadservice/preview    POST  { page }  { html, warnings, problems }: the page as it will read
 * /api/uploadservice/save       POST  { page, replace? }  kept as a draft (live = 0)
 * /api/uploadservice/publish    POST  { page, replace? }  live = 1, then a rebuild when a deploy hook is set
 * /api/uploadservice/list       GET   every page that is not removed, newest first
 * /api/uploadservice/get        POST  { slug }
 * /api/uploadservice/unpublish  POST  { slug }  off the website, kept as a draft (live = 0)
 * /api/uploadservice/remove     POST  { slug }  off the website and out of the list (live = -1)
 * /api/uploadservice/export     GET   public: live pages and the addresses taken down, read by
 *                                     scripts/pull-uploads.mjs at build
 *
 * Secrets: ANTHROPIC_API_KEY (the chat is off without it), SERVICE_AI_MODEL (optional, default
 * claude-sonnet-5-5) and DEPLOY_HOOK_URL (optional). Neither the key nor the prompt is ever logged
 * or sent back. Each chat message costs money, so there are at most 20 an hour in total.
 */
import Anthropic from '@anthropic-ai/sdk';
import { sameOrigin } from '../../../src/lib/vow';
import { ensureUploadSchema, rebuild, type UploadEnv } from '../../../src/lib/uploads';
import { signedIn } from '../../../src/lib/upload-auth';
import { MAX_DRAFT, checkPage, ensureServiceSchema, getService, previewHtml, type ServicePage } from '../../../src/lib/service-uploads';
import { DEFAULT_MODEL, PlainError, buildCatalog, generate, type ServiceClient } from '../../../src/lib/service-ai';

interface Env extends UploadEnv {
  ANTHROPIC_API_KEY?: string;
  SERVICE_AI_MODEL?: string;
}
interface Context {
  request: Request;
  env: Env;
  params: { action: string };
  waitUntil(p: Promise<unknown>): void;
}

const HOUR = 36e5;
const CALLS_PER_HOUR = 20;
const MAX_MESSAGE = 4000;
const MAX_MESSAGES = 8000;
const HEADERS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...HEADERS } });
const problem = (message: string, status = 400) => json({ error: message }, status);


const WHEN_LIVE = (hook: boolean) =>
  hook
    ? 'The website is rebuilding now. The page will be live in about 4 minutes.'
    : 'It goes live with the next automatic rebuild, every morning, because no deploy hook is set.';

export async function onRequest({ request, env, params, waitUntil }: Context): Promise<Response> {
  const action = params.action;
  const db = env.VOW_DB;
  const password = env.UPLOAD_PASSWORD?.trim() ?? '';
  const key = env.ANTHROPIC_API_KEY?.trim() ?? '';
  if (!db || password.length < 12) return action === 'me' ? json({ ready: false, signedIn: false }) : problem('Uploads are not set up yet.', 503);
  await ensureUploadSchema(db);
  await ensureServiceSchema(db);

  if (action === 'export' && request.method === 'GET') {
    const { results } = await db.prepare('SELECT slug, live, page, updated FROM service_uploads ORDER BY updated').bind().all<{ slug: string; live: number; page: string; updated: number }>();
    return json({ pages: results.filter((r) => r.live === 1).map((r) => ({ ...JSON.parse(r.page), updated: r.updated })), down: results.filter((r) => r.live !== 1).map((r) => r.slug) });
  }

  if (request.method === 'POST') {
    if (!sameOrigin(request) || !request.headers.get('content-type')?.startsWith('application/json')) return problem('Refused.', 403);
  } else if (request.method !== 'GET') return problem('Not allowed.', 405);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_DRAFT + MAX_MESSAGES * 2 + 10_000) return problem('That is too much to send at once.', 413);
  const text = request.method === 'POST' ? await request.text() : '';
  if (text.length > MAX_DRAFT + MAX_MESSAGES * 2 + 10_000) return problem('That is too much to send at once.', 413);
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {}
  if (!body || typeof body !== 'object') body = {};

  const inside = await signedIn(env, request);
  if (action === 'me') return json({ ready: true, signedIn: inside, ...(inside ? { aiReady: !!key, hookReady: !!env.DEPLOY_HOOK_URL?.trim().startsWith('https://api.cloudflare.com/') } : {}) });
  if (!inside) return problem('Please sign in again.', 401);

  const base = request.url;
  const pageIn = (): unknown => {
    const p = body.page ?? body.draft;
    return p && typeof p === 'object' && JSON.stringify(p).length <= MAX_DRAFT ? p : null;
  };

  if (action === 'chat' && request.method === 'POST') {
    if (!key) return problem('The AI writer is not switched on yet. The website owner needs to add the ANTHROPIC_API_KEY secret in Cloudflare.', 503);
    const messages = Array.isArray(body.messages) ? body.messages.filter((m): m is string => typeof m === 'string').map((m) => m.trim()).filter(Boolean) : [];
    if (!messages.length) return problem('Type what the page should be about.');
    if (messages.some((m) => m.length > MAX_MESSAGE)) return problem(`Please keep each message under ${MAX_MESSAGE.toLocaleString('en-CA')} characters.`, 413);
    if (messages.join('').length > MAX_MESSAGES) return problem('This conversation is too long. Save the draft, then press "Start over" and load it with Edit.', 413);
    if ((body.draft ?? null) !== null && !pageIn()) return problem('The draft is too large to send.', 413);
    // The draft only goes into the prompt as text. Whatever comes back is checked in full.
    const draft = body.draft ? (pageIn() as ServicePage) : null;
    // Every call costs money: at most 20 an hour, counted before the model is called.
    const now = Date.now();
    const used = await db.prepare('SELECT COUNT(*) AS n FROM service_calls WHERE at > ?').bind(now - HOUR).first<{ n: number }>();
    if ((used?.n ?? 0) >= CALLS_PER_HOUR) return problem(`The AI writer has been used ${CALLS_PER_HOUR} times in the last hour. Please wait a little and try again.`, 429);
    await db.prepare('DELETE FROM service_calls WHERE at < ?').bind(now - HOUR).run();
    await db.prepare('INSERT INTO service_calls (at) VALUES (?)').bind(now).run();

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    let open = true;
    const send = (line: unknown) => (open ? writer.write(encoder.encode(`${JSON.stringify(line)}\n`)).catch(() => (open = false)) : undefined);
    // A line every 15 seconds keeps the connection open while the model thinks.
    const alive = setInterval(() => send({ wait: true }), 15_000);
    const work = (async () => {
      try {
        send({ status: 'Reading your blog posts...' });
        const catalog = await buildCatalog(env, base, db);
        const result = await generate({ client: new Anthropic({ apiKey: key, maxRetries: 1 }) as ServiceClient, model: env.SERVICE_AI_MODEL?.trim() || DEFAULT_MODEL, catalog, draft, instructions: messages, status: (s) => send({ status: s }) });
        await send({ done: true, page: result.page, warnings: result.warnings, problems: result.errors });
      } catch (e) {
        // Never the key or the prompt: only a plain message chosen by the HTTP status.
        const status = e instanceof Anthropic.APIError ? e.status : undefined;
        const message =
          e instanceof PlainError ? e.message
          : status === 401 ? 'The AI key was not accepted. The website owner needs to check ANTHROPIC_API_KEY in Cloudflare.'
          : status === 429 || status === 529 ? 'The AI service is busy right now. Please try again in a minute.'
          : 'The page could not be written just now. Please try again.';
        await send({ error: message });
      } finally {
        clearInterval(alive);
        await writer.close().catch(() => {});
      }
    })();
    waitUntil(work);
    return new Response(readable, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', ...HEADERS } });
  }

  if (action === 'list' && request.method === 'GET') {
    const { results } = await db.prepare('SELECT slug, live, page, updated FROM service_uploads WHERE live >= 0 ORDER BY updated DESC LIMIT 500').bind().all<{ slug: string; live: number; page: string; updated: number }>();
    const origin = new URL(request.url).origin;
    return json({ pages: results.map((r) => ({ slug: r.slug, name: (JSON.parse(r.page) as ServicePage).name, live: r.live === 1, updated: r.updated, url: `${origin}/services/${r.slug}/` })) });
  }

  if (action === 'get' && request.method === 'POST') {
    const found = await getService(db, typeof body.slug === 'string' ? body.slug : '');
    return found && found.live >= 0 ? json({ page: found.page, live: found.live === 1 }) : problem('That page was not found.', 404);
  }

  if ((action === 'preview' || action === 'save' || action === 'publish') && request.method === 'POST') {
    const raw = pageIn();
    if (!raw) return problem('There is no page to work with yet. It may also be too large.');
    const { page, errors, warnings } = checkPage(raw, await buildCatalog(env, base, db));
    if (action === 'preview') return json({ html: previewHtml(page), page, warnings, problems: errors });
    if (action === 'publish' && errors.length) return json({ error: 'This page cannot be published until these are fixed. Ask the AI to fix them, then try again.', problems: errors }, 422);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(page.slug) || page.slug.length > 60) return problem('The page needs a valid web address before it can be saved.');
    const existing = await getService(db, page.slug);
    // The same address as another page in the list: ask before replacing it.
    if (existing && existing.live >= 0 && body.replace !== true) return json({ error: 'exists', live: existing.live === 1 }, 409);
    const now = Date.now();
    const live = action === 'publish' ? 1 : 0;
    await db
      .prepare('INSERT INTO service_uploads (slug, live, page, updated) VALUES (?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET live = excluded.live, page = excluded.page, updated = excluded.updated')
      .bind(page.slug, live, JSON.stringify(page), now)
      .run();
    // A draft that replaced a live page takes it down at the next build too.
    if (live || existing?.live === 1) waitUntil(rebuild(env));
    const hook = !!env.DEPLOY_HOOK_URL?.trim().startsWith('https://api.cloudflare.com/');
    return json({
      ok: true,
      page,
      warnings,
      url: `${new URL(request.url).origin}/services/${page.slug}/`,
      message: live
        ? `Published. ${WHEN_LIVE(hook)}`
        : existing?.live === 1
          ? `Saved as a draft. The live page comes off the website ${hook ? 'in about 4 minutes, after the rebuild' : 'with the next automatic rebuild, every morning'}.`
          : 'Saved as a draft. It is not on the website.',
    });
  }

  if ((action === 'unpublish' || action === 'remove') && request.method === 'POST') {
    const found = await getService(db, typeof body.slug === 'string' ? body.slug : '');
    if (!found || found.live < 0) return problem('That page was not found.', 404);
    await db.prepare('UPDATE service_uploads SET live = ?, updated = ? WHERE slug = ?').bind(action === 'remove' ? -1 : 0, Date.now(), found.page.slug).run();
    if (found.live === 1) waitUntil(rebuild(env));
    const hook = !!env.DEPLOY_HOOK_URL?.trim().startsWith('https://api.cloudflare.com/');
    return json({ ok: true, message: found.live === 1 ? `Taken off the website. ${hook ? 'It disappears in about 4 minutes, after the rebuild.' : 'It disappears with the next automatic rebuild, every morning.'}` : 'Done.' });
  }

  return problem('Not found.', 404);
}
