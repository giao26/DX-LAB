import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { buildApp } from '../dist/adapters/http/app.js';
import { AuthenticationError } from '../dist/application/principal.js';
import { ReadReportingUseCase } from '../dist/application/read-reporting.js';
import { CsatError, PostgresReportingStore } from '../dist/adapters/postgres/reporting-store.js';
import {
  calculateCsat,
  calculateStepDurations,
  calculateReportingMetrics,
  createReportingGrant,
  verifyReportingGrant,
  resolveReportingScope,
  ReportingAccessError,
  ReportingValidationError,
} from '../dist/domain/reporting.js';

const mockTickets = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    code: 'DX-202609-0001',
    status: 'CLOSED',
    provisionalType: 'Bảo hành',
    groupId: 'warranty',
    assignedSub: 'staff-1',
    receivedAt: '2026-09-10T08:00:00.000Z',
    closedAt: '2026-09-10T10:00:00.000Z',
    slaDueAt: '2026-09-10T12:00:00.000Z',
    slaOverdue: false,
    processingSteps: [
      { id: '1', label: 'Tiếp nhận sản phẩm', startedAt: '2026-09-10T08:00:00.000Z', endedAt: '2026-09-10T08:15:00.000Z' },
      { id: '2', label: 'Kiểm tra', startedAt: '2026-09-10T08:15:00.000Z', endedAt: '2026-09-10T09:00:00.000Z' },
    ],
    csatScore: 5,
    csatCreatedAt: '2026-09-10T10:30:00.000Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    code: 'DX-202609-0002',
    status: 'CLOSED',
    provisionalType: 'Bảo hành',
    groupId: 'warranty',
    assignedSub: 'staff-1',
    receivedAt: '2026-09-11T08:00:00.000Z',
    closedAt: '2026-09-11T11:00:00.000Z',
    slaDueAt: '2026-09-11T12:00:00.000Z',
    slaOverdue: false,
    processingSteps: [
      { id: '1', label: 'Tiếp nhận sản phẩm', startedAt: '2026-09-11T08:00:00.000Z', endedAt: '2026-09-11T08:20:00.000Z' },
      { id: '2', label: 'Kiểm tra', startedAt: '2026-09-11T08:20:00.000Z', endedAt: '2026-09-11T09:00:00.000Z' },
    ],
    csatScore: 4,
    csatCreatedAt: '2026-09-11T11:30:00.000Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    code: 'DX-202609-0003',
    status: 'CLOSED',
    provisionalType: 'Bảo hành',
    groupId: 'warranty',
    assignedSub: 'staff-2',
    receivedAt: '2026-09-12T08:00:00.000Z',
    closedAt: '2026-09-12T14:00:00.000Z',
    slaDueAt: '2026-09-12T12:00:00.000Z',
    slaOverdue: true,
    processingSteps: [
      { id: '1', label: 'Tiếp nhận sản phẩm', startedAt: '2026-09-12T08:00:00.000Z', endedAt: '2026-09-12T08:10:00.000Z' },
      { id: '2', label: 'Kiểm tra', startedAt: '2026-09-12T08:10:00.000Z', endedAt: '2026-09-12T09:30:00.000Z' },
    ],
    csatScore: 2,
    csatCreatedAt: '2026-09-12T15:00:00.000Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    code: 'DX-202609-0004',
    status: 'CLOSED',
    provisionalType: 'Bảo hành',
    groupId: 'warranty',
    assignedSub: 'staff-2',
    receivedAt: '2026-09-13T08:00:00.000Z',
    closedAt: '2026-09-13T10:00:00.000Z',
    slaDueAt: '2026-09-13T12:00:00.000Z',
    slaOverdue: false,
    processingSteps: [],
    csatScore: 5,
    csatCreatedAt: '2026-09-13T10:30:00.000Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    code: 'DX-202609-0005',
    status: 'CLOSED',
    provisionalType: 'Bảo hành',
    groupId: 'warranty',
    assignedSub: 'staff-1',
    receivedAt: '2026-09-14T08:00:00.000Z',
    closedAt: '2026-09-14T10:00:00.000Z',
    slaDueAt: '2026-09-14T12:00:00.000Z',
    slaOverdue: false,
    processingSteps: [],
    csatScore: 5,
    csatCreatedAt: '2026-09-14T10:30:00.000Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    code: 'DX-202609-0006',
    status: 'IN_PROGRESS',
    provisionalType: 'Bảo hành',
    groupId: 'warranty',
    assignedSub: 'staff-1',
    receivedAt: '2026-09-15T08:00:00.000Z',
    closedAt: null,
    slaDueAt: '2026-09-15T12:00:00.000Z',
    slaOverdue: false,
    processingSteps: [],
    csatScore: null,
    csatCreatedAt: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    code: 'DX-202609-0007',
    status: 'WAITING',
    provisionalType: 'Khiếu nại',
    groupId: 'complaints',
    assignedSub: null,
    receivedAt: '2026-09-15T09:00:00.000Z',
    closedAt: null,
    slaDueAt: '2026-09-15T13:00:00.000Z',
    slaOverdue: false,
    processingSteps: [],
    csatScore: null,
    csatCreatedAt: null,
  },
];

