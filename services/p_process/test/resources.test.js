import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../dist/adapters/http/app.js';
import { AuthenticationError } from '../dist/application/principal.js';
import { ReadResourcesUseCase } from '../dist/application/read-resources.js';
import { PostgresResourceStore } from '../dist/adapters/postgres/resource-store.js';

const mockSampleResources = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    code: 'SOP-TKT-001',
    type: 'sop',
    title: 'Quy trình tiếp nhận và phân công ticket',
    status: 'published',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    approverName: 'Ban Giám đốc',
    publishedAt: '2026-01-01T08:00:00.000Z',
    summary: 'Quy định các bước tiếp nhận và phân công ticket',
    content: 'Nội dung chi tiết quy trình tiếp nhận và phân công ticket.',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T08:00:00Z'),
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    code: 'SOP-WAR-001',
    type: 'sop',
    title: 'Quy trình kiểm tra và xử lý bảo hành',
    status: 'published',
    version: '1.0.0',
    effectiveDate: '2026-01-15',
    approverName: 'Trưởng phòng Kỹ thuật',
    publishedAt: '2026-01-15T09:00:00.000Z',
    summary: 'Hướng dẫn kiểm tra và bảo hành',
    content: 'Nội dung chi tiết quy trình bảo hành thiết bị.',
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date('2026-01-15T09:00:00Z'),
  },
  {
    id: '60000000-0000-4000-8000-000000000003',
    code: 'FAQ-GEN-001',
    type: 'faq',
    title: 'Hướng dẫn dành cho nhân viên mới và câu hỏi thường gặp',
    status: 'published',
    version: '1.0.0',
    effectiveDate: '2026-02-01',
    approverName: 'Phòng Nhân sự',
    publishedAt: '2026-02-01T08:30:00.000Z',
    summary: 'Giải đáp các thắc mắc phổ biến',
    content: 'Nội dung các câu hỏi thường gặp FAQ.',
    createdAt: new Date('2026-02-01T00:00:00Z'),
    updatedAt: new Date('2026-02-01T08:30:00Z'),
  },
];

function isEffective(r) {
  if (r.status !== 'published') return false;
  if (!r.effectiveDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return r.effectiveDate.slice(0, 10) <= today;
}

function createMockStore(records = mockSampleResources) {
  return {
    async listPublished(options = {}) {
      let filtered = records.filter(isEffective);
      if (options.type) {
        filtered = filtered.filter((r) => r.type === options.type);
      }
      if (options.search) {
        const q = options.search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.code.toLowerCase().includes(q) ||
            r.summary.toLowerCase().includes(q) ||
            r.content.toLowerCase().includes(q),
        );
      }
      const limit = options.limit ?? 20;
      const offset = options.offset ?? 0;
      return {
        items: filtered.slice(offset, offset + limit),
        total: filtered.length,
      };
    },
    async getPublishedById(idOrCode) {
      return (
        records.find(
          (r) => (r.id === idOrCode || r.code === idOrCode) && isEffective(r),
        ) || null
      );
    },
    async searchAiResources(query, limit = 5) {
      const q = query.toLowerCase();
      const filtered = records
        .filter(isEffective)
        .filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.code.toLowerCase().includes(q) ||
            r.summary.toLowerCase().includes(q) ||
            r.content.toLowerCase().includes(q),
        );
      return filtered.slice(0, limit);
    },
  };
}

function createTestApp(store = createMockStore(), role = 'employee') {
  const readResources = new ReadResourcesUseCase(store);
  return buildApp(
    { logger: false },
    {
      readResources,
      identityVerifier: {
        async verify(header, scope) {
          assert.equal(scope, 'portal:read');
          if (!header) throw new AuthenticationError('Missing bearer token', 401);
          if (header === 'Bearer invalid') throw new AuthenticationError('Invalid token', 401);
          if (header === 'Bearer revoked') throw new AuthenticationError('Revoked membership', 403);
          return {
            sub: 'test-user',
            roles: [role],
            groupIds: ['general'],
            clientId: 'web',
            scopes: ['portal:read'],
          };
        },
      },
    },
  );
}

