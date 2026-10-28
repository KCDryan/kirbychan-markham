/**
 * The one sign in shared by /upload/ (blog posts) and /uploadservice/ (service pages): the same
 * password, the same session table and the same cookie. Sessions are made by /api/upload/login.
 */
import { sha256 } from './vow.ts';
import type { UploadEnv } from './uploads.ts';

export const COOKIE = '__Host-kc_upload';

/** The session token in the request's cookie. Empty when there is none. */
export const sessionToken = (request: Request) => request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-kc_upload=([0-9a-f]{64})/)?.[1] ?? '';

export async function signedIn(env: UploadEnv, request: Request): Promise<boolean> {
  const token = sessionToken(request);
  if (!token) return false;
  const row = await env.VOW_DB!.prepare('SELECT expires FROM upload_sessions WHERE hash = ?').bind(await sha256(token)).first<{ expires: number }>();
  return !!row && row.expires > Date.now();
}