function createMockStore(tickets = mockTickets) {
  const csatMap = new Map();
  // seed existing
  for (const t of tickets) {
    if (t.csatScore) {
      csatMap.set(t.id, {
        id: `csat-${t.id}`,
        ticketId: t.id,
        score: t.csatScore,
        comment: 'Phản hồi tốt',
        createdAt: t.csatCreatedAt || new Date().toISOString(),
      });
    }
  }

  return {
    async queryReportingTickets({ groupIds }) {
      return tickets.filter((t) => groupIds.includes(t.groupId));
    },
    async saveCsatRating({ ticketId, score, comment }) {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) {
        throw new CsatError(404, 'TICKET_NOT_FOUND', 'Không tìm thấy ticket để đánh giá CSAT.');
      }
      if (ticket.status !== 'CLOSED') {
        throw new CsatError(422, 'TICKET_NOT_CLOSED', 'Chỉ có thể đánh giá CSAT cho ticket đã hoàn tất.');
      }
      if (csatMap.has(ticketId)) {
        throw new CsatError(409, 'CSAT_ALREADY_EXISTS', 'Ticket này đã được gửi phản hồi CSAT trước đó.');
      }
      const record = {
        id: `csat-${ticketId}`,
        ticketId,
        score,
        comment: comment || null,
        createdAt: new Date().toISOString(),
      };
      csatMap.set(ticketId, record);
      return record;
    },
    async getCsatRating(ticketId) {
      return csatMap.get(ticketId) || null;
    },
  };
}

function createMockApp({
  principal = { sub: 'lead-1', clientId: 'web', roles: ['group_lead'], groupIds: ['warranty'], scopes: ['reporting:read'] },
  verifyError = null,
  store = createMockStore(),
  auditRecords = [],
} = {}) {
  const auditPort = {
    async recordAudit(entry) {
      auditRecords.push(entry);
    },
  };

  const readReporting = new ReadReportingUseCase(store, auditPort, 'test-secret-key-for-reporting-hmac-32');

  const identityVerifier = {
    async verify(_auth, scope) {
      if (verifyError) throw verifyError;
      return principal;
    },
  };

  return {
    app: buildApp({ logger: false }, { readReporting, identityVerifier }),
    auditRecords,
    store,
  };
}

// ---------------------------------------------------------------------------
// 1. Domain Unit Tests: CSAT Formula & Edge Cases
// ---------------------------------------------------------------------------
test('CSAT: Khi chưa có phản hồi, trả rate_percent: null, average_score: null, response_count: 0 (không tính là 0%)', () => {
  const emptyRatings = [{ score: null }, { score: null }, { score: null }];
  const csat = calculateCsat(emptyRatings, 3);
  assert.equal(csat.rate_percent, null);
  assert.equal(csat.response_count, 0);
  assert.equal(csat.average_score, null);
  assert.equal(csat.unanswered_count, 3);
});

