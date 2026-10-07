/**
 * POST /api/lead
 *
 * Cloudflare Pages Function. Validates the enquiry, screens obvious spam,
 * verifies the Cloudflare Turnstile token when one is configured, keeps a copy
 * in the database (VOW_DB, table `leads`), then emails the lead to the leads
 * inbox (site.json leadsEmail) and, if LEAD_WEBHOOK_URL is set, also forwards it
 * there as JSON. A stored enquiry counts as delivered: the visitor is only told
 * to call when the database, the email and the webhook have all failed.
 *
 * Secrets live only in the Cloudflare dashboard. Nothing in src/ reads
 * TURNSTILE_SECRET_KEY or LEAD_WEBHOOK_URL, so neither can reach the browser.
 */

import site from '../../src/data/site.json';
import { sendEmail, type D1 } from '../../src/lib/vow';

interface Env {
  LEAD_WEBHOOK_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  VOW_EMAIL_FROM?: string;
  /** Every enquiry is also kept here, so one is never lost when email delivery fails. */
  VOW_DB?: D1;
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
    address: clean(form.get('address'), 200),
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

  const labels: [string, string][] = [
    ['Name', payload.name],
    ['Email', payload.email],
    ['Phone', payload.phone || 'not given'],
    ['Property address', payload.address],
    ['Neighbourhood', payload.neighbourhood],
    ['Looking to', payload.intent],
    ['Timeline', payload.timeline],
    ['Page', payload.page],
    ['Form', payload.source],
    ['Message', payload.message],
  ];
  const body = [
    'A new enquiry from kirbychanmarkham.com. Reply to this email to write to them.',
    '',
    ...labels.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    '',
    `They agreed to be contacted about this enquiry and about Markham real estate.`,
    `Received: ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Toronto' })}`,
  ].join('\n');

  // Keep a copy first. If email is down, the enquiry is still on record.
  let stored = false;
  let id: unknown;
  if (env.VOW_DB) {
    try {
      await env.VOW_DB.prepare('CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, received_at TEXT NOT NULL, source TEXT, page TEXT, name TEXT, email TEXT, phone TEXT, payload TEXT NOT NULL, emailed INTEGER NOT NULL DEFAULT 0)').bind().run();
      const row = await env.VOW_DB.prepare('INSERT INTO leads (received_at, source, page, name, email, phone, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING id')
        .bind(payload.submittedAt, payload.source, payload.page, payload.name, payload.email, payload.phone, JSON.stringify(payload))
        .first<{ id: number }>();
      id = row?.id;
      stored = true;
    } catch (error) {
      // Deliberately no personal data in the log line.
      console.error('Lead not stored', error instanceof Error ? error.message : 'unknown error');
    }
  }

  // Email is the main delivery. The webhook is optional, for a CRM later.
  let delivered = await sendEmail(env, site.leadsEmail, `New website enquiry: ${name}`, body, email).catch((error) => {
    console.error('Lead email failed', error);
    return false;
  });

  const webhook = env.LEAD_WEBHOOK_URL ?? '';
  if (webhook) {
    try {
      const forwarded = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (forwarded.ok) delivered = true;
      else console.error('Webhook rejected the lead', forwarded.status);
    } catch (error) {
      console.error('Webhook request failed', error);
    }
  }

  // Mark the copy, so the rows still waiting for a person are the ones with emailed = 0.
  if (stored && delivered && id != null) {
    await env.VOW_DB!.prepare('UPDATE leads SET emailed = 1 WHERE id = ?1').bind(id).run().catch(() => undefined);
  } else if (stored && !delivered) {
    console.error('Lead stored but not emailed or forwarded. See the leads table, emailed = 0, id', id);
  }

  if (!delivered && !stored) {
    // Deliberately no personal data in the log line.
    return reply(request, 502, {
      ok: false,
      error: 'We could not deliver that just now. Please call (647) 249-7105',
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
