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
/** Failed sign ins or sign ups from one IP address in an hour. */
export const FAILS_PER_HOUR = 20;
export const TERMS_VERSION = '2026-09-30';
export const COOKIE = 'kc_vow';
const DAY = 864e5;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  pass_hash TEXT NOT NULL,
  pass_salt TEXT NOT NULL,
  pass_set_at INTEGER NOT NULL,
  verified_at INTEGER,
  terms_version TEXT NOT NULL,
  terms_at INTEGER NOT NULL,
  contact_ok INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  created_ip TEXT
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

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const randomHex = (bytes = 32) => hex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
export const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

/** PBKDF2 with SHA-256. 100,000 rounds is the most Cloudflare Workers allow. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256);
  return hex(bits);
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

export async function audit(db: D1, userId: number | null, action: string, detail: string, ip: string | null) {
  await db.prepare('INSERT INTO audit (user_id, at, action, detail, ip) VALUES (?, ?, ?, ?, ?)').bind(userId, Date.now(), action, detail.slice(0, 500), ip).run();
}

export async function countSince(db: D1, column: 'user_id' | 'ip', value: unknown, actions: string[], ms: number): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM audit WHERE ${column} = ? AND at > ? AND action IN (${actions.map(() => '?').join(',')})`)
    .bind(value, Date.now() - ms, ...actions)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** A single-use token for an emailed link. Only its hash is stored. */
export async function issueToken(db: D1, userId: number, kind: 'verify' | 'reset', hours: number): Promise<string> {
  const token = randomHex();
  await db.prepare('INSERT INTO tokens (hash, user_id, kind, expires_at) VALUES (?, ?, ?, ?)').bind(await sha256(token), userId, kind, Date.now() + hours * 36e5).run();
  return token;
}

export async function useToken(db: D1, token: string, kind: 'verify' | 'reset'): Promise<number | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const hash = await sha256(token);
  const row = await db.prepare('SELECT user_id, expires_at, used_at FROM tokens WHERE hash = ? AND kind = ?').bind(hash, kind).first<{ user_id: number; expires_at: number; used_at: number | null }>();
  if (!row || row.used_at || row.expires_at < Date.now()) return null;
  await db.prepare('UPDATE tokens SET used_at = ? WHERE hash = ?').bind(Date.now(), hash).run();
  return row.user_id;
}

/** Starts a session and returns the Set-Cookie header. It never outlives the password. */
export async function startSession(db: D1, user: Pick<User, 'id' | 'pass_set_at'>): Promise<string> {
  const token = randomHex();
  const expires = Math.min(Date.now() + SESSION_DAYS * DAY, user.pass_set_at + PASSWORD_DAYS * DAY);
  await db.prepare('INSERT INTO sessions (hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(await sha256(token), user.id, expires, Date.now()).run();
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor((expires - Date.now()) / 1000)}`;
}

export const endCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

const cookieToken = (request: Request) => request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})`))?.[1] ?? null;

/** The signed-in, verified user with a current password, or null. */
export async function currentUser(db: D1, request: Request): Promise<User | null> {
  const token = cookieToken(request);
  if (!token) return null;
  const user = await db
    .prepare('SELECT u.id, u.email, u.name, u.phone, u.pass_set_at, u.verified_at, u.contact_ok FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.hash = ? AND s.expires_at > ?')
    .bind(await sha256(token), Date.now())
    .first<User>();
  return user && user.verified_at && !passwordExpired(user) ? user : null;
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

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;

/** Posts from another site are refused, so a form elsewhere cannot act for a signed-in visitor. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