test('CSAT: Phản hồi hỗn hợp (3x 5 sao, 1x 4 sao, 1x 2 sao) -> rate 80.0%, count 5, avg 4.20', () => {
  const ratings = [
    { score: 5 },
    { score: 5 },
    { score: 5 },
    { score: 4 },
    { score: 2 },
  ];
  const csat = calculateCsat(ratings, 5);
  assert.equal(csat.rate_percent, 80.0);
  assert.equal(csat.response_count, 5);
  assert.equal(csat.average_score, 4.20);
  assert.equal(csat.unanswered_count, 0);
});

test('CSAT: Tính chính xác số lượng chưa phản hồi khi có ticket đóng nhưng chưa đánh giá', () => {
  const ratings = [{ score: 5 }, { score: 4 }, { score: null }, { score: null }];
  const csat = calculateCsat(ratings, 4);
  assert.equal(csat.rate_percent, 100.0);
  assert.equal(csat.response_count, 2);
  assert.equal(csat.average_score, 4.50);
  assert.equal(csat.unanswered_count, 2);
});

// ---------------------------------------------------------------------------
// 2. Domain Unit Tests: Step Durations Calculation
// ---------------------------------------------------------------------------
test('Thời gian bước: Tính thời gian trung bình từng bước chính xác theo phút', () => {
  const stepsList = [
    [
      { id: '1', label: 'Tiếp nhận sản phẩm', startedAt: '2026-09-10T08:00:00.000Z', endedAt: '2026-09-10T08:15:00.000Z' }, // 15 mins
      { id: '2', label: 'Kiểm tra', startedAt: '2026-09-10T08:15:00.000Z', endedAt: '2026-09-10T08:55:00.000Z' }, // 40 mins
    ],
    [
      { id: '1', label: 'Tiếp nhận sản phẩm', startedAt: '2026-09-11T08:00:00.000Z', endedAt: '2026-09-11T08:25:00.000Z' }, // 25 mins
      { id: '2', label: 'Kiểm tra', startedAt: '2026-09-11T08:25:00.000Z', endedAt: '2026-09-11T09:09:00.000Z' }, // 44 mins
    ],
  ];

  const durations = calculateStepDurations(stepsList);
  assert.equal(durations.length, 2);
  assert.equal(durations[0].step_id, '1');
  assert.equal(durations[0].label, 'Tiếp nhận sản phẩm');
  assert.equal(durations[0].avg_duration_minutes, 20.0); // (15 + 25) / 2 = 20.0

  assert.equal(durations[1].step_id, '2');
  assert.equal(durations[1].label, 'Kiểm tra');
  assert.equal(durations[1].avg_duration_minutes, 42.0); // (40 + 44) / 2 = 42.0
});

// ---------------------------------------------------------------------------
// 3. Domain Unit Tests: Reporting Scope & Deny-by-default
// ---------------------------------------------------------------------------
test('Phân quyền: Nhân viên thường (employee) bị từ chối truy cập báo cáo', () => {
  const principal = { sub: 'emp-1', clientId: 'web', roles: ['employee'], groupIds: ['warranty'], scopes: ['reporting:read'] };
  assert.throws(
    () => resolveReportingScope(principal),
    (err) => err instanceof ReportingAccessError && err.statusCode === 403,
  );
});

test('Phân quyền: Trưởng nhóm chỉ truy cập nhóm được phân công, cố tình xem nhóm khác bị 403', () => {
  const principal = { sub: 'lead-1', clientId: 'web', roles: ['group_lead'], groupIds: ['warranty'], scopes: ['reporting:read'] };

  // Valid scope: without group_id or with warranty
  const scopeAll = resolveReportingScope(principal);
  assert.deepEqual(scopeAll.groups, ['warranty']);

  const scopeWarranty = resolveReportingScope(principal, 'warranty');
  assert.deepEqual(scopeWarranty.groups, ['warranty']);

  // Forbidden group
  assert.throws(
    () => resolveReportingScope(principal, 'complaints'),
    (err) => err instanceof ReportingAccessError && err.statusCode === 403,
  );
});

