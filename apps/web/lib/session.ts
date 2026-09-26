import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify, type JsonWebKey } from 'node:crypto';

export const SESSION_COOKIE = '__Host-dx-session';
export const LOGIN_COOKIE = '__Host-dx-login';
export const cookieOptions = { secure: true, httpOnly: true, sameSite: 'lax' as const, path: '/' };
export class SessionError extends Error {
  constructor(public readonly status: number) { super(status === 503 ? 'Dịch vụ xác thực không khả dụng. Vui lòng thử lại.' : 'Không thể xác thực hoặc bạn không có quyền truy cập.'); }
}
type Pending = { state: string; nonce: string; verifier: string; returnTo: string; expires: number };
export type Session = { token: string; sub: string; csrf: string; expires: number };
export type Identity = { sub: string; roles: string[]; groups: string[] };
// Single-process bounded stores. Restart intentionally requires signing in again.
const globalStore = globalThis as typeof globalThis & { dxSessions?: Map<string, Session>; dxLogins?: Map<string, Pending> };
const sessions = globalStore.dxSessions ??= new Map<string, Session>();
const logins = globalStore.dxLogins ??= new Map<string, Pending>();
const random = () => randomBytes(32).toString('base64url');
function config() {
  const issuer = process.env.WEB_OIDC_ISSUER;
  const origin = process.env.DX_PUBLIC_ORIGIN;
  const secret = process.env.WEB_SESSION_SECRET;
  if (!issuer || !origin || !secret || secret.length < 32) throw new SessionError(503);
  return { issuer, origin, secret, client: process.env.WEB_OIDC_CLIENT_ID ?? 'web', backchannel: process.env.WEB_OIDC_BACKCHANNEL_ISSUER ?? issuer };
}
function sweep<T extends { expires: number }>(store: Map<string, T>) {
  for (const [id, value] of store) if (value.expires <= Date.now()) store.delete(id);
  if (store.size >= 10000) throw new SessionError(503);
}
export function safeReturn(value: string | null): string {
  if (!value) return '/portal';
  if (/^\/portal(?:\/(?:h|p))?$/.test(value)) return value;
  if (/^\/portal\/dashboard(?:\?section=[di])?(?:#[di])?$/.test(value)) return value;
  if (/^\/portal\/resources(?:\/[a-zA-Z0-9_-]+)?(?:\?[a-zA-Z0-9_=&%+-]+)?$/.test(value)) return value;
  return '/portal';
}
export function signId(id: string): string { return `${id}.${createHmac('sha256', config().secret).update(id).digest('base64url')}`; }
function readId(cookie: string | undefined) {
  if (!cookie || !/^[\w-]{43}\.[\w-]{43}$/.test(cookie)) return undefined;
  const [id] = cookie.split('.');
  const expected = Buffer.from(signId(id));
  return timingSafeEqual(expected, Buffer.from(cookie)) ? id : undefined;
}
async function jsonFetch(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new SessionError(response.status >= 500 ? 503 : 401);
    return await response.json();
  } catch (error) { if (error instanceof SessionError) throw error; throw new SessionError(503); }
}
export async function startLogin(returnTo: string | null) {
  const cfg = config(); sweep(logins);
  const id = random();
  const pending = { state: random(), nonce: random(), verifier: random(), returnTo: safeReturn(returnTo), expires: Date.now() + 300000 };
  logins.set(id, pending);
  const url = new URL(`${cfg.issuer}/protocol/openid-connect/auth`);
  url.search = new URLSearchParams({ client_id: cfg.client, response_type: 'code', scope: 'openid portal:read', redirect_uri: `${cfg.origin}/bff/session/callback`, state: pending.state, nonce: pending.nonce, code_challenge: createHash('sha256').update(pending.verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
  return { url: url.toString(), cookie: signId(id) };
}
export async function verifyIdToken(token: string, nonce: string): Promise<string> {
  const cfg = config();
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new SessionError(401);
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new SessionError(401);
    const jwks = await jsonFetch(`${cfg.backchannel}/protocol/openid-connect/certs`);
    const keys = jwks.keys as (JsonWebKey & { kid?: string; use?: string; alg?: string })[];
    const key = Array.isArray(keys) ? keys.find(key => key.kid === header.kid && key.kty === 'RSA' && (!key.use || key.use === 'sig') && (!key.alg || key.alg === 'RS256')) : undefined;
    if (!key || !verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))) throw new SessionError(401);
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== cfg.issuer || !aud.includes(cfg.client) || (aud.length > 1 && claims.azp !== cfg.client) || (claims.azp && claims.azp !== cfg.client) || claims.nonce !== nonce || typeof claims.sub !== 'string' || !claims.sub || typeof claims.exp !== 'number' || claims.exp <= now || typeof claims.iat !== 'number' || claims.iat > now + 30 || (claims.nbf && claims.nbf > now)) throw new SessionError(401);
    return claims.sub;
  } catch (error) { if (error instanceof SessionError) throw error; throw new SessionError(401); }
}
export async function currentIdentity(session: Session): Promise<Identity> {
  const identity = await jsonFetch(`${process.env.P_PROCESS_BASE_URL ?? 'http://p-process:3000'}/api/v1/identity`, { headers: { Authorization: `Bearer ${session.token}` } });
  const roles = ['employee', 'group_lead', 'department_head', 'director'];
  if (identity.sub !== session.sub || !Array.isArray(identity.roles) || !identity.roles.some(role => roles.includes(role)) || !Array.isArray(identity.groups)) throw new SessionError(403);
  return identity as Identity;
}
export async function finishLogin(cookie: string | undefined, params: URLSearchParams) {
  const id = readId(cookie); const pending = id ? logins.get(id) : undefined;
  if (id) logins.delete(id); // Consume before any network call, including failed/replayed callbacks.
  if (!pending || pending.expires <= Date.now() || params.get('state') !== pending.state || !params.get('code') || params.has('error')) throw new SessionError(401);
  const cfg = config();
  const tokens = await jsonFetch(`${cfg.backchannel}/protocol/openid-connect/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: cfg.client, code: params.get('code')!, code_verifier: pending.verifier, redirect_uri: `${cfg.origin}/bff/session/callback` }) });
  if (typeof tokens.id_token !== 'string' || typeof tokens.access_token !== 'string' || typeof tokens.expires_in !== 'number' || tokens.expires_in <= 0) throw new SessionError(401);
  const sub = await verifyIdToken(tokens.id_token, pending.nonce);
  const session: Session = { sub, token: tokens.access_token, csrf: random(), expires: Date.now() + Math.min(tokens.expires_in, 1800) * 1000 };
  await currentIdentity(session); sweep(sessions);
  const sessionId = random(); sessions.set(sessionId, session);
  return { cookie: signId(sessionId), returnTo: pending.returnTo, maxAge: Math.floor((session.expires - Date.now()) / 1000) };
}
export function getSession(cookie: string | undefined) {
  const id = readId(cookie); const session = id ? sessions.get(id) : undefined;
  if (session && session.expires > Date.now()) return session;
  if (id) sessions.delete(id);
  return undefined;
}
export function endSession(cookie: string | undefined, csrf: unknown, origin: string | null) {
  const id = readId(cookie); const session = getSession(cookie);
  if (typeof csrf !== 'string' || !csrf || origin !== config().origin || (session && csrf !== session.csrf)) throw new SessionError(403);
  if (id) sessions.delete(id);
}
