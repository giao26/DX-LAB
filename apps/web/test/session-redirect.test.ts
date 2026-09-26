// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as callback } from '../app/bff/session/callback/route';
import { GET as login } from '../app/bff/session/login/route';
import { LOGIN_COOKIE, startLogin } from '../lib/session';

beforeEach(() => {
  vi.stubEnv('DX_PUBLIC_ORIGIN', 'https://localhost');
  vi.stubEnv('WEB_SESSION_SECRET', '');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

test('callback có cookie/state hợp lệ khi IdP lỗi trả public status503', async () => {
  vi.stubEnv('WEB_SESSION_SECRET', 'test-session-signing-secret-at-least-32-characters');
  vi.stubEnv('WEB_OIDC_ISSUER', 'https://idp.test/realms/test');
  const pending = await startLogin('/portal');
  const state = new URL(pending.url).searchParams.get('state');
  vi.stubGlobal('fetch', async () => { throw new Error('IdP offline'); });
  const response = await callback(new NextRequest(`http://0.0.0.0:3000/bff/session/callback?code=invalid&state=${state}`, {
    headers: { cookie: `${LOGIN_COOKIE}=${pending.cookie}` },
  }));
  expect(response.headers.get('location')).toBe('https://localhost/bff/session/error?status=503');
});

test('callback lỗi sau proxy chuyển tới public origin, không dùng host nội bộ hay header giả', async () => {
  const response = await callback(new NextRequest('http://0.0.0.0:3000/bff/session/callback?code=invalid', {
    headers: { host: 'evil.test', 'x-forwarded-host': 'evil.test' },
  }));
  expect(response.headers.get('location')).toBe('https://localhost/bff/session/error?status=403');
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
});

test('login thiếu secret chuyển lỗi về public origin', async () => {
  const response = await login(new NextRequest('http://0.0.0.0:3000/bff/session/login'));
  expect(response.headers.get('location')).toBe('https://localhost/bff/session/error?status=503');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});

for (const origin of ['', 'invalid', 'file:///tmp/site']) test(`origin không hợp lệ trả503 tại chỗ: ${origin}`, async () => {
  vi.stubEnv('DX_PUBLIC_ORIGIN', origin);
  for (const handler of [login, callback]) {
    const response = await handler(new NextRequest('http://0.0.0.0:3000/bff/session/callback'));
    expect(response.status).toBe(503);
    expect(response.headers.has('location')).toBe(false);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.text()).toContain('href="/"');
    if (handler === callback) {
      const cookie = response.headers.get('set-cookie');
      for (const flag of ['Max-Age=0', 'Secure', 'HttpOnly', 'SameSite=lax']) expect(cookie).toContain(flag);
    }
  }
});
