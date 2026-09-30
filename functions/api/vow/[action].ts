/**
 * /api/vow/me        GET   who is signed in, and whether sold prices are switched on
 * /api/vow/register  POST  name, email, phone, password, terms, contact, turnstile
 * /api/vow/verify    POST  token from the confirmation email
 * /api/vow/login     POST  email, password
 * /api/vow/logout    POST
 * /api/vow/forgot    POST  email, turnstile
 * /api/vow/reset     POST  token, password
 *
 * Accounts for the sold-prices section. The rules behind each step and the encryption are in
 * src/lib/vow.ts. Emailed links point at /sold/#verify= or /sold/#reset=: the part after # never
 * leaves the browser, so the token is not sent to Google Analytics, logs or any other site, and a
 * mail scanner that opens the link cannot use it up. The page then posts it here.
 */
import {
  ACCOUNT_FAILS_PER_HOUR, FAILS_PER_HOUR, RESET_HOURS, TERMS_VERSION, USER_COLS, VERIFY_HOURS, audit, blind, countSince, currentUser,
  endCookie, endSession, ensureSchema, hashPassword, ipTag, isEmail, isName, issueToken, keys, loadUser, passwordExpired, passwordExpires,
  randomHex, same, sameOrigin, seal, sendEmail, startSession, useToken, type Keys, type User, type UserRow, type VowEnv,
} from '../../../src/lib/vow';
import site from '../../../src/data/site.json';

interface Context {
  request: Request;
  env: VowEnv;
  params: { action: string };
  waitUntil(p: Promise<unknown>): void;
}

const SIGNATURE = 'Kirby Chan & Co. Real Estate Team | eXp Realty Brokerage\n416-305-8008 | kirbychanmarkham.com';
/** Sign ups and reset requests from one IP address in an hour. */
const SENDS_PER_HOUR = 10;

const json = (body: unknown, status = 200, cookie?: string) => {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  if (cookie) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
};
const text = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const password = (v: unknown) => (typeof v === 'string' && v.length >= 8 && v.length <= 200 ? v : null);
/** Everything must be set, including the spam check: without it the sign-up form could be used to send our emails to anyone. */
const configured = (env: VowEnv) =>
  !!(env.VOW_DB && keys(env.VOW_SECRET) && env.PROPTX_VOW_TOKEN && env.RESEND_API_KEY && env.VOW_EMAIL_FROM && env.TURNSTILE_SECRET_KEY);

async function turnstileOk(env: VowEnv, token: string, request: Request): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY!);
  body.append('response', token);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  return res.ok && ((await res.json()) as { success?: boolean }).success === true;
}

const today = () => new Date().toLocaleDateString('en-CA', { dateStyle: 'long', timeZone: 'America/Toronto' });

const verifyEmail = (origin: string, name: string, token: string) =>
  `Hello ${name},

Press this link to confirm your email address and see Markham sold prices:
${origin}/sold/#verify=${token}

The link works for ${VERIFY_HOURS} hours.

When you created your account on ${today()} you agreed to our Terms of Use for sold listings. You can read them at any time:
${origin}/sold/terms/

If you did not ask for this, you can ignore this email and no account will be opened.

${SIGNATURE}`;

const resetEmail = (origin: string, name: string, token: string, why: 'expired' | 'forgot' | 'finish') =>
  `Hello ${name},

${
  why === 'expired'
    ? 'For your security, passwords for sold prices last 90 days and yours has expired. '
    : why === 'finish'
      ? 'Someone, probably you, started creating an account for Markham sold prices with this email. '
      : ''
}Press this link to choose ${why === 'finish' ? 'your' : 'a new'} password:
${origin}/sold/#reset=${token}

The link works for ${RESET_HOURS} hours. If you did not ask for this, you can ignore this email.${
  why === 'finish' ? `\n\nBy choosing a password on ${today()} you agree to our Terms of Use for sold listings: ${origin}/sold/terms/` : ''
}

${SIGNATURE}`;

