/**
 * /api/vow/me        GET   who is signed in, and whether sold prices are switched on
 * /api/vow/register  POST  name, email, phone, password, terms, contact
 * /api/vow/verify    GET   ?token= from the confirmation email, then back to /sold/
 * /api/vow/login     POST  email, password
 * /api/vow/logout    POST
 * /api/vow/forgot    POST  email
 * /api/vow/reset     POST  token, password
 *
 * Accounts for the sold-prices section. The rules behind each step are in src/lib/vow.ts.
 */
import {
  FAILS_PER_HOUR, RESET_HOURS, TERMS_VERSION, VERIFY_HOURS, audit, countSince, currentUser, endCookie, endSession, ensureSchema,
  hashPassword, isEmail, issueToken, passwordExpired, passwordExpires, randomHex, same, sameOrigin, sendEmail, startSession, useToken,
  type User, type VowEnv,
} from '../../../src/lib/vow';

interface Context {
  request: Request;
  env: VowEnv;
  params: { action: string };
}

const SIGNATURE = 'Kirby Chan & Co. Real Estate Team | eXp Realty Brokerage\n416-305-8008 | kirbychanmarkham.com';

const json = (body: unknown, status = 200, cookie?: string) => {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  if (cookie) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
};
const text = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const configured = (env: VowEnv) => !!(env.VOW_DB && env.PROPTX_VOW_TOKEN && env.RESEND_API_KEY && env.VOW_EMAIL_FROM);

async function turnstileOk(env: VowEnv, token: string, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  return res.ok && ((await res.json()) as { success?: boolean }).success === true;
}

const verifyEmail = (origin: string, name: string, token: string) =>
  `Hello ${name},

Press this link to confirm your email address and see Markham sold prices:
${origin}/api/vow/verify?token=${token}

The link works for ${VERIFY_HOURS} hours.

When you created your account on ${new Date().toLocaleDateString('en-CA', { dateStyle: 'long', timeZone: 'America/Toronto' })} you agreed to our Terms of Use for sold listings. You can read them at any time:
${origin}/sold/terms/

If you did not ask for this, you can ignore this email and no account will be opened.

${SIGNATURE}`;

const resetEmail = (origin: string, name: string, token: string, expired: boolean) =>
  `Hello ${name},

${expired ? 'For your security, passwords for sold prices last 90 days and yours has expired. ' : ''}Press this link to choose a new password:
${origin}/sold/?reset=${token}

The link works for ${RESET_HOURS} hours. If you did not ask for this, you can ignore this email.

${SIGNATURE}`;

/** Sends the new account to the same place as website enquiries, once the email is confirmed. */
async function forwardLead(env: VowEnv, u: User) {
  if (!env.LEAD_WEBHOOK_URL) return;
  await fetch(env.LEAD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: u.name,
      email: u.email,
      phone: u.phone ?? '',
      address: '',
      neighbourhood: '',
      intent: 'Sold prices account',
      timeline: '',
      message: 'Created an account to see Markham sold prices.',
      consent: !!u.contact_ok,
      consentText: u.contact_ok ? 'Agreed to be contacted by Kirby Chan & Co. about Markham real estate, with the right to withdraw consent at any time' : '',
      source: 'sold-prices-account',
      page: '/sold/',
      submittedAt: new Date().toISOString(),
    }),
  }).catch((e) => console.error('Lead webhook failed', e));
}

const USER_COLS = 'id, email, name, phone, pass_set_at, verified_at, contact_ok';

