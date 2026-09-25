import test from 'node:test';
import assert from 'node:assert/strict';
import { OidcIdentityVerifier } from '../dist/adapters/http/oidc-identity-verifier.js';
import { AuthenticationError, IdentityProviderUnavailableError } from '../dist/application/principal.js';

const config = {
  introspectionUrl: 'https://iam.test/introspect',
  tokenUrl: 'https://iam.test/token',
  adminBaseUrl: 'https://iam.test/admin/realms/dxlab',
  issuer: 'https://iam.test/realms/dxlab',
  audience: 'p-process',
  clientId: 'p-process',
  clientSecret: 'test-only',
  trustedClientIds: ['web', 'odoo'],
};

const validClaims = {
  active: true,
  iss: config.issuer,
  aud: ['p-process'],
  scope: 'tickets:read tickets:download',
  sub: 'staff-1',
  client_id: 'odoo',
};

function mockIdp(t, claims = validClaims, overrides = {}) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url) === config.introspectionUrl) return new Response(JSON.stringify(claims), { status: 200 });
    if (String(url) === config.tokenUrl) return new Response(JSON.stringify({ access_token: 'service-token' }), { status: 200 });
    if (String(url).endsWith('/role-mappings/realm/composite')) return new Response(JSON.stringify(overrides.roles ?? [{ name: 'employee' }]), { status: 200 });
    if (String(url).endsWith('/groups')) return new Response(JSON.stringify(overrides.groups ?? [{ path: '/warranty' }]), { status: 200 });
    if (String(url).endsWith('/users/staff-1')) return new Response(JSON.stringify(overrides.user ?? { enabled: true }), { status: 200 });
    throw new Error(`unexpected URL ${url}`);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  return calls;
}

test('xác minh token và tra entitlement hiện hành qua stock Keycloak Admin API', async (t) => {
  const calls = mockIdp(t);
  const principal = await new OidcIdentityVerifier(config).verify('Bearer opaque', 'tickets:read');
  assert.deepEqual(principal, {
    sub: 'staff-1', clientId: 'odoo', scopes: ['tickets:read', 'tickets:download'],
    roles: ['employee'], groupIds: ['warranty'],
  });
  assert.ok(calls.some((url) => url.endsWith('/users/staff-1/role-mappings/realm/composite')));
  assert.ok(calls.some((url) => url.endsWith('/users/staff-1/groups')));
});

test('bearer scheme không phân biệt hoa thường', async (t) => {
  mockIdp(t);
  const principal = await new OidcIdentityVerifier(config).verify('bearer opaque', 'tickets:read');
  assert.equal(principal.sub, 'staff-1');
});

for (const [name, claims] of [
  ['active phải là boolean true', { ...validClaims, active: 'true' }],
  ['issuer', { ...validClaims, iss: 'https://attacker.test' }],
  ['audience', { ...validClaims, aud: ['other'] }],
  ['sub', { ...validClaims, sub: '' }],
  ['calling client', { ...validClaims, client_id: 'unknown' }],
]) {
  test(`từ chối claim ${name} không hợp lệ`, async (t) => {
    mockIdp(t, claims);
    await assert.rejects(
      () => new OidcIdentityVerifier(config).verify('Bearer opaque', 'tickets:read'),
      AuthenticationError,
    );
  });
}

test('từ chối riêng scope bắt buộc bị thiếu', async (t) => {
  mockIdp(t, { ...validClaims, scope: 'openid profile' });
  await assert.rejects(
    () => new OidcIdentityVerifier(config).verify('Bearer opaque', 'tickets:read'),
    (error) => error instanceof AuthenticationError && error.statusCode === 403,
  );
});

test('entitlement bị thu hồi được kiểm tra lại trên request kế tiếp', async (t) => {
  let enabled = true;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url) === config.introspectionUrl) return new Response(JSON.stringify(validClaims));
    if (String(url) === config.tokenUrl) return new Response(JSON.stringify({ access_token: 'service-token' }));
    if (String(url).endsWith('/role-mappings/realm/composite')) return new Response(JSON.stringify([{ name: 'employee' }]));
    if (String(url).endsWith('/groups')) return new Response(JSON.stringify([{ path: '/warranty' }]));
    return new Response(JSON.stringify({ enabled }));
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const verifier = new OidcIdentityVerifier(config);
  await verifier.verify('Bearer opaque', 'tickets:read');
  enabled = false;
  await assert.rejects(() => verifier.verify('Bearer opaque', 'tickets:read'),
    (error) => error instanceof AuthenticationError && error.statusCode === 403);
});

test('role và group được lấy lại trên mỗi request, không dùng entitlement cũ', async (t) => {
  let roles = [{ name: 'employee' }];
  let groups = [{ path: '/warranty' }];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url) === config.introspectionUrl) return new Response(JSON.stringify(validClaims));
    if (String(url) === config.tokenUrl) return new Response(JSON.stringify({ access_token: 'service-token' }));
    if (String(url).endsWith('/role-mappings/realm/composite')) return new Response(JSON.stringify(roles));
    if (String(url).endsWith('/groups')) return new Response(JSON.stringify(groups));
    return new Response(JSON.stringify({ enabled: true }));
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const verifier = new OidcIdentityVerifier(config);
  assert.deepEqual((await verifier.verify('Bearer opaque', 'tickets:read')).groupIds, ['warranty']);
  roles = [{ name: 'director' }];
  groups = [];
  const refreshed = await verifier.verify('Bearer opaque', 'tickets:read');
  assert.deepEqual(refreshed.roles, ['director']);
  assert.deepEqual(refreshed.groupIds, []);
});

test('mọi phản hồi introspection không thành công đều là dependency unavailable', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('rate limited', { status: 429 });
  t.after(() => { globalThis.fetch = originalFetch; });
  await assert.rejects(
    () => new OidcIdentityVerifier(config).verify('Bearer opaque', 'tickets:read'),
    IdentityProviderUnavailableError,
  );
});

test('timeout và JSON lỗi của IdP trả lỗi unavailable có cấu trúc', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('timeout'); };
  t.after(() => { globalThis.fetch = originalFetch; });
  await assert.rejects(
    () => new OidcIdentityVerifier(config).verify('Bearer opaque', 'tickets:read'),
    IdentityProviderUnavailableError,
  );
});