test('Phân quyền: Giám đốc và Trưởng phòng truy cập toàn bộ tổ chức hoặc lọc nhóm bất kỳ', () => {
  const director = { sub: 'dir-1', clientId: 'web', roles: ['director'], groupIds: [], scopes: ['reporting:read'] };
  const scopeAll = resolveReportingScope(director);
  assert.deepEqual(scopeAll.groups, ['complaints', 'consulting', 'warranty']);

  const scopeComplaints = resolveReportingScope(director, 'complaints');
  assert.deepEqual(scopeComplaints.groups, ['complaints']);

  const deptHead = { sub: 'head-1', clientId: 'web', roles: ['department_head'], groupIds: [], scopes: ['reporting:read'] };
  const scopeHead = resolveReportingScope(deptHead);
  assert.deepEqual(scopeHead.groups, ['complaints', 'consulting', 'warranty']);
});

// ---------------------------------------------------------------------------
// 4. Domain Unit Tests: HMAC Grant Token Creation & Verification
// ---------------------------------------------------------------------------
test('Grant HMAC: Tạo token hợp lệ thời hạn 5 phút và xác thực thành công', () => {
  const testHmacKey = 'test-reporting-hmac-key-32-bytes!';
  const principal = { sub: 'lead-1', clientId: 'web', roles: ['group_lead'], groupIds: ['warranty'], scopes: ['reporting:read'] };

  const grant = createReportingGrant(principal, undefined, testHmacKey, 300);
  assert.ok(grant.grant_token);
  assert.equal(grant.sub, 'lead-1');
  assert.deepEqual(grant.allowed_groups, ['warranty']);
  assert.ok(grant.signature);

  const verified = verifyReportingGrant(grant.grant_token, testHmacKey);
  assert.equal(verified.sub, 'lead-1');
  assert.deepEqual(verified.allowed_groups, ['warranty']);
});

test('Grant HMAC: Token bị giả mạo hoặc sai secret bị từ chối 401', () => {
  const testHmacKey = 'test-reporting-hmac-key-32-bytes!';
  const principal = { sub: 'lead-1', clientId: 'web', roles: ['group_lead'], groupIds: ['warranty'], scopes: ['reporting:read'] };

  const grant = createReportingGrant(principal, undefined, testHmacKey, 300);

  // Tamper signature
  const tamperedToken = `${grant.grant_token.slice(0, -4)}ffff`;
  assert.throws(
    () => verifyReportingGrant(tamperedToken, testHmacKey),
    (err) => err instanceof ReportingAccessError && err.statusCode === 401,
  );

  // Wrong secret
  assert.throws(
    () => verifyReportingGrant(grant.grant_token, 'test-wrong-key-32-bytes-long!'),
    (err) => err instanceof ReportingAccessError && err.statusCode === 401,
  );
});

test('Grant HMAC: Trưởng nhóm yêu cầu nhóm ngoài quyền bị từ chối 403', () => {
  const testHmacKey = 'test-reporting-hmac-key-32-bytes!';
  const principal = { sub: 'lead-1', clientId: 'web', roles: ['group_lead'], groupIds: ['warranty'], scopes: ['reporting:read'] };

  assert.throws(
    () => createReportingGrant(principal, ['complaints'], testHmacKey),
    (err) => err instanceof ReportingAccessError && err.statusCode === 403,
  );
});

