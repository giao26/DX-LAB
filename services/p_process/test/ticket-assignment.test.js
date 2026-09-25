import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectStaffForAssignment,
  buildTicketAssignedPayload,
} from '../dist/domain/assignment.js';
import { PostgresAssignmentStore } from '../dist/adapters/postgres/assignment-store.js';
import {
  ProcessOutboxEventsUseCase,
  HttpOdooEventRelay,
  MAX_OUTBOX_RETRIES,
} from '../dist/application/process-outbox-events.js';
import { PostgresTicketIntakeStore } from '../dist/adapters/postgres/ticket-intake-store.js';

// =============================================================================
// 1. PURE DOMAIN LOGIC TESTS FOR FAIR ASSIGNMENT
// =============================================================================

test('selectStaffForAssignment: ưu tiên nhân viên có số lượt nhận ít nhất', () => {
  const staffA = {
    sub: 'sub-A',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 3,
    lastAssignedAt: '2026-09-24T10:00:00Z',
  };
  const staffB = {
    sub: 'sub-B',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 1,
    lastAssignedAt: '2026-09-24T11:00:00Z',
  };
  const staffC = {
    sub: 'sub-C',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 2,
    lastAssignedAt: '2026-09-24T09:00:00Z',
  };

  const selected = selectStaffForAssignment([staffA, staffB, staffC], new Set());
  assert.equal(selected?.sub, 'sub-B');
});

test('selectStaffForAssignment: bằng lượt nhận thì ưu tiên người chưa từng nhận (last_assigned_at is null)', () => {
  const staffA = {
    sub: 'sub-A',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 0,
    lastAssignedAt: '2026-09-24T10:00:00Z',
  };
  const staffB = {
    sub: 'sub-B',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 0,
    lastAssignedAt: null,
  };

  const selected = selectStaffForAssignment([staffA, staffB], new Set());
  assert.equal(selected?.sub, 'sub-B');
});

test('selectStaffForAssignment: bằng lượt nhận và đều có timestamp thì ưu tiên người nhận lâu nhất (last_assigned_at cũ hơn)', () => {
  const staffA = {
    sub: 'sub-A',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 2,
    lastAssignedAt: '2026-09-24T12:00:00Z',
  };
  const staffB = {
    sub: 'sub-B',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 2,
    lastAssignedAt: '2026-09-24T08:00:00Z',
  };

  const selected = selectStaffForAssignment([staffA, staffB], new Set());
  assert.equal(selected?.sub, 'sub-B');
});

test('selectStaffForAssignment: bằng tất cả tiêu chí thì chọn theo vòng ID tăng dần (sub ASC)', () => {
  const staffZ = {
    sub: 'sub-Z',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 0,
    lastAssignedAt: null,
  };
  const staffA = {
    sub: 'sub-A',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 0,
    lastAssignedAt: null,
  };

  const selected = selectStaffForAssignment([staffZ, staffA], new Set());
  assert.equal(selected?.sub, 'sub-A');
});

test('selectStaffForAssignment: loại trừ nhân viên đang có ticket hoạt động hoặc không active', () => {
  const staffBusy = {
    sub: 'sub-busy',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 0,
    lastAssignedAt: null,
  };
  const staffInactive = {
    sub: 'sub-inactive',
    groupId: 'warranty',
    isActive: false,
    officialAssignmentCount: 0,
    lastAssignedAt: null,
  };
  const staffAvailable = {
    sub: 'sub-available',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 5,
    lastAssignedAt: '2026-09-24T12:00:00Z',
  };

  const selected = selectStaffForAssignment(
    [staffBusy, staffInactive, staffAvailable],
    new Set(['sub-busy']),
  );
  assert.equal(selected?.sub, 'sub-available');
});

test('selectStaffForAssignment: trả về null khi tất cả nhân viên đều bận', () => {
  const staffBusy1 = {
    sub: 'sub-1',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 0,
    lastAssignedAt: null,
  };
  const staffBusy2 = {
    sub: 'sub-2',
    groupId: 'warranty',
    isActive: true,
    officialAssignmentCount: 1,
    lastAssignedAt: null,
  };

  const selected = selectStaffForAssignment(
    [staffBusy1, staffBusy2],
    new Set(['sub-1', 'sub-2']),
  );
  assert.equal(selected, null);
});