test('GET /api/v1/resources lists effective published SOPs and FAQs with metadata', async () => {
  const app = createTestApp();
  const response = await app.inject({
    url: '/api/v1/resources',
    headers: { authorization: 'Bearer valid-token' },
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.total, 3);
  assert.equal(data.items.length, 3);

  const first = data.items[0];
  assert.equal(first.code, 'SOP-TKT-001');
  assert.equal(first.type, 'sop');
  assert.equal(first.status, 'published');
  assert.equal(first.statusLabel, 'Đang có hiệu lực');
  assert.equal(first.version, '1.0.0');
  assert.equal(first.effectiveDate, '2026-01-01');
  assert.equal(first.approverName, 'Ban Giám đốc');
  assert.ok(first.publishedAt);
  assert.ok(first.summary);
  assert.equal(first.content, undefined); // Content is only on detail endpoint
  await app.close();
});

test('GET /api/v1/resources filters by type (sop, faq) and rejects invalid type', async () => {
  const app = createTestApp();

  const sopRes = await app.inject({
    url: '/api/v1/resources?type=sop',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(sopRes.statusCode, 200);
  const sopData = sopRes.json();
  assert.equal(sopData.total, 2);
  assert.ok(sopData.items.every((item) => item.type === 'sop'));

  const faqRes = await app.inject({
    url: '/api/v1/resources?type=faq',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(faqRes.statusCode, 200);
  const faqData = faqRes.json();
  assert.equal(faqData.total, 1);
  assert.equal(faqData.items[0].code, 'FAQ-GEN-001');

  const invalidRes = await app.inject({
    url: '/api/v1/resources?type=invalid',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(invalidRes.statusCode, 400);
  assert.equal(invalidRes.json().code, 'VALIDATION_ERROR');
  await app.close();
});

test('GET /api/v1/resources searches by keyword and handles empty results', async () => {
  const app = createTestApp();

  const searchRes = await app.inject({
    url: '/api/v1/resources?search=b%E1%BA%A3o%20h%C3%A0nh',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(searchRes.statusCode, 200);
  const searchData = searchRes.json();
  assert.equal(searchData.total, 1);
  assert.equal(searchData.items[0].code, 'SOP-WAR-001');

  const emptyRes = await app.inject({
    url: '/api/v1/resources?search=khongtontai12345',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(emptyRes.statusCode, 200);
  const emptyData = emptyRes.json();
  assert.equal(emptyData.total, 0);
  assert.equal(emptyData.items.length, 0);
  await app.close();
});

test('GET /api/v1/resources/{id} returns full document detail', async () => {
  const app = createTestApp();
  const response = await app.inject({
    url: '/api/v1/resources/60000000-0000-4000-8000-000000000001',
    headers: { authorization: 'Bearer valid-token' },
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.code, 'SOP-TKT-001');
  assert.equal(data.status, 'published');
  assert.equal(data.statusLabel, 'Đang có hiệu lực');
  assert.ok(data.content.includes('Nội dung chi tiết quy trình tiếp nhận'));
  await app.close();
});

test('GET /api/v1/resources/{id} rejects drafts and non-existent IDs with RFC 9457 404', async () => {
  const recordsWithDraft = [
    ...mockSampleResources,
    {
      id: '60000000-0000-4000-8000-000000000004',
      code: 'SOP-SEC-DRAFT',
      type: 'sop',
      title: 'Quy trình an toàn thông tin - bản nháp',
      status: 'draft',
      version: '0.1.0',
      effectiveDate: '2026-10-01',
      approverName: null,
      publishedAt: null,
      summary: 'Bản nháp',
      content: 'Nội dung bí mật bản nháp',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const app = createTestApp(createMockStore(recordsWithDraft));

  // Direct access to draft ID returns 404 without leaking metadata
  const draftRes = await app.inject({
    url: '/api/v1/resources/60000000-0000-4000-8000-000000000004',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(draftRes.statusCode, 404);
  assert.equal(draftRes.headers['content-type'], 'application/problem+json; charset=utf-8');
  const draftBody = draftRes.json();
  assert.equal(draftBody.code, 'RESOURCE_NOT_FOUND');
  assert.equal(draftBody.status, 404);
  assert.equal(draftBody.content, undefined);
  assert.equal(draftBody.summary, undefined);

  // Non-existent ID returns 404
  const notFoundRes = await app.inject({
    url: '/api/v1/resources/00000000-0000-0000-0000-000000000000',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(notFoundRes.statusCode, 404);
  await app.close();
});

test('Authentication: unauthenticated or revoked tokens are rejected with RFC 9457', async () => {
  const app = createTestApp();

  const noToken = await app.inject({ url: '/api/v1/resources' });
  assert.equal(noToken.statusCode, 401);
  assert.equal(noToken.headers['www-authenticate'], 'Bearer');

  const revoked = await app.inject({
    url: '/api/v1/resources',
    headers: { authorization: 'Bearer revoked' },
  });
  assert.equal(revoked.statusCode, 403);
  await app.close();
});

test('AI retrieval endpoint returns published knowledge with provenance and ignores drafts', async () => {
  const recordsWithDraft = [
    ...mockSampleResources,
    {
      id: '60000000-0000-4000-8000-000000000004',
      code: 'SOP-SEC-DRAFT',
      type: 'sop',
      title: 'Quy trình an toàn thông tin - bản nháp bảo hành',
      status: 'draft',
      version: '0.1.0',
      effectiveDate: '2026-10-01',
      approverName: null,
      publishedAt: null,
      summary: 'Bản nháp',
      content: 'Nội dung bí mật bản nháp',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const app = createTestApp(createMockStore(recordsWithDraft));

  const aiRes = await app.inject({
    url: '/api/v1/resources/ai/retrieve?query=b%E1%BA%A3o%20h%C3%A0nh',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(aiRes.statusCode, 200);
  const data = aiRes.json();
  assert.equal(data.query, 'bảo hành');
  assert.equal(data.results.length, 1);

  const result = data.results[0];
  assert.equal(result.code, 'SOP-WAR-001');
  assert.equal(result.version, '1.0.0');
  assert.ok(result.provenance);
  assert.equal(result.provenance.source, 'dx_core.resources');
  assert.equal(result.provenance.docCode, 'SOP-WAR-001');
  assert.equal(result.provenance.version, '1.0.0');
  assert.ok(result.provenance.publishedAt);

  // Missing query parameter returns 400
  const missingQuery = await app.inject({
    url: '/api/v1/resources/ai/retrieve',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(missingQuery.statusCode, 400);

  // Empty query string returns 400
  const emptyQuery = await app.inject({
    url: '/api/v1/resources/ai/retrieve?query=',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(emptyQuery.statusCode, 400);
  await app.close();
});

test('PostgresResourceStore query structure conforms to database schema', async () => {
  let executedSql = '';
  let executedParams = [];
  const fakePool = {
    async query(sql, params) {
      executedSql = sql;
      executedParams = params;
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ total: '1' }] };
      }
      return {
        rows: [
          {
            id: '60000000-0000-4000-8000-000000000001',
            code: 'SOP-TKT-001',
            type: 'sop',
            title: 'Quy trình tiếp nhận và phân công ticket',
            status: 'published',
            version: '1.0.0',
            effective_date: new Date('2026-01-01'),
            approver_name: 'Ban Giám đốc',
            published_at: new Date('2026-01-01T08:00:00Z'),
            summary: 'Quy định các bước',
            content: 'Nội dung',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };
    },
  };

  const store = new PostgresResourceStore(fakePool);
  const result = await store.listPublished({ type: 'sop', search: 'ticket', limit: 10, offset: 0 });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.ok(executedSql.includes("status = 'published'"));
  assert.ok(executedSql.includes('effective_date <= CURRENT_DATE'));
  assert.ok(executedSql.includes('type = $1'));
  assert.equal(executedParams[0], 'sop');
  assert.equal(executedParams[1], '%ticket%');

  const detail = await store.getPublishedById('60000000-0000-4000-8000-000000000001');
  assert.ok(detail);
  assert.equal(detail.code, 'SOP-TKT-001');
  assert.ok(executedSql.includes("status = 'published'"));
  assert.ok(executedSql.includes('id = $1'));
  assert.ok(!executedSql.includes('code = $1'));

  const detailByCode = await store.getPublishedById('SOP-TKT-001');
  assert.ok(detailByCode);
  assert.ok(executedSql.includes('code = $1'));
  assert.ok(!executedSql.includes('id = $1'));
});

test('GET /api/v1/resources/{id} supports lookup by document code', async () => {
  const app = createTestApp();
  const response = await app.inject({
    url: '/api/v1/resources/SOP-TKT-001',
    headers: { authorization: 'Bearer valid-token' },
  });

  assert.equal(response.statusCode, 200);
  const data = response.json();
  assert.equal(data.code, 'SOP-TKT-001');
  assert.equal(data.id, '60000000-0000-4000-8000-000000000001');
  assert.equal(data.status, 'published');
  await app.close();
});

test('Published resources with future effective_date are rejected from list, detail, and AI retrieval', async () => {
  const recordsWithFuture = [
    ...mockSampleResources,
    {
      id: '60000000-0000-4000-8000-000000000005',
      code: 'SOP-FUT-001',
      type: 'sop',
      title: 'Quy trình tương lai chưa có hiệu lực',
      status: 'published',
      version: '2.0.0',
      effectiveDate: '2099-01-01',
      approverName: 'Ban Giám đốc',
      publishedAt: new Date(),
      summary: 'Quy trình tương lai',
      content: 'Nội dung quy trình tương lai',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const app = createTestApp(createMockStore(recordsWithFuture));

  // 1. List endpoint should not return it
  const listRes = await app.inject({
    url: '/api/v1/resources?search=t%C6%B0%C6%A1ng%20lai',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(listRes.statusCode, 200);
  const listData = listRes.json();
  assert.equal(listData.total, 0);

  // 2. Detail endpoint should return 404
  const detailRes = await app.inject({
    url: '/api/v1/resources/60000000-0000-4000-8000-000000000005',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(detailRes.statusCode, 404);

  const detailByCodeRes = await app.inject({
    url: '/api/v1/resources/SOP-FUT-001',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(detailByCodeRes.statusCode, 404);

  // 3. AI retrieval should not return it
  const aiRes = await app.inject({
    url: '/api/v1/resources/ai/retrieve?query=t%C6%B0%C6%A1ng%20lai',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(aiRes.statusCode, 200);
  const aiData = aiRes.json();
  assert.equal(aiData.results.length, 0);

  await app.close();
});

