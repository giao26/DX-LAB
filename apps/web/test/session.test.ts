// @vitest-environment node
import { generateKeyPairSync, sign } from 'node:crypto';
import { beforeEach, expect, test, vi } from 'vitest';
import { currentIdentity, endSession, finishLogin, getSession, safeReturn, SESSION_COOKIE, startLogin, verifyIdToken } from '../lib/session';
import { NextRequest } from 'next/server';
import { POST as logoutPost } from '../app/bff/session/logout/route';
import { GET as errorPage } from '../app/bff/session/error/route';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const issuer = 'https://idp.test/realms/dxlab';
function jwt(nonce: string, overrides = {}) {
  const head = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ iss: issuer, sub: 'staff', aud: 'web', nonce, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+300, ...overrides })).toString('base64url');
  return `${head}.${body}.${sign('RSA-SHA256', Buffer.from(`${head}.${body}`), privateKey).toString('base64url')}`;
}
beforeEach(() => {
  vi.stubEnv('WEB_OIDC_ISSUER', issuer); vi.stubEnv('DX_PUBLIC_ORIGIN', 'https://web.test'); vi.stubEnv('WEB_SESSION_SECRET', 'test-secret-that-has-at-least-32-characters'); vi.stubEnv('P_PROCESS_BASE_URL','https://p.test');
});
function fake(nonce: string, overrides = {}, identity = { sub: 'staff', roles: ['employee'], groups: [] }) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/certs')) return Response.json({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test' }] });
    if (url.endsWith('/token')) {
      expect(new URLSearchParams(init?.body as URLSearchParams).get('code_verifier')).toHaveLength(43);
      return Response.json({ id_token: jwt(nonce, overrides), access_token: 'server-only', expires_in: 300 });
    }
    return Response.json(identity);
  }));
}
test('PKCE login, signed opaque cookie, single-use callback, server-only token and CSRF logout', async () => {
  const login = await startLogin('/portal/dashboard#i'); const url = new URL(login.url);
  expect(url.searchParams.get('code_challenge_method')).toBe('S256'); expect(login.cookie).not.toContain('server-only');
  fake(url.searchParams.get('nonce')!);
  const params = new URLSearchParams({ code: 'code', state: url.searchParams.get('state')! });
  const result = await finishLogin(login.cookie, params); const session = getSession(result.cookie)!;
  expect(result.returnTo).toBe('/portal/dashboard#i'); expect(session.token).toBe('server-only');
  expect(getSession(result.cookie.slice(0,-1)+'x')).toBeUndefined();
  await expect(finishLogin(login.cookie, params)).rejects.toMatchObject({ status: 401 });
  expect(() => endSession(result.cookie, '', 'https://web.test')).toThrow();
  expect(() => endSession(result.cookie, session.csrf, 'https://evil.test')).toThrow();
  endSession(result.cookie, session.csrf, 'https://web.test'); expect(getSession(result.cookie)).toBeUndefined();
});
for (const overrides of [{ iss: 'evil' }, { aud: 'p-process' }, { nonce: 'wrong' }, { exp: 1 }, { azp: 'evil' }]) {
  test(`invalid ID token rejected ${JSON.stringify(overrides)}`, async () => { fake('nonce'); await expect(verifyIdToken(jwt('nonce', overrides), 'nonce')).rejects.toMatchObject({ status: 401 }); });
}
test('state mismatch consumes callback and fails closed', async () => {
  const login = await startLogin(null);
  await expect(finishLogin(login.cookie, new URLSearchParams({ state: 'wrong', code:'code' }))).rejects.toMatchObject({ status:401 });
});
test('a completed session expires and cannot be restored after its TTL', async () => {
  const login=await startLogin('/portal'); const url=new URL(login.url);
  fake(url.searchParams.get('nonce')!);
  const result=await finishLogin(login.cookie,new URLSearchParams({code:'code',state:url.searchParams.get('state')!}));
  const session=getSession(result.cookie)!;
  expect(session).toBeDefined();
  const clock=vi.spyOn(Date,'now').mockReturnValue(session.expires);
  try { expect(getSession(result.cookie)).toBeUndefined(); } finally { clock.mockRestore(); }
  expect(getSession(result.cookie)).toBeUndefined();
});
test('logout POST rejects missing CSRF and only removes the session for a valid request', async () => {
  const login=await startLogin('/portal'); const url=new URL(login.url); fake(url.searchParams.get('nonce')!);
  const result=await finishLogin(login.cookie,new URLSearchParams({code:'code',state:url.searchParams.get('state')!}));
  const session=getSession(result.cookie)!;
  const request=(csrf:string)=>new NextRequest('https://web.test/bff/session/logout',{method:'POST',headers:{cookie:`${SESSION_COOKIE}=${result.cookie}`,origin:'https://web.test','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf})});
  expect((await logoutPost(request(''))).status).toBe(403);
  expect(getSession(result.cookie)).toBeDefined();
  const response=await logoutPost(request(session.csrf));
  expect(response.status).toBe(303); expect(response.headers.get('Clear-Site-Data')).toBe('"cache"');
  expect(getSession(result.cookie)).toBeUndefined();
});
test('signature forgery, expired login and cookie tampering cannot create sessions', async () => {
  fake('nonce');
  const token=jwt('nonce').split('.'); token[2]=Buffer.alloc(256).toString('base64url');
  await expect(verifyIdToken(token.join('.'),'nonce')).rejects.toMatchObject({status:401});
  const login=await startLogin(null); const url=new URL(login.url);
  const now=vi.spyOn(Date,'now').mockReturnValue(Date.now()+301000);
  await expect(finishLogin(login.cookie,new URLSearchParams({code:'code',state:url.searchParams.get('state')!}))).rejects.toMatchObject({status:401});
  now.mockRestore();
});
test('online membership revocation and outage fail closed', async () => {
  fake('nonce', {}, { sub:'staff', roles:[], groups:[] });
  await expect(currentIdentity({ sub:'staff', token:'opaque', csrf:'x', expires:Date.now()+1000 })).rejects.toMatchObject({ status:403 });
  vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
  await expect(currentIdentity({ sub:'staff', token:'opaque', csrf:'x', expires:Date.now()+1000 })).rejects.toMatchObject({ status:503 });
});
test('return URL only permits known internal destinations', () => { for (const value of ['https://evil.test','//evil.test','/portal/../evil','/portal?next=evil']) expect(safeReturn(value)).toBe('/portal'); });
test('safe error page offers an explicit fresh sign-in flow',async()=>{
  const response=errorPage(new NextRequest('https://web.test/bff/session/error?status=503&returnTo=https://evil.test'));
  expect(response.status).toBe(503);expect(await response.text()).toContain('href="/bff/session/login?returnTo=%2Fportal"');
});
for(const section of ['d','i']) test(`signed-out ${section} keeps query selector and fragment after login`,async()=>{
  const target=`/portal/dashboard?section=${section}#${section}`;
  const login=await startLogin(target);const url=new URL(login.url);fake(url.searchParams.get('nonce')!);
  const result=await finishLogin(login.cookie,new URLSearchParams({code:'code',state:url.searchParams.get('state')!}));
  expect(result.returnTo).toBe(target);
});
test('ID-token subject must match online P identity before creating any session',async()=>{
  const login=await startLogin('/portal');const url=new URL(login.url);
  fake(url.searchParams.get('nonce')!,{}, {sub:'another-member',roles:['employee'],groups:[]});
  const store=(globalThis as typeof globalThis & {dxSessions:Map<string,unknown>}).dxSessions;
  const count=store.size;
  await expect(finishLogin(login.cookie,new URLSearchParams({code:'code',state:url.searchParams.get('state')!}))).rejects.toMatchObject({status:403});
  expect(store.size).toBe(count);
});
test('expired-session logout POST clears cookie and cache after same-origin intent',async()=>{
  const login=await startLogin('/portal');const url=new URL(login.url);fake(url.searchParams.get('nonce')!);
  const result=await finishLogin(login.cookie,new URLSearchParams({code:'code',state:url.searchParams.get('state')!}));
  const session=getSession(result.cookie)!; const clock=vi.spyOn(Date,'now').mockReturnValue(session.expires);
  try {
    const request=new NextRequest('https://web.test/bff/session/logout',{method:'POST',headers:{cookie:`${SESSION_COOKIE}=${result.cookie}`,origin:'https://web.test','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf:session.csrf})});
    const response=await logoutPost(request);
    expect(response.status).toBe(303);expect(response.headers.get('Clear-Site-Data')).toBe('"cache"');expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(getSession(result.cookie)).toBeUndefined();
  } finally {clock.mockRestore();}
});
