import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../dist/adapters/http/app.js';
import { CreateTicketUseCase, IdempotencyConflictError } from '../dist/application/create-ticket.js';

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