test('buildTicketAssignedPayload: payload an toàn, TUYỆT ĐỐI không chứa PII hoặc file URL', () => {
  const payload = buildTicketAssignedPayload({
    ticketId: 'ticket-uuid-1',
    ticketCode: 'TCK-2026-000001',
    assignedSub: 'staff-sub-1',
    groupId: 'consulting',
  });

  assert.equal(payload.ticket_id, 'ticket-uuid-1');
  assert.equal(payload.ticket_code, 'TCK-2026-000001');
  assert.equal(payload.assigned_sub, 'staff-sub-1');
  assert.equal(payload.group_id, 'consulting');
  assert.equal(payload.assignment_status, 'ASSIGNED');
  assert.equal(payload.internal_ticket_url, '/dx/tickets/workspace/ticket-uuid-1');

  // Verify absence of sensitive customer fields
  const jsonStr = JSON.stringify(payload);
  assert.equal(jsonStr.includes('@'), false);
  assert.equal(jsonStr.includes('customer'), false);
  assert.equal(jsonStr.includes('attachment'), false);
});

// =============================================================================
// 2. STORE TESTS WITH POSTGRES MOCK CLIENT (ROW LOCKING & CONCURRENCY)
// =============================================================================

test('PostgresAssignmentStore: phân công thành công cập nhật lượt nhận, gán ticket và ghi outbox TICKET_ASSIGNED', async () => {
  const queries = [];
  const fakeClient = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('SELECT sub FROM dx_core.staff_roster')) {
        return { rowCount: 1, rows: [{ sub: 'staff-1' }] };
      }
      if (sql.includes('UPDATE dx_core.staff_roster')) {
        return { rowCount: 1, rows: [] };
      }
      if (sql.includes('UPDATE dx_core.tickets')) {
        return { rowCount: 1, rows: [] };
      }
      if (sql.includes('INSERT INTO dx_core.outbox_events')) {
        return { rowCount: 1, rows: [] };
      }
      if (sql.includes('INSERT INTO dx_core.audit_logs')) {
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    },
  };

  const pool = { async connect() { return fakeClient; } };
  const store = new PostgresAssignmentStore(pool);

  const result = await store.assignTicket(
    { id: 'ticket-1', code: 'TCK-2026-000001', groupId: 'warranty' },
    'corr-123',
    fakeClient,
  );

  assert.equal(result.assigned, true);
  assert.equal(result.assignedSub, 'staff-1');

  // Verify row lock in query
  const selectQuery = queries.find((q) => q.sql.includes('SELECT sub FROM dx_core.staff_roster'));
  assert.ok(selectQuery.sql.includes('FOR UPDATE SKIP LOCKED'));
  assert.ok(selectQuery.sql.includes('official_assignment_count ASC'));

  // Verify staff roster counter increment
  const updateStaffQuery = queries.find((q) => q.sql.includes('UPDATE dx_core.staff_roster'));
  assert.ok(updateStaffQuery.sql.includes('official_assignment_count = official_assignment_count + 1'));

  // Verify outbox event TICKET_ASSIGNED
  const outboxQuery = queries.find((q) => q.sql.includes('INSERT INTO dx_core.outbox_events'));
  assert.equal(outboxQuery.params[0], 'ticket-1');
  const payload = JSON.parse(outboxQuery.params[3]);
  assert.equal(payload.assigned_sub, 'staff-1');
  assert.equal(payload.assignment_status, 'ASSIGNED');
});

test('PostgresAssignmentStore: khi tất cả nhân viên bận, ticket giữ nguyên assigned_sub = NULL và vào hàng đợi FIFO', async () => {
  const queries = [];
  const fakeClient = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('SELECT sub FROM dx_core.staff_roster')) {
        // No available staff
        return { rowCount: 0, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    },
  };

  const pool = { async connect() { return fakeClient; } };
  const store = new PostgresAssignmentStore(pool);

  const result = await store.assignTicket(
    { id: 'ticket-busy', code: 'TCK-2026-000002', groupId: 'warranty' },
    'corr-456',
    fakeClient,
  );

  assert.equal(result.assigned, false);
  assert.equal(result.assignedSub, null);

  // No update on tickets or staff roster
  assert.equal(queries.some((q) => q.sql.includes('UPDATE dx_core.tickets')), false);
  assert.equal(queries.some((q) => q.sql.includes('INSERT INTO dx_core.outbox_events')), false);
});