/** A confirmed account is a lead: it goes to the leads inbox, and to the lead webhook too if one is set. */
async function forwardLead(env: VowEnv, u: User) {
  await sendEmail(
    env,
    site.leadsEmail,
    `New sold-prices account: ${u.name}`,
    `Someone created an account to see Markham sold prices on kirbychanmarkham.com. Reply to this email to write to them.

Name: ${u.name}
Email: ${u.email}
Phone: ${u.phone || 'not given'}
May we contact them about Markham real estate? ${u.contact_ok ? 'Yes, they ticked the box.' : 'No, they did not tick the box. Do not send marketing.'}
Confirmed: ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Toronto' })}`,
    u.email,
  );
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

async function byEmail(db: NonNullable<VowEnv['VOW_DB']>, k: Keys, email: string) {
  return db.prepare(`SELECT ${USER_COLS}, pass_hash, pass_salt FROM accounts WHERE email_hash = ?`).bind(await blind(k, email)).first<UserRow & { pass_hash: string; pass_salt: string }>();
}

export async function onRequest({ request, env, params, waitUntil }: Context): Promise<Response> {
  const action = params.action;
  if (!configured(env)) return json({ configured: false }, action === 'me' ? 200 : 503);
  const db = env.VOW_DB!;
  const k = await keys(env.VOW_SECRET)!;
  await ensureSchema(db);
  const origin = new URL(request.url).origin;

  if (request.method === 'GET' && action === 'me') {
    const u = await currentUser(db, k, request);
    return json({ configured: true, user: u && { name: u.name, passwordExpires: passwordExpires(u).toISOString() } });
  }

  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  // Only this site's own pages may post here, as JSON.
  if (!sameOrigin(request) || !(request.headers.get('content-type') ?? '').startsWith('application/json')) return json({ error: 'origin' }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  const ip = await ipTag(k, request);

  if (action === 'logout') {
    const u = await currentUser(db, k, request);
    await endSession(db, request);
    if (u) await audit(db, u.id, 'logout', '', ip);
    return json({ ok: true }, 200, endCookie);
  }

  if (action === 'verify') {
    const userId = await useToken(db, text(body.token, 64), 'verify');
    if (!userId) return json({ error: 'link-expired' }, 400);
    const row = (await db.prepare(`SELECT ${USER_COLS} FROM accounts WHERE id = ?`).bind(userId).first<UserRow>())!;
    if (!row.verified_at) {
      await db.prepare('UPDATE accounts SET verified_at = ? WHERE id = ?').bind(Date.now(), userId).run();
      waitUntil(loadUser(k, row).then((u) => forwardLead(env, u)));
    }
    await audit(db, userId, 'verify', '', ip);
    return json({ ok: true }, 200, await startSession(db, row));
  }

  const email = text(body.email, 254).toLowerCase();

  if (action === 'register' || action === 'forgot') {
    if (text(body.company_website)) return json({ ok: true }); // honeypot
    if ((await countSince(db, 'ip', ip, ['register', 'forgot'], 36e5)) >= SENDS_PER_HOUR) return json({ error: 'slow-down' }, 429);
    if (!(await turnstileOk(env, text(body.turnstile, 4000), request))) return json({ error: 'spam-check' }, 403);
  }

  if (action === 'register') {
    const name = text(body.name, 80);
    const pw = password(body.password);
    if (!isName(name)) return json({ error: 'name' }, 422);
    if (!isEmail(email)) return json({ error: 'email' }, 422);
    if (!pw) return json({ error: 'password' }, 422);
    if (body.terms !== true) return json({ error: 'terms' }, 422);
    await audit(db, null, 'register', '', ip);

    const salt = randomHex(16);
    // Hashed whether or not the account exists, so the response time gives nothing away.
    const hash = await hashPassword(k, pw, salt);
    const existing = await byEmail(db, k, email);
    if (existing) {
      // Never change an existing account from this form: that would let a stranger set the password
      // on an account whose owner has not confirmed it yet. Email the owner instead.
      const owner = await unsealName(k, existing);
      waitUntil(
        existing.verified_at
          ? sendEmail(env, email, 'You already have an account for Markham sold prices', `Hello ${owner},\n\nSomeone, probably you, tried to create an account with this email. You already have one. Sign in at ${origin}/sold/ or choose a new password with "Forgot your password?" on that page.\n\n${SIGNATURE}`)
          : issueToken(db, existing.id, 'reset', RESET_HOURS).then((t) => sendEmail(env, email, 'Finish creating your account for Markham sold prices', resetEmail(origin, owner, t, 'finish'))),
      );
      return json({ ok: true });
    }
    const now = Date.now();
    const phone = text(body.phone, 40);
    const row = await db
      .prepare('INSERT INTO accounts (email_hash, email_enc, name_enc, phone_enc, pass_hash, pass_salt, pass_set_at, terms_version, terms_at, contact_ok, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id')
      .bind(await blind(k, email), await seal(k, email), await seal(k, name), phone ? await seal(k, phone) : null, hash, salt, now, TERMS_VERSION, now, body.contact === true ? 1 : 0, now)
      .first<{ id: number }>();
    const token = await issueToken(db, row!.id, 'verify', VERIFY_HOURS);
    // Sent after the reply, like the existing-account emails above, so both take the same time.
    waitUntil(sendEmail(env, email, 'Confirm your email to see Markham sold prices', verifyEmail(origin, name, token)));
    return json({ ok: true });
  }

  if (action === 'login') {
    if ((await countSince(db, 'ip', ip, ['login-fail'], 36e5)) >= FAILS_PER_HOUR) return json({ error: 'slow-down' }, 429);
    const pw = typeof body.password === 'string' && body.password.length <= 200 ? body.password : '';
    const row = await byEmail(db, k, email);
    // Wrong passwords before the last password change do not count: resetting unlocks the account.
    if (row && (await countSince(db, 'user_id', row.id, ['login-fail'], Math.min(36e5, Date.now() - row.pass_set_at))) >= ACCOUNT_FAILS_PER_HOUR) {
      // Someone is guessing this account's password. Lock it for the hour; the owner can still reset.
      return json({ error: 'locked' }, 429);
    }
    // Hash even when there is no such account, so the response time gives nothing away.
    const hash = await hashPassword(k, pw, row?.pass_salt ?? 'no-account');
    if (!row || !same(hash, row.pass_hash)) {
      await audit(db, row?.id ?? null, 'login-fail', '', ip);
      return json({ error: 'wrong' }, 401);
    }
    const u = await loadUser(k, row);
    if (!row.verified_at) {
      const token = await issueToken(db, row.id, 'verify', VERIFY_HOURS);
      waitUntil(sendEmail(env, u.email, 'Confirm your email to see Markham sold prices', verifyEmail(origin, u.name, token)));
      return json({ error: 'unverified' }, 403);
    }
    if (passwordExpired(row)) {
      const token = await issueToken(db, row.id, 'reset', RESET_HOURS);
      waitUntil(sendEmail(env, u.email, 'Choose a new password for Markham sold prices', resetEmail(origin, u.name, token, 'expired')));
      await audit(db, row.id, 'login-expired', '', ip);
      return json({ error: 'expired' }, 403);
    }
    await audit(db, row.id, 'login', '', ip);
    return json({ ok: true }, 200, await startSession(db, row));
  }

  if (action === 'forgot') {
    await audit(db, null, 'forgot', '', ip);
    const row = await byEmail(db, k, email);
    // Sent after the reply, so the response time is the same whether or not the account exists.
    if (row) {
      waitUntil(
        (async () => {
          const u = await loadUser(k, row);
          const token = await issueToken(db, row.id, 'reset', RESET_HOURS);
          await sendEmail(env, u.email, 'Choose a new password for Markham sold prices', resetEmail(origin, u.name, token, 'forgot'));
        })(),
      );
    }
    return json({ ok: true });
  }

  if (action === 'reset') {
    const pw = password(body.password);
    if (!pw) return json({ error: 'password' }, 422);
    const userId = await useToken(db, text(body.token, 64), 'reset');
    if (!userId) return json({ error: 'link-expired' }, 400);
    const before = (await db.prepare(`SELECT ${USER_COLS} FROM accounts WHERE id = ?`).bind(userId).first<UserRow>())!;
    const salt = randomHex(16);
    const now = Date.now();
    // Pressing an emailed link proves the address, so a reset also confirms the email.
    await db.prepare('UPDATE accounts SET pass_hash = ?, pass_salt = ?, pass_set_at = ?, verified_at = COALESCE(verified_at, ?) WHERE id = ?')
      .bind(await hashPassword(k, pw, salt), salt, now, now, userId).run();
    // A new password signs out every other device and cancels every other emailed link.
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
    await db.prepare('UPDATE tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL').bind(now, userId).run();
    await audit(db, userId, 'reset', '', ip);
    if (!before.verified_at) waitUntil(loadUser(k, before).then((u) => forwardLead(env, u)));
    return json({ ok: true }, 200, await startSession(db, { id: userId, pass_set_at: now }));
  }

  return json({ error: 'not-found' }, 404);
}

const unsealName = (k: Keys, r: UserRow) => loadUser(k, r).then((u) => u.name);
