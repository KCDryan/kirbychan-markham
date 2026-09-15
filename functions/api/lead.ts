/**
 * POST /api/lead
 *
 * Cloudflare Pages Function. Validates the enquiry, screens obvious spam,
 * verifies the Cloudflare Turnstile token when one is configured, then forwards
 * the lead to LEAD_WEBHOOK_URL as JSON.
 *
 * Secrets live only in the Cloudflare dashboard. Nothing in src/ reads
 * TURNSTILE_SECRET_KEY or LEAD_WEBHOOK_URL, so neither can reach the browser.
 */

interface Env {
  LEAD_WEBHOOK_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
}

interface Context {
  request: Request;
  env: Env;
}

interface TurnstileResult {
  success: boolean;
  'error-codes'?: string[];
}

const MAX_FIELD = 2000;
const MIN_FILL_MS = 2500;

function clean(value: FormDataEntryValue | null, limit = 200): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, limit);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

function wantsJson(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('application/json');
}

function reply(request: Request, status: number, body: { ok: boolean; error?: string }): Response {
  if (wantsJson(request)) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  // No JavaScript. Send the visitor somewhere readable instead of raw JSON.
  const target = body.ok ? '/contact/thank-you/' : '/contact/?error=1';
  return new Response(null, { status: 303, headers: { location: target } });
}

async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string | null
): Promise<boolean> {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  if (!response.ok) return false;
  const result = (await response.json()) as TurnstileResult;
  return result.success === true;
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(request, 400, { ok: false, error: 'That submission could not be read' });
  }

  // 1. Honeypot. A real person never sees this field.
  if (clean(form.get('company_website'))) {
    return reply(request, 200, { ok: true });
  }

  // 2. Timing. Bots post instantly. Only applied when the browser filled it in.
  const started = Number(clean(form.get('started'), 20));
  if (started > 0 && Date.now() - started < MIN_FILL_MS) {
    return reply(request, 200, { ok: true });
  }

  // 3. Required fields.
  const name = clean(form.get('name'), 120);
  const email = clean(form.get('email'), 254);
  const consent = clean(form.get('consent'), 10);

  if (name.length < 2) {
    return reply(request, 422, { ok: false, error: 'Please add your name' });
  }
  if (!isEmail(email)) {
    return reply(request, 422, { ok: false, error: 'Please check the email address' });
  }
  if (consent !== 'yes') {
    return reply(request, 422, { ok: false, error: 'Please tick the consent box so we may reply' });
  }

  // 4. Turnstile, when configured. Without a secret the endpoint still works so
  //    the site is usable before the widget is set up and the payload records
  //    that no challenge was verified.
  const secret = env.TURNSTILE_SECRET_KEY ?? '';
  const token = clean(form.get('cf-turnstile-response'), 4000);
  let turnstile: 'verified' | 'failed' | 'not-configured' = 'not-configured';

  if (secret) {
    const ip = request.headers.get('cf-connecting-ip');
    const passed = token ? await verifyTurnstile(secret, token, ip) : false;
    if (!passed) {
      return reply(request, 403, {
        ok: false,
        error: 'The spam check did not pass. Please reload the page and try again',
      });
    }
    turnstile = 'verified';
  }

  // 5. Build the payload. Zapier maps these keys straight onto Lofty fields.
  const payload = {
    name,
    email,
    phone: clean(form.get('phone'), 40),
    neighbourhood: clean(form.get('neighbourhood'), 80),
    intent: clean(form.get('intent'), 40),
    timeline: clean(form.get('timeline'), 40),
    message: clean(form.get('message'), MAX_FIELD),
    consent: true,
    consentText:
      'Agreed to be contacted by Kirby Chan & Co. about this enquiry and about Markham real estate, with the right to withdraw consent at any time',
    source: clean(form.get('source'), 60) || 'website',
    page: clean(form.get('page'), 200),
    turnstile,
    submittedAt: new Date().toISOString(),
    userAgent: (request.headers.get('user-agent') ?? '').slice(0, 300),
    country: request.headers.get('cf-ipcountry') ?? '',
  };

  const webhook = env.LEAD_WEBHOOK_URL ?? '';
  if (!webhook) {
    // Nothing to forward to yet. Do not pretend the lead was delivered.
    console.error('LEAD_WEBHOOK_URL is not set. Lead was validated but not forwarded.', {
      email: payload.email,
    });
    return reply(request, 500, {
      ok: false,
      error: 'The enquiry form is not connected yet. Please call 416-305-8008',
    });
  }

  try {
    const forwarded = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!forwarded.ok) {
      console.error('Webhook rejected the lead', forwarded.status);
      return reply(request, 502, {
        ok: false,
        error: 'We could not deliver that just now. Please call 416-305-8008',
      });
    }
  } catch (error) {
    console.error('Webhook request failed', error);
    return reply(request, 502, {
      ok: false,
      error: 'We could not deliver that just now. Please call 416-305-8008',
    });
  }

  return reply(request, 200, { ok: true });
};

/** A visitor who lands on this URL directly gets a clear answer, not a 404. */
export const onRequestGet = async (): Promise<Response> =>
  new Response('This endpoint accepts POST only.', {
    status: 405,
    headers: { allow: 'POST', 'content-type': 'text/plain; charset=utf-8' },
  });