// ---------------------------------------------------------------------------
// 5. HTTP Integration Tests: GET /api/v1/reporting/metrics
// ---------------------------------------------------------------------------
test('HTTP GET /api/v1/reporting/metrics: Trưởng nhóm truy vấn thành công trong phạm vi nhóm warranty', async (t) => {
  const { app, auditRecords } = createMockApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/reporting/metrics',
    headers: { authorization: 'Bearer lead-token' },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['cache-control'], 'private, no-store');

  const body = res.json();
  assert.equal(body.definition_version, 'v1.0');
  assert.deepEqual(body.scope.groups, ['warranty']);
  assert.equal(body.scope.role, 'group_lead');

  // Verify KPIs
  assert.equal(body.kpis.new_tickets.value, 6); // 6 warranty tickets
  assert.equal(body.kpis.closed_tickets.value, 5); // 5 closed warranty tickets
  assert.equal(body.kpis.backlog_tickets.value, 1); // 1 in_progress warranty ticket
  assert.equal(body.kpis.within_sla_tickets.value, 4); // 4 within SLA
  assert.equal(body.kpis.within_sla_tickets.denominator, 5);
  assert.equal(body.kpis.overdue_sla_tickets.value, 1); // 1 overdue SLA
  assert.equal(body.kpis.overdue_sla_tickets.denominator, 5);

  // CSAT: 5 closed tickets (ratings: 5, 4, 2, 5, 5) -> 4 are 4-5 stars -> 80.0%
  assert.equal(body.kpis.csat.rate_percent, 80.0);
  assert.equal(body.kpis.csat.response_count, 5);
  assert.equal(body.kpis.csat.average_score, 4.20);
  assert.equal(body.kpis.csat.unanswered_count, 0);

  // Step durations
  assert.ok(Array.isArray(body.step_durations));
  assert.ok(body.step_durations.length >= 2);

  // Audit record verified
  assert.ok(auditRecords.some((r) => r.action === 'reporting.metrics.view' && r.actorSub === 'lead-1'));
});

test('HTTP GET /api/v1/reporting/metrics: Trưởng nhóm cố xem nhóm ngoài quyền bị HTTP 403 không làm lộ dữ liệu', async (t) => {
  const { app } = createMockApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/reporting/metrics?group_id=complaints',
    headers: { authorization: 'Bearer lead-token' },
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.headers['content-type'], 'application/problem+json; charset=utf-8');
  const body = res.json();
  assert.equal(body.status, 403);
  assert.equal(body.code, 'ACCESS_DENIED');
  assert.ok(!JSON.stringify(body).includes('Khiếu nại'));
});

test('HTTP GET /api/v1/reporting/metrics: Giám đốc truy vấn toàn bộ tổ chức có audit log đầy đủ', async (t) => {
  const { app, auditRecords } = createMockApp({
    principal: { sub: 'dir-1', clientId: 'web', roles: ['director'], groupIds: [], scopes: ['reporting:read'] },
  });
  t.after(() => app.close());

  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/reporting/metrics',
    headers: { authorization: 'Bearer director-token' },
  });

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.scope.role, 'director');
  assert.deepEqual(body.scope.groups, ['complaints', 'consulting', 'warranty']);
  assert.equal(body.kpis.new_tickets.value, 7); // all 7 tickets

  // Audit record checked
  const audit = auditRecords.find((r) => r.action === 'reporting.metrics.view');
  assert.ok(audit);
  assert.equal(audit.actorSub, 'dir-1');
  assert.deepEqual(audit.metadata.groups, ['complaints', 'consulting', 'warranty']);
});

test('HTTP GET /api/v1/reporting/metrics: Nhân viên (employee) bị từ chối 403 theo deny-by-default', async (t) => {
  const { app } = createMockApp({
    principal: { sub: 'emp-1', clientId: 'web', roles: ['employee'], groupIds: ['warranty'], scopes: ['reporting:read'] },
  });
  t.after(() => app.close());

  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/reporting/metrics',
    headers: { authorization: 'Bearer employee-token' },
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.json().code, 'ACCESS_DENIED');
});

