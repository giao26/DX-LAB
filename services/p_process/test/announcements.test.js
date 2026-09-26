import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../dist/adapters/http/app.js';
import { AuthenticationError, IdentityProviderUnavailableError } from '../dist/application/principal.js';
import { ReadAnnouncementsUseCase } from '../dist/application/read-announcements.js';
import { PostgresAnnouncementStore } from '../dist/adapters/postgres/announcement-store.js';

const announcements = [
  { id: '70000000-0000-4000-8000-000000000001', title: 'Thông báo công ty', body: 'Nội dung chung', scope: 'company', target_group: null, published_at: '2026-09-20T08:00:00.000Z' },
  { id: '70000000-0000-4000-8000-000000000002', title: 'Lịch bảo trì', body: 'Nội dung Kỹ thuật', scope: 'group', target_group: 'Kỹ thuật', published_at: '2026-09-23T08:00:00.000Z' },
  { id: '70000000-0000-4000-8000-000000000003', title: 'Onboarding', body: 'Nội dung Nhân sự', scope: 'group', target_group: 'Nhân sự', published_at: '2026-09-25T08:00:00.000Z' },
];

function store() {
  return { async listByScope(groups) { return announcements.filter(item => item.scope === 'company' || groups.includes(item.target_group)); } };
}

function appFor({ groupIds = ['Kỹ thuật'], verifyError, storeOverride = store() } = {}) {
  return buildApp({ logger: false }, {
    readAnnouncements: new ReadAnnouncementsUseCase(storeOverride),
    identityVerifier: { async verify() {
      if (verifyError) throw verifyError;
      return { sub: 'u1', clientId: 'web', roles: ['employee'], groupIds, scopes: ['portal:read'] };
    } },
  });
}

test('use case trả company và chỉ group thuộc principal', async () => {
  const useCase = new ReadAnnouncementsUseCase(store());
  assert.deepEqual((await useCase.execute([])).data.map(item => item.scope), ['company']);
  const result = await useCase.execute(['Kỹ thuật']);
  assert.deepEqual(result.data.map(item => item.target_group), [null, 'Kỹ thuật']);
});

test('Postgres store lọc publication window và dùng id làm tie-breaker', async () => {
  const queries = [];
  const postgresStore = new PostgresAnnouncementStore({
    async query(sql, params) { queries.push({ sql, params }); return { rows: [] }; },
  });
  await postgresStore.listByScope(['Kỹ thuật']);
  await postgresStore.listByScope([]);
  assert.equal(queries.length, 2);
  for (const query of queries) {
    assert.match(query.sql, /published_at <= NOW\(\)/);
    assert.match(query.sql, /expires_at IS NULL OR expires_at > NOW\(\)/);
    assert.match(query.sql, /ORDER BY published_at DESC, id DESC/);
  }
  assert.deepEqual(queries[0].params, [['Kỹ thuật']]);
  assert.deepEqual(queries[1].params, []);
});

test('endpoint dùng group từ principal và bỏ qua query group của caller', async (t) => {
  const app = appFor(); t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/api/v1/announcements?groups=Nh%C3%A2n%20s%E1%BB%B1', headers: { authorization: 'Bearer token' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'private, no-store');
  assert.deepEqual(response.json().data.map(item => item.target_group), [null, 'Kỹ thuật']);
});

test('endpoint trả Problem Details 401 và 403', async (t) => {
  for (const status of [401, 403]) {
    const app = appFor({ verifyError: new AuthenticationError('Từ chối', status) });
    t.after(() => app.close());
    const response = await app.inject({ method: 'GET', url: '/api/v1/announcements' });
    assert.equal(response.statusCode, status);
    assert.match(response.headers['content-type'], /^application\/problem\+json/);
  }
});

test('endpoint trả Problem Details 503 khi identity hoặc store lỗi', async (t) => {
  const identityApp = appFor({ verifyError: new IdentityProviderUnavailableError('Tạm lỗi') });
  t.after(() => identityApp.close());
  const identityResponse = await identityApp.inject({ method: 'GET', url: '/api/v1/announcements', headers: { authorization: 'Bearer token' } });
  assert.equal(identityResponse.statusCode, 503);
  assert.match(identityResponse.headers['content-type'], /^application\/problem\+json/);

  const storeApp = appFor({ storeOverride: { async listByScope() { throw new Error('database down'); } } });
  t.after(() => storeApp.close());
  const storeResponse = await storeApp.inject({ method: 'GET', url: '/api/v1/announcements', headers: { authorization: 'Bearer token' } });
  assert.equal(storeResponse.statusCode, 503);
  assert.equal(storeResponse.json().code, 'ANNOUNCEMENTS_UNAVAILABLE');
});
