/**
 * Accounts for the sold-prices section (a VOW under PropTx MLS Rules, Article 8). Server side only,
 * used by functions/api/vow/[action].ts and functions/api/sold.ts.
 *
 * What the rules ask for, and where it lives here:
 * - name and a verified email, a username and password (8.07): the email is the username, and the
 *   account only works after the emailed link is pressed. That email also confirms the Terms (8.07b).
 * - passwords last no more than 90 days (8.08): PASSWORD_DAYS, checked at every sign in and search.
 * - records kept 180 days after expiry (8.08): accounts are never deleted by this code.
 * - an audit trail and protection against scraping (8.13): the audit table and the limits below.
 *
 * Security. Everything below is keyed from VOW_SECRET, a Cloudflare secret that never leaves
 * Cloudflare and is not in the database, so a copy of the database alone reveals nothing readable:
 * - names, emails and phone numbers are encrypted with AES-256-GCM;
 * - emails and IP addresses are looked up by a keyed hash (HMAC-SHA-256), never stored in the clear;
 * - passwords are hashed with PBKDF2-SHA-256 and a per-account salt, then HMAC'd with a secret pepper;
 * - session and emailed-link tokens are 256-bit random values, stored only as SHA-256 hashes.
 * Changing VOW_SECRET makes every account unreadable, so it must never be changed or deleted.
 */

/** The parts of Cloudflare D1 this file uses. */
export interface D1 {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      run(): Promise<unknown>;
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    };
  };
}

export interface VowEnv {
  VOW_DB?: D1;
  VOW_SECRET?: string;
  PROPTX_VOW_TOKEN?: string;
  RESEND_API_KEY?: string;
  VOW_EMAIL_FROM?: string;
  LEAD_WEBHOOK_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export const PASSWORD_DAYS = 90;
export const SESSION_DAYS = 30;
export const VERIFY_HOURS = 48;
export const RESET_HOURS = 2;
/** Searches one account can run in 24 hours. Far above what a buyer needs, well below a scraper. */
export const SEARCHES_PER_DAY = 300;
/** Sign ups, reset requests and wrong passwords from one IP address in an hour. */
export const FAILS_PER_HOUR = 20;
/** Wrong passwords for one account in an hour, from any number of IP addresses. */
export const ACCOUNT_FAILS_PER_HOUR = 10;
export const TERMS_VERSION = '2026-09-30';
/** __Host- makes the browser refuse the cookie unless it is Secure, for this exact host, on path /. */
export const COOKIE = '__Host-kc_vow';
const DAY = 864e5;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_hash TEXT NOT NULL UNIQUE,
  email_enc TEXT NOT NULL,
  name_enc TEXT NOT NULL,
  phone_enc TEXT,
  pass_hash TEXT NOT NULL,
  pass_salt TEXT NOT NULL,
  pass_set_at INTEGER NOT NULL,
  verified_at INTEGER,
  terms_version TEXT NOT NULL,
  terms_at INTEGER NOT NULL,
  contact_ok INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tokens (
  hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
  hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  at INTEGER NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS audit_user_at ON audit (user_id, at);
CREATE INDEX IF NOT EXISTS audit_ip_at ON audit (ip, at);
CREATE INDEX IF NOT EXISTS audit_detail_at ON audit (detail, at);
`;

let ready: Promise<unknown> | null = null;
/** Creates the tables on first use, so setting up the database needs no SQL console. */
export const ensureSchema = (db: D1) =>
  (ready ??= (async () => {
    for (const sql of SCHEMA.split(';').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)) await db.prepare(sql).bind().run();
  })().catch((e) => {
    ready = null;
    throw e;
  }));

export type User = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  pass_set_at: number;
  verified_at: number | null;
  contact_ok: number;
};

/** The columns loadUser needs. */
export const USER_COLS = 'id, email_enc, name_enc, phone_enc, pass_set_at, verified_at, contact_ok';
export type UserRow = { id: number; email_enc: string; name_enc: string; phone_enc: string | null; pass_set_at: number; verified_at: number | null; contact_ok: number };

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const randomHex = (bytes = 32) => hex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
export const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

export type Keys = { aes: CryptoKey; mac: CryptoKey; pepper: CryptoKey };
let keyCache: { secret: string; keys: Promise<Keys> } | null = null;

/** The three working keys, derived from VOW_SECRET with HKDF. Null if the secret is missing or too short. */
export function keys(secret: string | undefined): Promise<Keys> | null {
  let raw: Uint8Array;
  try {
    raw = unb64((secret ?? '').trim());
  } catch {
    return null;
  }
  if (raw.length < 32) return null;
  const cached = keyCache;
  if (cached && cached.secret === secret) return cached.keys;
  const derive = async (): Promise<Keys> => {
    const master = await crypto.subtle.importKey('raw', raw as BufferSource, 'HKDF', false, ['deriveKey']);
    const hkdf = (info: string) => ({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('kirbychanmarkham-vow'), info: enc.encode(info) });
    const hmac = { name: 'HMAC', hash: 'SHA-256', length: 256 };
    return {
      aes: await crypto.subtle.deriveKey(hkdf('aes'), master, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
      mac: await crypto.subtle.deriveKey(hkdf('lookup'), master, hmac, false, ['sign']),
      pepper: await crypto.subtle.deriveKey(hkdf('pepper'), master, hmac, false, ['sign']),
    };
  };
  const fresh = { secret: secret!, keys: derive() };
  keyCache = fresh;
  return fresh.keys;
}

/** AES-256-GCM with a fresh random 96-bit IV per value. Stored as "iv.ciphertext" in base64. */
export async function seal(k: Keys, text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return `${b64(iv)}.${b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k.aes, enc.encode(text)))}`;
}

export async function unseal(k: Keys, sealed: string): Promise<string> {
  const [iv, ct] = sealed.split('.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, k.aes, unb64(ct)));
}

/** Keyed hash for looking up an email or counting an IP without storing either. */
export const blind = async (k: Keys, value: string) => hex(await crypto.subtle.sign('HMAC', k.mac, enc.encode(value.trim().toLowerCase())));

export async function loadUser(k: Keys, r: UserRow): Promise<User> {
  return {
    id: r.id,
    email: await unseal(k, r.email_enc),
    name: await unseal(k, r.name_enc),
    phone: r.phone_enc ? await unseal(k, r.phone_enc) : null,
    pass_set_at: r.pass_set_at,
    verified_at: r.verified_at,
    contact_ok: r.contact_ok,
  };
}

/** PBKDF2-SHA-256 (100,000 rounds, the most Cloudflare Workers allow) then HMAC with the secret pepper. */
export async function hashPassword(k: Keys, password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, key, 256);
  return hex(await crypto.subtle.sign('HMAC', k.pepper, bits));
}

/** Constant-time comparison, so a wrong password takes as long as a nearly right one. */
export function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const passwordExpired = (u: Pick<User, 'pass_set_at'>, now = Date.now()) => now - u.pass_set_at > PASSWORD_DAYS * DAY;
export const passwordExpires = (u: Pick<User, 'pass_set_at'>) => new Date(u.pass_set_at + PASSWORD_DAYS * DAY);

/** The IP address as a keyed hash: enough to rate limit, useless to anyone reading the log. */
export const ipTag = async (k: Keys, request: Request) => {
  const ip = request.headers.get('cf-connecting-ip');
  return ip ? blind(k, ip) : null;
};

export async function audit(db: D1, userId: number | null, action: string, detail: string, ip: string | null) {
  await db.prepare('INSERT INTO audit (user_id, at, action, detail, ip) VALUES (?, ?, ?, ?, ?)').bind(userId, Date.now(), action, detail.slice(0, 500), ip).run();
}

export async function countSince(db: D1, column: 'user_id' | 'ip' | 'detail', value: unknown, actions: string[], ms: number): Promise<number> {
  if (value === null || value === undefined) return 0;
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM audit WHERE ${column} = ? AND at > ? AND action IN (${actions.map(() => '?').join(',')})`)
    .bind(value, Date.now() - ms, ...actions)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** A single-use token for an emailed link. Only its hash is stored. */