test('HTTP GET /api/v1/reporting/metrics: Token không hợp lệ trả HTTP 401', async (t) => {
  const { app } = createMockApp({
    verifyError: new AuthenticationError('Token không hợp lệ.', 401),
  });
  t.after(() => app.close());

  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/reporting/metrics',
    headers: { authorization: 'Bearer expired' },
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.headers['www-authenticate'], 'Bearer');
});

test('HTTP GET /api/v1/reporting/metrics: Tham số kỳ báo cáo sai (from > to) trả HTTP 400', async (t) => {
  const { app } = createMockApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/reporting/metrics?from=2026-09-20T00:00:00Z&to=2026-09-10T00:00:00Z',
    headers: { authorization: 'Bearer lead-token' },
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.json().code, 'VALIDATION_ERROR');
});

// ---------------------------------------------------------------------------
// 6. HTTP Integration Tests: POST /api/v1/reporting/grants
// ---------------------------------------------------------------------------
test('HTTP POST /api/v1/reporting/grants: Cấp grant hợp lệ thời hạn 5 phút với chữ ký HMAC', async (t) => {
  const { app, auditRecords } = createMockApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/reporting/grants',
    headers: { authorization: 'Bearer lead-token' },
    payload: {},
  });

  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.ok(body.grant_token);
  assert.equal(body.sub, 'lead-1');
  assert.deepEqual(body.allowed_groups, ['warranty']);
  assert.ok(body.expires_at);
  assert.ok(body.signature);

  // Check grant issuance audit
  assert.ok(auditRecords.some((r) => r.action === 'reporting.grant.issue' && r.actorSub === 'lead-1'));
});

test('HTTP POST /api/v1/reporting/grants: Trưởng nhóm xin grant ngoài quyền bị 403', async (t) => {
  const { app } = createMockApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/reporting/grants',
    headers: { authorization: 'Bearer lead-token' },
    payload: { groups: ['complaints'] },
  });

  assert.equal(res.statusCode, 403);
});

// ---------------------------------------------------------------------------
// 7. HTTP Integration Tests: POST /api/v1/tickets/:ticketId/csat
// ---------------------------------------------------------------------------
test('HTTP POST /api/v1/tickets/:ticketId/csat: Gửi đánh giá CSAT thành công cho ticket đã đóng', async (t) => {
  // Ticket 5 without prior CSAT in a custom store
  const ticketsWithoutCsat = mockTickets.map((t) => (t.id === mockTickets[4].id ? { ...t, csatScore: null } : t));
  const { app } = createMockApp({ store: createMockStore(ticketsWithoutCsat) });
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/tickets/${mockTickets[4].id}/csat`,
    payload: {
      score: 5,
      comment: 'Kỹ thuật viên rất nhiệt tình!',
    },
  });

  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.ticketId, mockTickets[4].id);
  assert.equal(body.score, 5);
  assert.equal(body.comment, 'Kỹ thuật viên rất nhiệt tình!');
});

test('HTTP POST /api/v1/tickets/:ticketId/csat: Gửi lại CSAT cho ticket đã có đánh giá trả 409 Conflict', async (t) => {
  const { app } = createMockApp();
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/tickets/${mockTickets[0].id}/csat`, // Already has csat in mockStore
    payload: { score: 4 },
  });

  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'CSAT_ALREADY_EXISTS');
});

