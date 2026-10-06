/**
 * Serves posts uploaded at /upload/ the moment they are published. Every other /blog/ page is the
 * built page, untouched.
 *
 * For an uploaded post: taken down means 404. Otherwise the built page is used once a build has
 * caught up with this version of the post (it carries data-upload="<version>"); until then the post
 * is poured into the built blog layout shell (src/lib/uploads.ts).
 *
 * The blog list at /blog/ gets uploaded posts the last build does not have yet, added at the top, so
 * a post is on the list as soon as it is published. Category pages, the sitemap and the feed catch
 * up at the next build.
 */
import { BLOG_CATEGORIES } from '../../src/lib/blog';
import { hoodsIn } from '../../src/lib/post-links';
import { SHELL, addToList, ensureUploadSchema, fillShell, getUpload, type Post, type UploadEnv } from '../../src/lib/uploads';

interface Context {
  request: Request;
  env: UploadEnv;
  next(): Promise<Response>;
}

export async function onRequest({ request, env, next }: Context): Promise<Response> {
  if (new URL(request.url).pathname === '/blog/' && env.VOW_DB && request.method === 'GET') {
    const built = await next();
    if (!built.ok) return built;
    const html = await built.text();
    try {
      await ensureUploadSchema(env.VOW_DB);
      const { results } = await env.VOW_DB.prepare('SELECT post FROM uploads WHERE live = 1 ORDER BY updated DESC LIMIT 50').bind().all<{ post: string }>();
      const out = addToList(html, results.map((r) => JSON.parse(r.post) as Post), BLOG_CATEGORIES, (p) => p.related?.[0] ?? hoodsIn(`${p.headline} ${p.summary}`, 1)[0]);
      if (out === html) return new Response(html, built);
      const headers = new Headers(built.headers);
      headers.delete('etag');
      headers.set('cache-control', 'public, max-age=0, must-revalidate');
      return new Response(out, { status: 200, headers });
    } catch {
      return new Response(html, built);
    }
  }

  const slug = new URL(request.url).pathname.match(/^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/)?.[1];
  if (!slug || !env.VOW_DB || !['GET', 'HEAD'].includes(request.method)) return next();
  let upload;
  try {
    await ensureUploadSchema(env.VOW_DB);
    upload = await getUpload(env.VOW_DB, slug);
  } catch {
    return next();
  }
  if (!upload) return next();

  if (!upload.live) {
    const notFound = await env.ASSETS!.fetch(new URL('/404.html', request.url));
    return new Response(notFound.body, { status: 404, headers: notFound.headers });
  }
  const built = await next();
  if (built.ok) {
    const html = await built.text();
    if (html.includes(`data-upload="${upload.post.updated}"`)) return new Response(html, built);
  }
  const shell = await env.ASSETS!.fetch(new URL(`${SHELL}${upload.post.category}/`, request.url));
  if (!shell.ok) return built.ok ? next() : shell;
  const headers = new Headers(shell.headers);
  headers.delete('x-robots-tag');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  let html: string;
  try {
    html = fillShell(await shell.text(), upload.post);
  } catch {
    // Never show a broken page: fall back to the built one (or not found, until the next build).
    return next();
  }
  return new Response(html, { status: 200, headers });
}
