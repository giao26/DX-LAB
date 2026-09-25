import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../dist/adapters/http/app.js';
import { CreateTicketUseCase, IdempotencyConflictError } from '../dist/application/create-ticket.js';
import { ReadTicketsUseCase } from '../dist/application/read-tickets.js';
import { AuthenticationError, IdentityProviderUnavailableError } from '../dist/application/principal.js';

const valid = {
  customerName: 'Nguyễn Văn A',
  customerPhone: '+84 912 345 678',
  customerEmail: 'a@example.com',
  provisionalType: 'Khiếu nại',
  description: 'Sản phẩm cần được kiểm tra bảo hành.',
};

function record(input) {
  return {
    ...input,
    id: 'a33e617f-9374-4df6-8a91-3caf987f0068',
    code: 'TCK-2026-000001',
    customerId: '8083057e-29ad-41e7-903f-2ff604d70680',
    status: 'WAITING',
    contactReviewRequired: false,
    confirmationEmailStatus: 'PENDING',
    receivedAt: '2026-09-23T00:00:00.000Z',
    createdAt: '2026-09-23T00:00:00.000Z',
    updatedAt: '2026-09-23T00:00:00.000Z',
  };
}

test('POST tạo ticket hợp lệ và trả mã server', async (t) => {
  let captured;
  const store = { async lookupIdempotency() { return null; }, async createTicket(command) {
    captured = command;
    return { ticket: record(command.input), replayed: false };
  } };
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store) });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/api/v1/tickets', headers: {
    'idempotency-key': '12345678-1234-4234-8234-123456789001',
  }, payload: valid });
  assert.equal(response.statusCode, 201);
  assert.equal(captured.input.customerPhone, '0912345678');
  assert.equal(response.json().status, 'WAITING');
  assert.equal(response.json().code, 'TCK-2026-000001');
  assert.equal(response.json().confirmationEmailStatus, 'PENDING');
});

test('payload sai trả lỗi theo trường và không gọi kho dữ liệu', async (t) => {
  let calls = 0;
  const store = { async lookupIdempotency() { return null; }, async createTicket() { calls += 1; throw new Error('không được gọi'); } };
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store) });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/api/v1/tickets', headers: {
    'idempotency-key': '12345678-1234-4234-8234-123456789002',
  }, payload: { ...valid, customerEmail: 'sai', description: 'ngắn' } });
  assert.equal(response.statusCode, 400);
  assert.equal(response.headers['content-type'], 'application/problem+json; charset=utf-8');
  assert.ok(response.json().errors.customerEmail);
  assert.equal(calls, 0);
});

test('tệp giả MIME bị từ chối trước khi ghi ticket', async (t) => {
  let calls = 0;
  const store = { async lookupIdempotency() { return null; }, async createTicket() { calls += 1; throw new Error('không được gọi'); } };
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store) });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/api/v1/tickets', headers: {
    'idempotency-key': '12345678-1234-4234-8234-123456789012',
  }, payload: { ...valid, attachment: {
    fileName: 'bang-chung.pdf', mimeType: 'application/pdf',
    data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64'),
  } } });
  assert.equal(response.statusCode, 400);
  assert.ok(response.json().errors.attachment);
  assert.equal(calls, 0);
});

test('replay trả 200 và đánh dấu, xung đột trả 409', async (t) => {
  let mode = 'replay';
  const store = {
    async lookupIdempotency() {
      if (mode === 'conflict') throw new IdempotencyConflictError();
      return { ticket: record({ ...valid, customerPhone: '0912345678' }), replayed: true };
    },
    async createTicket() { throw new Error('không được gọi khi replay'); },
  };
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store) });
  t.after(() => app.close());
  const request = { method: 'POST', url: '/api/v1/tickets', headers: {
    'idempotency-key': '12345678-1234-4234-8234-123456789003',
  }, payload: valid };
  const replay = await app.inject(request);
  assert.equal(replay.statusCode, 200);
  assert.equal(replay.headers['idempotency-replayed'], 'true');
  mode = 'conflict';
  const conflict = await app.inject(request);
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.json().code, 'IDEMPOTENCY_CONFLICT');
});

test('cùng key với payload sai khác vẫn trả 409 trước validation', async (t) => {
  const store = {
    async lookupIdempotency() { throw new IdempotencyConflictError(); },
    async createTicket() { throw new Error('không được gọi'); },
  };
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store) });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/api/v1/tickets', headers: {
    'idempotency-key': '12345678-1234-4234-8234-123456789004',
  }, payload: { customerEmail: 'sai' } });
  assert.equal(response.statusCode, 409);
});

