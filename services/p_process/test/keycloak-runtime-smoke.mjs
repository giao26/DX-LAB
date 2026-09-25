import assert from 'node:assert/strict';

const keycloak = process.env.TEST_KEYCLOAK_BASE_URL ?? 'http://keycloak:8080';
const pBase = process.env.TEST_P_BASE_URL ?? 'http://127.0.0.1:3000';
const realm = `${keycloak}/realms/dxlab`;
const tokenUrl = `${realm}/protocol/openid-connect/token`;

const odooLogin = await fetch(`${realm}/protocol/openid-connect/auth?${new URLSearchParams({
  client_id: 'odoo-login', redirect_uri: 'http://localhost/auth_oauth/signin',
  response_type: 'token', scope: 'openid tickets:read tickets:download',
})}`);
assert.equal(odooLogin.status, 200, `Odoo login authorization endpoint returned ${odooLogin.status}`);
assert.match(odooLogin.headers.get('content-type') ?? '', /^text\/html/);

async function form(url, values, authorization) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: new URLSearchParams(values),
  });
  const body = await response.json().catch(() => ({}));
  assert.equal(response.ok, true, `${url} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const subject = await form(tokenUrl, {
  grant_type: 'password', client_id: 'web', username: 'staff.warranty',
  password: 'dxlab-demo-2026', scope: 'openid tickets:read tickets:download',
});
assert.equal(typeof subject.access_token, 'string');

const pBasic = `Basic ${Buffer.from('p-process:p-process-dev-secret').toString('base64')}`;
const introspection = await form(`${tokenUrl}/introspect`, { token: subject.access_token }, pBasic);
assert.equal(introspection.active, true);
assert.equal(introspection.iss, 'http://localhost/realms/dxlab');
assert.equal(introspection.sub, '11111111-1111-4111-8111-111111111111');
assert.ok(Array.isArray(introspection.aud) ? introspection.aud.includes('odoo') : introspection.aud === 'odoo');

const service = await form(tokenUrl, { grant_type: 'client_credentials' }, pBasic);
for (const suffix of ['', '/role-mappings/realm/composite', '/groups']) {
  const response = await fetch(`${keycloak}/admin/realms/dxlab/users/${introspection.sub}${suffix}`, {
    headers: { Authorization: `Bearer ${service.access_token}`, Accept: 'application/json' },
  });
  assert.equal(response.ok, true, `Admin API ${suffix || '/user'} returned ${response.status}`);
}

const delegated = await form(tokenUrl, {
  grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
  subject_token: subject.access_token,
  subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
  requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
  audience: 'p-process', client_id: 'odoo', client_secret: 'odoo-dev-secret', scope: 'tickets:read',
});
assert.equal(typeof delegated.access_token, 'string');

const protectedRead = await fetch(`${pBase}/api/v1/tickets?limit=1&offset=0`, {
  headers: { Authorization: `Bearer ${delegated.access_token}`, Accept: 'application/json' },
});
assert.equal(protectedRead.status, 200, `protected read returned ${protectedRead.status}: ${await protectedRead.text()}`);
console.log('Stock Keycloak Odoo login, introspection, Admin API, token exchange and protected read: PASS');