test('HTTP POST /api/v1/tickets/:ticketId/csat: Ticket chưa đóng (IN_PROGRESS) trả 422 Unprocessable', async (t) => {
  const { app } = createMockApp();
  t.after(() => app.close());

  const inProgressTicketId = mockTickets[5].id;
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/tickets/${inProgressTicketId}/csat`,
    payload: { score: 4 },
  });

  assert.equal(res.statusCode, 422);
  assert.equal(res.json().code, 'TICKET_NOT_CLOSED');
});

test('HTTP POST /api/v1/tickets/:ticketId/csat: Điểm CSAT không hợp lệ (<1 hoặc >5) trả 400', async (t) => {
  const { app } = createMockApp();
  t.after(() => app.close());

  const resUnder = await app.inject({
    method: 'POST',
    url: `/api/v1/tickets/${mockTickets[0].id}/csat`,
    payload: { score: 0 },
  });
  assert.equal(resUnder.statusCode, 400);

  const resOver = await app.inject({
    method: 'POST',
    url: `/api/v1/tickets/${mockTickets[0].id}/csat`,
    payload: { score: 6 },
  });
  assert.equal(resOver.statusCode, 400);

  const resNonInt = await app.inject({
    method: 'POST',
    url: `/api/v1/tickets/${mockTickets[0].id}/csat`,
    payload: { score: 4.5 },
  });
  assert.equal(resNonInt.statusCode, 400);
});

test('HTTP POST /api/v1/tickets/:ticketId/csat: Ticket không tồn tại trả 404', async (t) => {
  const { app } = createMockApp();
  t.after(() => app.close());

  const nonExistentId = '99999999-9999-4999-8999-999999999999';
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/tickets/${nonExistentId}/csat`,
    payload: { score: 5 },
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.json().code, 'TICKET_NOT_FOUND');
});

// ---------------------------------------------------------------------------
// 8. PostgresReportingStore Unit Tests with Mock Pool & Concurrency
// ---------------------------------------------------------------------------
test('PostgresReportingStore: queryReportingTickets lọc from/to và groupIds chính xác', async () => {
  const queries = [];
  const mockPool = {
    async query(sql, params) {
      queries.push({ sql, params });
      return {
        rows: [
          {
            id: '10000000-0000-4000-8000-000000000001',
            code: 'DX-202609-0001',
            status: 'CLOSED',
            provisional_type: 'Bảo hành',
            group_id: 'warranty',
            assigned_sub: 'staff-1',
            received_at: new Date('2026-09-10T08:00:00.000Z'),
            closed_at: new Date('2026-09-10T10:00:00.000Z'),
            sla_due_at: new Date('2026-09-10T12:00:00.000Z'),
            sla_overdue: false,
            processing_steps: JSON.stringify([{ id: '1', label: 'Tiếp nhận', startedAt: '2026-09-10T08:00:00.000Z', endedAt: '2026-09-10T08:15:00.000Z' }]),
            csat_score: 5,
            csat_created_at: new Date('2026-09-10T10:30:00.000Z'),
          },
        ],
      };
    },
  };

  const store = new PostgresReportingStore(mockPool);
  const from = new Date('2026-09-01T00:00:00.000Z');
  const to = new Date('2026-09-20T23:59:59.999Z');
  const rows = await store.queryReportingTickets({ from, to, groupIds: ['warranty'] });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, '10000000-0000-4000-8000-000000000001');
  assert.equal(rows[0].code, 'DX-202609-0001');
  assert.equal(rows[0].csatScore, 5);
  assert.equal(rows[0].processingSteps.length, 1);

  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /FROM dx_core\.v_reporting_tickets_v1/);
  assert.match(queries[0].sql, /received_at >= \$1/);
  assert.match(queries[0].sql, /received_at <= \$2/);
  assert.match(queries[0].sql, /group_id = ANY\(\$3::text\[\]\)/);
  assert.deepEqual(queries[0].params, [from, to, ['warranty']]);

  // When groupIds is empty, returns empty array without querying database
  const emptyRows = await store.queryReportingTickets({ from, to, groupIds: [] });
  assert.equal(emptyRows.length, 0);
  assert.equal(queries.length, 1);
});