test('từ chối Idempotency-Key không phải UUID', async (t) => {
  const store = { async lookupIdempotency() { return null; }, async createTicket() { throw new Error('không gọi'); } };
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store) });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/api/v1/tickets', headers: {
    'idempotency-key': 'not-a-uuid',
  }, payload: valid });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, 'INVALID_IDEMPOTENCY_KEY');
});

test('GET public status trả dữ liệu polling tối thiểu', async (t) => {
  const mockTicket = record({ ...valid, customerPhone: '0912345678' });
  mockTicket.confirmationEmailStatus = 'SENT';
  const store = {
    async lookupIdempotency() { return null; },
    async createTicket() { throw new Error('không gọi'); },
    async getPublicTicketStatus(id) {
      if (id === mockTicket.id) return mockTicket;
      return null;
    }
  };
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store) });
  t.after(() => app.close());

  const res = await app.inject({ method: 'GET', url: `/api/v1/public/tickets/${mockTicket.id}/status` });
  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.id, mockTicket.id);
  assert.equal(data.code, mockTicket.code);
  assert.equal(data.confirmationEmailStatus, 'SENT');
});

test('GET public status trả 404 khi không tìm thấy ticket', async (t) => {
  const store = {
    async lookupIdempotency() { return null; },
    async createTicket() { throw new Error('không gọi'); },
    async getPublicTicketStatus() { return null; }
  };
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store) });
  t.after(() => app.close());

  const res = await app.inject({ method: 'GET', url: '/api/v1/public/tickets/00000000-0000-4000-8000-000000000000/status' });
  assert.equal(res.statusCode, 404);
  assert.equal(res.json().code, 'TICKET_NOT_FOUND');
});

test('GET public status dùng 404 chung khi id không phải UUID', async (t) => {
  const store = {
    async lookupIdempotency() { return null; },
    async createTicket() { throw new Error('không gọi'); }
  };
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store) });
  t.after(() => app.close());

  const res = await app.inject({ method: 'GET', url: '/api/v1/public/tickets/not-a-valid-uuid/status' });
  assert.equal(res.statusCode, 404);
  assert.equal(res.json().code, 'TICKET_NOT_FOUND');
});

const scopedRow = {
  id: 'a33e617f-9374-4df6-8a91-3caf987f0068', code: 'TCK-2026-000001',
  provisionalType: 'Bảo hành', status: 'WAITING', description: 'Một mô tả đủ dài về ticket.',
  groupId: 'warranty', assignedSub: 'staff-1', customerName: 'Khách A',
  customerPhone: '0912345678', customerEmail: 'private@example.com',
  receivedAt: '2026-09-25T00:00:00.000Z', updatedAt: '2026-09-25T00:00:00.000Z',
  attachment: { id: '8083057e-29ad-41e7-903f-2ff604d70680', storageKey: '12345678-1234-4234-8234-123456789099',
    displayName: 'bang-chung.pdf', sizeBytes: 4, detectedMime: 'application/pdf', checksumSha256: 'a'.repeat(64), createdAt: '2026-09-25T00:00:00.000Z' },
};

function protectedApp({ principal, row = scopedRow, revoked = false, verifierError = null, readError = null }) {
  const audits = [];
  const verifier = { async verify(authorization, scope) {
    if (verifierError) throw verifierError;
    if (revoked) throw new AuthenticationError('Quyền đã bị thu hồi.', 403);
    if (!authorization) throw new AuthenticationError('Thiếu token.', 401);
    if (scope === 'tickets:download' && !principal.scopes.includes('tickets:download')) throw new AuthenticationError('Thiếu scope.', 403);
    return principal;
  } };
  const store = {
    async listScoped(input) { const allowed = input.organizationWide || input.groupIds.includes(row.groupId); return { rows: allowed ? [row] : [], total: allowed ? 1 : 0 }; },
    async getScoped(input) { return input.organizationWide || (input.groupIds.includes(row.groupId) && (input.groupLead || input.sub === row.assignedSub)) ? row : null; },
    async getAttachmentScoped(input) { return input.organizationWide || (input.sub === row.assignedSub && input.groupIds.includes(row.groupId)) ? row : null; },
  };
  const readTickets = new ReadTicketsUseCase(store, { async record(entry) { audits.push(entry); } });
  const intake = { async lookupIdempotency() { return null; }, async createTicket() { throw new Error('unused'); } };
  const attachmentStorage = { async save() {}, async remove() {}, async read() {
    if (readError) throw readError;
    return Buffer.from('%PDF');
  } };
  return { app: buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(intake), identityVerifier: verifier, readTickets, attachmentStorage }), audits };
}

