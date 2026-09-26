import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../dist/adapters/http/app.js';
import { AuthenticationError, IdentityProviderUnavailableError } from '../dist/application/principal.js';
import { ReadAnnouncementsUseCase } from '../dist/application/read-announcements.js';

const mockAnnouncements = [
  {
    id: '70000000-0000-4000-8000-000000000001',
    title: 'Chào mừng đến DX-OS – hệ thống quản lý vận hành số',
    body: 'Nội dung thông báo toàn công ty.',
    scope: 'company',
    target_group: null,
    published_at: '2026-09-20T08:00:00.000Z',
  },
  {
    id: '70000000-0000-4000-8000-000000000002',
    title: 'Lịch bảo trì hệ thống tháng 10/2026',
    body: 'Nội dung thông báo cho nhóm Kỹ thuật.',
    scope: 'group',
    target_group: 'Kỹ thuật',
    published_at: '2026-09-23T08:00:00.000Z',
  },
  {
    id: '70000000-0000-4000-8000-000000000003',
    title: 'Quy trình onboarding nhân viên mới cập nhật',
    body: 'Nội dung thông báo cho nhóm Nhân sự.',
    scope: 'group',
    target_group: 'Nhân sự',
    published_at: '2026-09-25T08:00:00.000Z',
  },
];

function createMockStore() {
  return {
    async listByScope(groups) {
      return mockAnnouncements.filter((a) => {
        if (a.scope === 'company') return true;
        if (a.scope === 'group' && a.target_group && groups.includes(a.target_group)) return true;
        return false;
      });
    },
  };
}

test('ReadAnnouncementsUseCase returns company announcements and permitted group announcements', async () => {
  const store = createMockStore();
  const useCase = new ReadAnnouncementsUseCase(store);

  // Group: Kỹ thuật -> company + Kỹ thuật
  const resultTech = await useCase.execute(['Kỹ thuật']);
  assert.equal(resultTech.data.length, 2);
  assert.ok(resultTech.data.some((a) => a.title.includes('Chào mừng')));
  assert.ok(resultTech.data.some((a) => a.target_group === 'Kỹ thuật'));
  assert.ok(!resultTech.data.some((a) => a.target_group === 'Nhân sự'));

  // Group: empty -> company only
  const resultNone = await useCase.execute([]);
  assert.equal(resultNone.data.length, 1);
  assert.equal(resultNone.data[0].scope, 'company');

  // Group: Nhân sự -> company + Nhân sự
  const resultHr = await useCase.execute(['Nhân sự']);
  assert.equal(resultHr.data.length, 2);
  assert.ok(resultHr.data.some((a) => a.target_group === 'Nhân sự'));
  assert.ok(!resultHr.data.some((a) => a.target_group === 'Kỹ thuật'));
});

test('GET /api/v1/announcements requires authentication', async () => {
  const store = createMockStore();
  const readAnnouncements = new ReadAnnouncementsUseCase(store);
  const app = buildApp(
    { logger: false },
    {
      readAnnouncements,
      identityVerifier: {
        async verify(header) {
          if (!header) throw new AuthenticationError('Token required', 401);
          return { sub: 'u1', clientId: 'web', roles: ['employee'], groupIds: [], scopes: ['portal:read'] };
        },
      },
    }
  );

  const res = await app.inject({ method: 'GET', url: '/api/v1/announcements' });
  assert.equal(res.statusCode, 401);
  const body = res.json();
  assert.equal(body.code, 'ACCESS_DENIED');
  await app.close();
});

test('GET /api/v1/announcements returns 503 when identity service is unavailable', async () => {
  const store = createMockStore();
  const readAnnouncements = new ReadAnnouncementsUseCase(store);
  const app = buildApp(
    { logger: false },
    {
      readAnnouncements,
      identityVerifier: {
        async verify() {
          throw new IdentityProviderUnavailableError('Service down');
        },
      },
    }
  );

  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/announcements',
    headers: { authorization: 'Bearer some-token' },
  });
  assert.equal(res.statusCode, 503);
  const body = res.json();
  assert.equal(body.code, 'IDENTITY_PROVIDER_UNAVAILABLE');
  await app.close();
});

test('GET /api/v1/announcements scopes announcements to viewer groups and sets Cache-Control', async () => {
  const store = createMockStore();
  const readAnnouncements = new ReadAnnouncementsUseCase(store);
  const app = buildApp(
    { logger: false },
    {
      readAnnouncements,
      identityVerifier: {
        async verify() {
          return {
            sub: 'tech-user',
            clientId: 'web',
            roles: ['employee'],
            groupIds: ['Kỹ thuật'],
            scopes: ['portal:read'],
          };
        },
      },
    }
  );

  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/announcements',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['cache-control'], 'private, no-store');
  const body = res.json();
  assert.equal(body.data.length, 2);
  assert.ok(body.data.some((a) => a.scope === 'company'));
  assert.ok(body.data.some((a) => a.target_group === 'Kỹ thuật'));
  assert.ok(!body.data.some((a) => a.target_group === 'Nhân sự'));

  // If user requests a query group they don't belong to, it is filtered out by security boundary
  const resFiltered = await app.inject({
    method: 'GET',
    url: '/api/v1/announcements?groups=Nhân%20sự',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(resFiltered.statusCode, 200);
  const filteredBody = resFiltered.json();
  assert.equal(filteredBody.data.length, 1); // Only company
  assert.equal(filteredBody.data[0].scope, 'company');

  await app.close();
});