test('PostgresReportingStore: saveCsatRating bắt lỗi race condition 23505 và ném CsatError 409', async () => {
  const mockPool = {
    async query(sql, params) {
      if (sql.includes('SELECT id, status FROM dx_core.tickets')) {
        return { rowCount: 1, rows: [{ id: params[0], status: 'CLOSED' }] };
      }
      if (sql.includes('SELECT id FROM dx_core.csat_ratings')) {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes('INSERT INTO dx_core.csat_ratings')) {
        const err = new Error('duplicate key value violates unique constraint');
        err.code = '23505';
        throw err;
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  const store = new PostgresReportingStore(mockPool);
  await assert.rejects(
    () => store.saveCsatRating({ ticketId: '10000000-0000-4000-8000-000000000001', score: 5 }),
    (err) => err instanceof CsatError && err.statusCode === 409 && err.code === 'CSAT_ALREADY_EXISTS',
  );
});

// ---------------------------------------------------------------------------
// 9. Grant Expiration NaN & Invalid Scope Unit Tests
// ---------------------------------------------------------------------------
test('Grant HMAC: Token có expires_at là chuỗi sai khiến Date.parse trả về NaN bị từ chối 401', () => {
  const testHmacKey = 'test-reporting-hmac-key-32-bytes!';
  const payload = {
    sub: 'lead-1',
    roles: ['group_lead'],
    allowed_groups: ['warranty'],
    issued_at: new Date().toISOString(),
    expires_at: 'invalid-date-format',
  };

  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', testHmacKey).update(payloadEncoded).digest('hex');
  const tamperedToken = `${payloadEncoded}.${signature}`;

  assert.throws(
    () => verifyReportingGrant(tamperedToken, testHmacKey),
    (err) => err instanceof ReportingAccessError && err.statusCode === 401 && err.message.includes('Grant token đã hết hạn hoặc không hợp lệ'),
  );
});

test('Phân quyền & Grant: requestedGroups không phải mảng chuỗi hoặc chứa nhóm không thuộc ALL_SYSTEM_GROUPS bị từ chối 403', () => {
  const testHmacKey = 'test-reporting-hmac-key-32-bytes!';
  const director = { sub: 'dir-1', clientId: 'web', roles: ['director'], groupIds: [], scopes: ['reporting:read'] };

  // Nhóm không thuộc ALL_SYSTEM_GROUPS trong resolveReportingScope
  assert.throws(
    () => resolveReportingScope(director, 'finance'),
    (err) => err instanceof ReportingAccessError && err.statusCode === 403,
  );

  // Nhóm không thuộc ALL_SYSTEM_GROUPS trong createReportingGrant
  assert.throws(
    () => createReportingGrant(director, ['finance'], testHmacKey),
    (err) => err instanceof ReportingAccessError && err.statusCode === 403,
  );

  // requestedGroups không phải mảng chuỗi hợp lệ
  assert.throws(
    () => createReportingGrant(director, 'not-an-array', testHmacKey),
    (err) => err instanceof ReportingAccessError && err.statusCode === 403,
  );
});

// ---------------------------------------------------------------------------
// 10. submitCsat Audit Logging Test
// ---------------------------------------------------------------------------
test('submitCsat: Ghi nhận audit log reporting:csat_submitted khi khách gửi CSAT thành công', async () => {
  const auditRecords = [];
  const mockStore = createMockStore([
    {
      id: '10000000-0000-4000-8000-000000000099',
      status: 'CLOSED',
      csatScore: null,
    },
  ]);

  const auditPort = {
    async recordAudit(entry) {
      auditRecords.push(entry);
    },
  };

  const useCase = new ReadReportingUseCase(mockStore, auditPort, 'test-key-32-chars-long-reporting!');
  const ticketId = '10000000-0000-4000-8000-000000000099';

  await useCase.submitCsat(ticketId, { score: 5, comment: 'Rất hài lòng' });

  assert.equal(auditRecords.length, 1);
  const record = auditRecords[0];
  assert.equal(record.action, 'reporting:csat_submitted');
  assert.equal(record.aggregateType, 'ticket');
  assert.equal(record.aggregateId, ticketId);
  assert.equal(record.metadata.score, 5);
  assert.equal(record.metadata.hasComment, true);
});