test('nhân viên chỉ thấy list cùng nhóm đã che PII/tệp và header mạo danh bị bỏ qua', async (t) => {
  const privateRow = { ...scopedRow, description: 'Liên hệ private@example.com số 0912345678' };
  const { app, audits } = protectedApp({ row: privateRow, principal: { sub: 'staff-2', clientId: 'web', roles: ['employee'], groupIds: ['warranty'], scopes: ['tickets:read'] } });
  t.after(() => app.close());
  const res = await app.inject({ method: 'GET', url: '/api/v1/tickets', headers: { authorization: 'Bearer valid', 'x-actor-sub': 'staff-1', 'x-group-id': 'admin' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(res.json().items.length, 1);
  assert.equal('customerEmail' in res.json().items[0], false);
  assert.equal('attachment' in res.json().items[0], false);
  assert.equal(JSON.stringify(res.json()).includes('private@example.com'), false);
  assert.equal(JSON.stringify(res.json()).includes('0912345678'), false);
  assert.deepEqual(audits.map((entry) => entry.action), ['ticket.list']);
});

test('list từ chối tham số phân trang không hợp lệ', async (t) => {
  const { app } = protectedApp({ principal: { sub: 'staff-2', clientId: 'web', roles: ['employee'], groupIds: ['warranty'], scopes: ['tickets:read'] } });
  t.after(() => app.close());
  const res = await app.inject({ method: 'GET', url: '/api/v1/tickets?limit=abc', headers: { authorization: 'Bearer valid' } });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().code, 'INVALID_QUERY');
  const emptyStatus = await app.inject({ method: 'GET', url: '/api/v1/tickets?status=', headers: { authorization: 'Bearer valid' } });
  assert.equal(emptyStatus.statusCode, 400);
});

test('assignee đọc detail/tải tệp và audit không chứa PII', async (t) => {
  const { app, audits } = protectedApp({ principal: { sub: 'staff-1', clientId: 'odoo', roles: ['employee'], groupIds: ['warranty'], scopes: ['tickets:read', 'tickets:download'] } });
  t.after(() => app.close());
  const detail = await app.inject({ method: 'GET', url: `/api/v1/tickets/${scopedRow.id}`, headers: { authorization: 'Bearer valid' } });
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.json().customer.email, 'private@example.com');
  const download = await app.inject({ method: 'GET', url: `/api/v1/attachments/${scopedRow.attachment.id}/download`, headers: { authorization: 'Bearer valid' } });
  assert.equal(download.statusCode, 200);
  assert.equal(download.headers['x-content-type-options'], 'nosniff');
  assert.deepEqual(audits.map((entry) => entry.action), ['ticket.read', 'attachment.download']);
  assert.equal(JSON.stringify(audits).includes('private@example.com'), false);
});

test('lead cùng nhóm xem detail đã che; ngoài scope và không tồn tại cùng 404', async (t) => {
  const lead = protectedApp({ principal: { sub: 'lead-1', clientId: 'web', roles: ['group_lead'], groupIds: ['warranty'], scopes: ['tickets:read'] } });
  t.after(() => lead.app.close());
  const detail = await lead.app.inject({ method: 'GET', url: `/api/v1/tickets/${scopedRow.id}`, headers: { authorization: 'Bearer valid' } });
  assert.equal(detail.statusCode, 200);
  assert.equal('customer' in detail.json(), false);
  assert.equal('attachment' in detail.json(), false);

  const outsider = protectedApp({ principal: { sub: 'staff-9', clientId: 'web', roles: ['employee'], groupIds: ['consulting'], scopes: ['tickets:read'] } });
  t.after(() => outsider.app.close());
  const denied = await outsider.app.inject({ method: 'GET', url: `/api/v1/tickets/${scopedRow.id}`, headers: { authorization: 'Bearer valid' } });
  const missing = await outsider.app.inject({ method: 'GET', url: '/api/v1/tickets/00000000-0000-4000-8000-000000000000', headers: { authorization: 'Bearer valid' } });
  assert.equal(denied.statusCode, 404);
  assert.deepEqual(
    { ...denied.json(), instance: '<resource>' },
    { ...missing.json(), instance: '<resource>' },
  );
});

test('token thiếu/sai scope và entitlement thu hồi bị từ chối', async (t) => {
  const principal = { sub: 'staff-1', clientId: 'web', roles: ['employee'], groupIds: ['warranty'], scopes: ['tickets:read'] };
  const active = protectedApp({ principal });
  t.after(() => active.app.close());
  assert.equal((await active.app.inject({ method: 'GET', url: '/api/v1/tickets' })).statusCode, 401);
  assert.equal((await active.app.inject({ method: 'GET', url: '/api/v1/tickets' })).headers['www-authenticate'], 'Bearer');
  assert.equal((await active.app.inject({ method: 'GET', url: `/api/v1/attachments/${scopedRow.attachment.id}/download`, headers: { authorization: 'Bearer valid' } })).statusCode, 403);
  const revoked = protectedApp({ principal, revoked: true });
  t.after(() => revoked.app.close());
  assert.equal((await revoked.app.inject({ method: 'GET', url: '/api/v1/tickets', headers: { authorization: 'Bearer old' } })).statusCode, 403);
  const groupRevoked = protectedApp({ principal: { ...principal, groupIds: [], scopes: ['tickets:read', 'tickets:download'] } });
  t.after(() => groupRevoked.app.close());
  assert.equal((await groupRevoked.app.inject({ method: 'GET', url: `/api/v1/tickets/${scopedRow.id}`, headers: { authorization: 'Bearer refreshed' } })).statusCode, 404);
  assert.equal((await groupRevoked.app.inject({ method: 'GET', url: `/api/v1/attachments/${scopedRow.attachment.id}/download`, headers: { authorization: 'Bearer refreshed' } })).statusCode, 404);
});

test('protected detail xác thực trước khi che UUID sai bằng 404', async (t) => {
  const { app } = protectedApp({ principal: { sub: 'staff-1', clientId: 'web', roles: ['employee'], groupIds: ['warranty'], scopes: ['tickets:read'] } });
  t.after(() => app.close());
  const anonymous = await app.inject({ method: 'GET', url: '/api/v1/tickets/not-a-uuid' });
  assert.equal(anonymous.statusCode, 401);
  assert.equal(anonymous.headers['www-authenticate'], 'Bearer');
  const authenticated = await app.inject({ method: 'GET', url: '/api/v1/tickets/not-a-uuid', headers: { authorization: 'Bearer valid' } });
  assert.equal(authenticated.statusCode, 404);
});

test('IdP unavailable trả 503 có mã riêng thay vì 500 hoặc credential error', async (t) => {
  const { app } = protectedApp({
    principal: { sub: 'staff-1', clientId: 'web', roles: ['employee'], groupIds: ['warranty'], scopes: ['tickets:read'] },
    verifierError: new IdentityProviderUnavailableError(),
  });
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/api/v1/tickets', headers: { authorization: 'Bearer valid' } });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().code, 'IDENTITY_PROVIDER_UNAVAILABLE');
});

test('download không audit thành công khi storage read thất bại', async (t) => {
  const missing = Object.assign(new Error('missing'), { code: 'ENOENT' });
  const { app, audits } = protectedApp({
    principal: { sub: 'staff-1', clientId: 'odoo', roles: ['employee'], groupIds: ['warranty'], scopes: ['tickets:read', 'tickets:download'] },
    readError: missing,
  });
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: `/api/v1/attachments/${scopedRow.attachment.id}/download`, headers: { authorization: 'Bearer valid' } });
  assert.equal(response.statusCode, 404);
  assert.deepEqual(audits, []);
});

test('vai trò toàn tổ chức đọc được ticket ngoài nhóm với DTO nhạy cảm đúng policy', async (t) => {
  const { app } = protectedApp({ principal: { sub: 'director-1', clientId: 'odoo', roles: ['director'], groupIds: [], scopes: ['tickets:read'] } });
  t.after(() => app.close());
  const list = await app.inject({ method: 'GET', url: '/api/v1/tickets', headers: { authorization: 'Bearer valid' } });
  assert.equal(list.json().total, 1);
  const detail = await app.inject({ method: 'GET', url: `/api/v1/tickets/${scopedRow.id}`, headers: { authorization: 'Bearer valid' } });
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.json().customer.email, 'private@example.com');
});