test('PostgresAssignmentStore: tranh chấp đồng thời 2 tiến trình - SKIP LOCKED đảm bảo không 2 ticket gán cùng 1 nhân viên', async () => {
  // Simulate DB state with 1 free staff member
  let staffLocked = false;
  let assignedCount = 0;

  function createSimulatedClient(id) {
    return {
      async query(sql, params) {
        if (sql.includes('SELECT sub FROM dx_core.staff_roster')) {
          if (!staffLocked) {
            staffLocked = true;
            return { rowCount: 1, rows: [{ sub: 'staff-only-one' }] };
          }
          // Concurrent worker encounters locked row and skips it
          return { rowCount: 0, rows: [] };
        }
        if (sql.includes('UPDATE dx_core.staff_roster')) {
          assignedCount++;
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 1, rows: [] };
      },
    };
  }

  const client1 = createSimulatedClient('p1');
  const client2 = createSimulatedClient('p2');

  const pool = { async connect() { return client1; } };
  const store = new PostgresAssignmentStore(pool);

  // Run two assignment attempts concurrently
  const [res1, res2] = await Promise.all([
    store.assignTicket({ id: 't1', code: 'TCK-1', groupId: 'warranty' }, 'c1', client1),
    store.assignTicket({ id: 't2', code: 'TCK-2', groupId: 'warranty' }, 'c2', client2),
  ]);

  const assignedResults = [res1, res2].filter((r) => r.assigned);
  const queuedResults = [res1, res2].filter((r) => !r.assigned);

  assert.equal(assignedResults.length, 1);
  assert.equal(queuedResults.length, 1);
  assert.equal(assignedResults[0].assignedSub, 'staff-only-one');
  assert.equal(queuedResults[0].assignedSub, null);
  assert.equal(assignedCount, 1);
});

test('PostgresAssignmentStore: assignNextQueuedTicket phân công ticket đến sớm nhất trong hàng đợi FIFO khi giải phóng slot', async () => {
  const queries = [];
  const fakeClient = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('SELECT id, code, group_id')) {
        // Earliest waiting ticket
        return {
          rowCount: 1,
          rows: [{ id: 'ticket-fifo-1', code: 'TCK-FIFO-1', group_id: 'warranty' }],
        };
      }
      if (sql.includes('SELECT sub FROM dx_core.staff_roster')) {
        // Staff now freed
        return { rowCount: 1, rows: [{ sub: 'staff-freed' }] };
      }
      return { rowCount: 1, rows: [] };
    },
  };

  const pool = { async connect() { return fakeClient; } };
  const store = new PostgresAssignmentStore(pool);

  const result = await store.assignNextQueuedTicket('warranty', 'corr-free', fakeClient);

  assert.ok(result);
  assert.equal(result.assigned, true);
  assert.equal(result.ticketId, 'ticket-fifo-1');
  assert.equal(result.assignedSub, 'staff-freed');

  // Verify FIFO query uses received_at ASC, id ASC and FOR UPDATE SKIP LOCKED
  const fifoQuery = queries.find((q) => q.sql.includes('ORDER BY received_at ASC, id ASC'));
  assert.ok(fifoQuery);
  assert.ok(fifoQuery.sql.includes('FOR UPDATE SKIP LOCKED'));
});

// =============================================================================
// 3. OUTBOX RELAY USE CASE TESTS (RETRY, BACKOFF, DEAD-LETTER)
// =============================================================================

test('ProcessOutboxEventsUseCase: relay thành công cập nhật trạng thái SENT và ghi audit log', async () => {
  let updatedStatus = null;
  const auditLogs = [];

  const store = {
    async claimPendingEvents() { return []; },
    async updateEventStatus(eventId, status, details) {
      updatedStatus = { eventId, status, details };
    },
  };

  const relayPort = {
    async relayEvent(event) {
      return { success: true };
    },
  };

  const auditPort = {
    async recordAudit(entry) {
      auditLogs.push(entry);
    },
  };

  const useCase = new ProcessOutboxEventsUseCase(store, relayPort, auditPort);

  const event = {
    eventId: 'evt-1',
    eventType: 'TICKET_ASSIGNED',
    aggregateId: 'ticket-1',
    aggregateVersion: 1,
    occurredAt: new Date().toISOString(),
    actorSub: 'system',
    correlationId: 'corr-1',
    causationId: 'cause-1',
    payload: { ticket_code: 'TCK-1' },
    status: 'PENDING',
    retryCount: 0,
  };

  const res = await useCase.processEvent(event);
  assert.equal(res.success, true);
  assert.equal(res.status, 'SENT');
  assert.equal(updatedStatus.status, 'SENT');
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].action, 'outbox.event.relayed');
});