export async function onRequest({ request, env, params }: Context): Promise<Response> {
  const action = params.action;
  if (!configured(env)) return json({ configured: false }, action === 'me' ? 200 : 503);
  const db = env.VOW_DB!;
  await ensureSchema(db);
  const ip = request.headers.get('cf-connecting-ip');
  const origin = new URL(request.url).origin;

  if (request.method === 'GET' && action === 'me') {
    const u = await currentUser(db, request);
    return json({ configured: true, user: u && { name: u.name, email: u.email, passwordExpires: passwordExpires(u).toISOString() } });
  }

  if (request.method === 'GET' && action === 'verify') {
    const userId = await useToken(db, new URL(request.url).searchParams.get('token') ?? '', 'verify');
    if (!userId) return Response.redirect(`${origin}/sold/?link=expired`, 303);
    const u = (await db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).bind(userId).first<User>())!;
    if (!u.verified_at) {
      await db.prepare('UPDATE users SET verified_at = ? WHERE id = ?').bind(Date.now(), userId).run();
      await forwardLead(env, u);
    }
    await audit(db, userId, 'verify', '', ip);
    const cookie = await startSession(db, u);
    return new Response(null, { status: 303, headers: { location: '/sold/?welcome=1', 'set-cookie': cookie } });
  }

  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!sameOrigin(request)) return json({ error: 'origin' }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'bad-request' }, 400);
  }

  if (action === 'logout') {
    const u = await currentUser(db, request);
    await endSession(db, request);
    if (u) await audit(db, u.id, 'logout', '', ip);
    return json({ ok: true }, 200, endCookie);
  }

  if ((await countSince(db, 'ip', ip, ['login-fail', 'register', 'forgot'], 36e5)) >= FAILS_PER_HOUR) {
    return json({ error: 'slow-down' }, 429);
  }

  const email = text(body.email, 254).toLowerCase();

  if (action === 'register') {
    if (text(body.company_website)) return json({ ok: true }); // honeypot
    const name = text(body.name, 120);
    const password = typeof body.password === 'string' ? body.password : '';
    if (name.length < 2) return json({ error: 'name' }, 422);
    if (!isEmail(email)) return json({ error: 'email' }, 422);
    if (password.length < 8 || password.length > 200) return json({ error: 'password' }, 422);
    if (body.terms !== true) return json({ error: 'terms' }, 422);
    if (!(await turnstileOk(env, text(body.turnstile, 4000), ip))) return json({ error: 'spam-check' }, 403);
    await audit(db, null, 'register', email, ip);

    const existing = await db.prepare(`SELECT ${USER_COLS} FROM users WHERE email = ?`).bind(email).first<User>();
    if (existing?.verified_at) {
      // Same answer as a new sign up, so the form never reveals who has an account.
      await sendEmail(env, email, 'You already have an account for Markham sold prices', `Hello ${existing.name},\n\nSomeone, probably you, tried to create an account with this email. You already have one. Sign in at ${origin}/sold/ or choose a new password with "Forgot your password?" on that page.\n\n${SIGNATURE}`);
      return json({ ok: true });
    }
    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    const now = Date.now();
    let userId = existing?.id;
    if (existing) {
      await db.prepare('UPDATE users SET name = ?, phone = ?, pass_hash = ?, pass_salt = ?, pass_set_at = ?, terms_version = ?, terms_at = ?, contact_ok = ? WHERE id = ?')
        .bind(name, text(body.phone, 40) || null, hash, salt, now, TERMS_VERSION, now, body.contact === true ? 1 : 0, existing.id).run();
    } else {
      await db.prepare('INSERT INTO users (email, name, phone, pass_hash, pass_salt, pass_set_at, terms_version, terms_at, contact_ok, created_at, created_ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(email, name, text(body.phone, 40) || null, hash, salt, now, TERMS_VERSION, now, body.contact === true ? 1 : 0, now, ip).run();
      userId = (await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: number }>())!.id;
    }
    const token = await issueToken(db, userId!, 'verify', VERIFY_HOURS);
    const sent = await sendEmail(env, email, 'Confirm your email to see Markham sold prices', verifyEmail(origin, name, token));
    return sent ? json({ ok: true }) : json({ error: 'email-failed' }, 503);
  }

  if (action === 'login') {
    const password = typeof body.password === 'string' ? body.password : '';
    const row = await db.prepare(`SELECT ${USER_COLS}, pass_hash, pass_salt FROM users WHERE email = ?`).bind(email).first<User & { pass_hash: string; pass_salt: string }>();
    // Hash even when there is no such account, so the response time gives nothing away.
    const hash = await hashPassword(password, row?.pass_salt ?? 'no-account');
    if (!row || !same(hash, row.pass_hash)) {
      await audit(db, row?.id ?? null, 'login-fail', email, ip);
      return json({ error: 'wrong' }, 401);
    }
    if (!row.verified_at) {
      const token = await issueToken(db, row.id, 'verify', VERIFY_HOURS);
      await sendEmail(env, email, 'Confirm your email to see Markham sold prices', verifyEmail(origin, row.name, token));
      return json({ error: 'unverified' }, 403);
    }
    if (passwordExpired(row)) {
      const token = await issueToken(db, row.id, 'reset', RESET_HOURS);
      await sendEmail(env, email, 'Choose a new password for Markham sold prices', resetEmail(origin, row.name, token, true));
      await audit(db, row.id, 'login-expired', '', ip);
      return json({ error: 'expired' }, 403);
    }
    await audit(db, row.id, 'login', '', ip);
    return json({ ok: true }, 200, await startSession(db, row));
  }

  if (action === 'forgot') {
    await audit(db, null, 'forgot', email, ip);
    const row = await db.prepare(`SELECT ${USER_COLS} FROM users WHERE email = ?`).bind(email).first<User>();
    if (row) {
      const token = await issueToken(db, row.id, 'reset', RESET_HOURS);
      await sendEmail(env, email, 'Choose a new password for Markham sold prices', resetEmail(origin, row.name, token, false));
    }
    return json({ ok: true });
  }

  if (action === 'reset') {
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length < 8 || password.length > 200) return json({ error: 'password' }, 422);
    const userId = await useToken(db, text(body.token, 64), 'reset');
    if (!userId) return json({ error: 'link-expired' }, 400);
    const before = await db.prepare('SELECT verified_at FROM users WHERE id = ?').bind(userId).first<{ verified_at: number | null }>();
    const salt = randomHex(16);
    const now = Date.now();
    // Pressing an emailed link proves the address, so a reset also confirms the email.
    await db.prepare('UPDATE users SET pass_hash = ?, pass_salt = ?, pass_set_at = ?, verified_at = COALESCE(verified_at, ?) WHERE id = ?')
      .bind(await hashPassword(password, salt), salt, now, now, userId).run();
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
    await audit(db, userId, 'reset', '', ip);
    const u = (await db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).bind(userId).first<User>())!;
    if (!before?.verified_at) await forwardLead(env, u);
    return json({ ok: true }, 200, await startSession(db, u));
  }

  return json({ error: 'not-found' }, 404);
}