export async function issueToken(db: D1, userId: number, kind: 'verify' | 'reset', hours: number): Promise<string> {
  const token = randomHex();
  // A new link replaces any older unused one of the same kind.
  await db.prepare('UPDATE tokens SET used_at = ? WHERE user_id = ? AND kind = ? AND used_at IS NULL').bind(Date.now(), userId, kind).run();
  await db.prepare('INSERT INTO tokens (hash, user_id, kind, expires_at) VALUES (?, ?, ?, ?)').bind(await sha256(token), userId, kind, Date.now() + hours * 36e5).run();
  return token;
}

export async function useToken(db: D1, token: string, kind: 'verify' | 'reset'): Promise<number | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  // One statement, so two requests racing with the same link cannot both succeed.
  const row = await db
    .prepare('UPDATE tokens SET used_at = ? WHERE hash = ? AND kind = ? AND used_at IS NULL AND expires_at > ? RETURNING user_id')
    .bind(Date.now(), await sha256(token), kind, Date.now())
    .first<{ user_id: number }>();
  return row?.user_id ?? null;
}

/** Starts a session and returns the Set-Cookie header. It never outlives the password. */
export async function startSession(db: D1, user: Pick<User, 'id' | 'pass_set_at'>): Promise<string> {
  const token = randomHex();
  const expires = Math.min(Date.now() + SESSION_DAYS * DAY, user.pass_set_at + PASSWORD_DAYS * DAY);
  await db.prepare('INSERT INTO sessions (hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(await sha256(token), user.id, expires, Date.now()).run();
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor((expires - Date.now()) / 1000)}`;
}

export const endCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

const cookieToken = (request: Request) => request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-kc_vow=([0-9a-f]{64})/)?.[1] ?? null;

/** The signed-in, verified user with a current password, or null. */
export async function currentUser(db: D1, k: Keys, request: Request): Promise<User | null> {
  const token = cookieToken(request);
  if (!token) return null;
  const row = await db
    .prepare(`SELECT ${USER_COLS.split(', ').map((c) => 'a.' + c).join(', ')} FROM sessions s JOIN accounts a ON a.id = s.user_id WHERE s.hash = ? AND s.expires_at > ?`)
    .bind(await sha256(token), Date.now())
    .first<UserRow>();
  return row && row.verified_at && !passwordExpired(row) ? loadUser(k, row) : null;
}

export async function endSession(db: D1, request: Request) {
  const token = cookieToken(request);
  if (token) await db.prepare('DELETE FROM sessions WHERE hash = ?').bind(await sha256(token)).run();
}

export async function sendEmail(env: VowEnv, to: string, subject: string, text: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.VOW_EMAIL_FROM) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.VOW_EMAIL_FROM, to: [to], subject, text }),
  });
  if (!res.ok) console.error('Resend rejected an email', res.status, (await res.text()).slice(0, 200));
  return res.ok;
}

export const isEmail = (v: string) => /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(v) && v.length <= 254;

/**
 * A person's name: letters in any language, spaces, apostrophes, periods and hyphens. No links, no
 * symbols, so nobody can use the sign-up form to put their own text or a link into our emails.
 */
export const isName = (v: string) => /^[\p{L}\p{M}][\p{L}\p{M}' .-]{1,79}$/u.test(v);

/** Posts must come from this site. A browser always sends Origin on a POST from a page. */
export function sameOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}