test('ProcessOutboxEventsUseCase: lỗi relay tăng retry_count, sau 3 lần chuyển DEAD_LETTER và ghi nhận cảnh báo vận hành', async () => {
  let updatedStatus = null;
  const auditLogs = [];

  const store = {
    async claimPendingEvents() { return []; },
    async updateEventStatus(eventId, status, details) {
      updatedStatus = { eventId, status, details };
    },
  };

  const relayPort = {
    async relayEvent() {
      return { success: false, error: 'Odoo connection refused' };
    },
  };

  const auditPort = {
    async recordAudit(entry) {
      auditLogs.push(entry);
    },
  };

  const useCase = new ProcessOutboxEventsUseCase(store, relayPort, auditPort);

  // Attempt 1: retryCount 0 -> FAILED, next 1
  const eventAttempt1 = {
    eventId: 'evt-fail',
    eventType: 'TICKET_ASSIGNED',
    aggregateId: 'ticket-fail',
    aggregateVersion: 1,
    occurredAt: new Date().toISOString(),
    actorSub: 'system',
    correlationId: 'corr-1',
    causationId: 'cause-1',
    payload: {},
    status: 'PENDING',
    retryCount: 0,
  };

  const res1 = await useCase.processEvent(eventAttempt1);
  assert.equal(res1.status, 'FAILED');
  assert.equal(updatedStatus.status, 'FAILED');
  assert.equal(updatedStatus.details.retryCount, 1);
  assert.equal(auditLogs[0].action, 'outbox.event.failed');

  // Attempt 3: retryCount 2 -> next 3 >= MAX_RETRIES -> DEAD_LETTER
  const eventAttempt3 = {
    ...eventAttempt1,
    retryCount: 2,
    status: 'FAILED',
  };

  const res3 = await useCase.processEvent(eventAttempt3);
  assert.equal(res3.status, 'DEAD_LETTER');
  assert.equal(updatedStatus.status, 'DEAD_LETTER');
  assert.equal(updatedStatus.details.retryCount, 3);
  assert.equal(auditLogs[1].action, 'outbox.event.dead_letter');
  assert.equal(auditLogs[1].metadata.operationalAlert, true);
});

// =============================================================================
// 4. INTEGRATION: CREATE TICKET WITH FAIR ASSIGNMENT IN SAME TRANSACTION
// =============================================================================

