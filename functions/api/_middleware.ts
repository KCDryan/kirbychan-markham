/**
 * Security headers for every /api/ response. public/_headers only covers static pages, not
 * Functions, so these are set here. JSON never needs to run scripts, load anything or be framed.
 */
export const onRequest = async ({ next }: { next: () => Promise<Response> }): Promise<Response> => {
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
  out.headers.set('x-content-type-options', 'nosniff');
  out.headers.set('x-frame-options', 'DENY');
  out.headers.set('referrer-policy', 'no-referrer');
  out.headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
  out.headers.set('cross-origin-resource-policy', 'same-origin');
  return out;
};