test('PostgresTicketIntakeStore: tự động phân công cho nhân viên sẵn sàng ngay khi tạo ticket', async () => {
  const fakeClient = {
    async query(sql, params) {
      if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rowCount: null, rows: [] };
      if (sql.includes('DELETE FROM dx_core.idempotency_keys')) return { rowCount: 0, rows: [] };
      if (sql.includes('INSERT INTO dx_core.idempotency_keys')) return { rowCount: 1, rows: [] };
      if (sql.includes('INSERT INTO dx_core.customers')) return { rowCount: 1, rows: [{ id: 'customer-1' }] };
      if (sql.includes('INSERT INTO dx_core.tickets')) {
        const now = new Date('2026-09-25T00:00:00.000Z');
        return {
          rowCount: 1,
          rows: [{
            id: 'ticket-auto-1',
            code: 'TCK-2026-000001',
            customer_id: 'customer-1',
            status: 'WAITING',
            provisional_type: 'Khiếu nại',
            description: 'Mô tả ticket hợp lệ cho test phân công.',
            contact_review_required: false,
            received_at: now,
            created_at: now,
            updated_at: now,
            group_id: 'complaints',
          }],
        };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };

  const mockAssignmentStore = {
    async assignTicket(ticket, corrId, client) {
      return {
        assigned: true,
        assignedSub: 'staff-complaints-1',
        ticketId: ticket.id,
        ticketCode: ticket.code,
        groupId: ticket.groupId,
      };
    },
    async assignNextQueuedTicket() { return null; },
  };

  const pool = { async connect() { return fakeClient; } };
  const store = new PostgresTicketIntakeStore(
    pool,
    undefined,
    { 'Khiếu nại': 'complaints', 'Tư vấn': 'consulting', 'Bảo hành': 'warranty' },
    mockAssignmentStore,
  );

  const intakeResult = await store.createTicket({
    idempotencyKey: '11111111-1111-4111-8111-111111111199',
    requestHash: 'hash-test',
    input: {
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0912345678',
      customerEmail: 'test@example.com',
      provisionalType: 'Khiếu nại',
      description: 'Mô tả ticket hợp lệ cho test phân công.',
    },
  });

  assert.equal(intakeResult.ticket.status, 'WAITING');
  assert.equal(intakeResult.ticket.groupId, 'complaints');
  assert.equal(intakeResult.ticket.assignedSub, 'staff-complaints-1');
});

test('ProcessOutboxEventsUseCase.processPending: xử lý batch nhiều sự kiện và trả thống kê chính xác', async () => {
  const events = [
    {
      eventId: 'evt-batch-1',
      eventType: 'TICKET_ASSIGNED',
      aggregateId: 't-1',
      aggregateVersion: 1,
      occurredAt: new Date().toISOString(),
      actorSub: 'system',
      correlationId: 'c-1',
      causationId: 'c-1',
      payload: {},
      status: 'PENDING',
      retryCount: 0,
    },
    {
      eventId: 'evt-batch-2',
      eventType: 'TICKET_ASSIGNED',
      aggregateId: 't-2',
      aggregateVersion: 1,
      occurredAt: new Date().toISOString(),
      actorSub: 'system',
      correlationId: 'c-2',
      causationId: 'c-2',
      payload: {},
      status: 'PENDING',
      retryCount: 2, // will become dead-letter on failure
    },
    {
      eventId: 'evt-batch-3',
      eventType: 'TICKET_ASSIGNED',
      aggregateId: 't-3',
      aggregateVersion: 1,
      occurredAt: new Date().toISOString(),
      actorSub: 'system',
      correlationId: 'c-3',
      causationId: 'c-3',
      payload: {},
      status: 'PENDING',
      retryCount: 0, // will become failed on failure
    },
  ];

  const store = {
    async claimPendingEvents(limit) {
      return events.slice(0, limit);
    },
    async updateEventStatus() {},
  };

  const relayPort = {
    async relayEvent(event) {
      if (event.eventId === 'evt-batch-1') return { success: true };
      return { success: false, error: 'relay error' };
    },
  };

  const useCase = new ProcessOutboxEventsUseCase(store, relayPort);
  const stats = await useCase.processPending(10);

  assert.equal(stats.processed, 3);
  assert.equal(stats.sent, 1);
  assert.equal(stats.failed, 1);
  assert.equal(stats.deadLetter, 1);
});

test('HttpOdooEventRelay: gửi POST tới webhook Odoo với header X-Internal-Service-Key và payload envelope', async (t) => {
  let interceptedRequest = null;
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async (url, options) => {
    interceptedRequest = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      status: 200,
      async text() { return JSON.stringify({ status: 'ok' }); },
    };
  };

  const relay = new HttpOdooEventRelay('http://localhost:8069/dx/api/v1/events', 'test-secret-123');
  const event = {
    eventId: 'evt-http-1',
    eventType: 'TICKET_ASSIGNED',
    aggregateId: 't-uuid',
    aggregateVersion: 1,
    occurredAt: '2026-09-25T12:00:00.000Z',
    actorSub: 'system',
    correlationId: 'corr-http',
    causationId: 'cause-http',
    payload: { ticket_code: 'TCK-2026-000001' },
    status: 'PENDING',
    retryCount: 0,
  };

  const result = await relay.relayEvent(event);
  assert.equal(result.success, true);
  assert.equal(interceptedRequest.url, 'http://localhost:8069/dx/api/v1/events');
  assert.equal(interceptedRequest.options.method, 'POST');
  assert.equal(interceptedRequest.options.headers['X-Internal-Service-Key'], 'test-secret-123');
  assert.equal(interceptedRequest.options.headers['Content-Type'], 'application/json');
  assert.equal(interceptedRequest.body.event_id, 'evt-http-1');
  assert.equal(interceptedRequest.body.event_type, 'TICKET_ASSIGNED');
});

test('HttpOdooEventRelay: trả về error khi Odoo trả status lỗi non-2xx', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 500,
      async text() { return 'Internal Server Error'; },
    };
  };

  const relay = new HttpOdooEventRelay('http://localhost:8069/dx/api/v1/events', 'secret');
  const event = {
    eventId: 'evt-err-1',
    eventType: 'TICKET_ASSIGNED',
    aggregateId: 't-uuid',
    aggregateVersion: 1,
    occurredAt: new Date().toISOString(),
    actorSub: 'system',
    correlationId: 'c',
    causationId: 'c',
    payload: {},
    status: 'PENDING',
    retryCount: 0,
  };

  const result = await relay.relayEvent(event);
  assert.equal(result.success, false);
  assert.ok(result.error.includes('HTTP 500'));
});
