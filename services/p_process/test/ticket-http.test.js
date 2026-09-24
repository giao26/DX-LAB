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

test('POST multipart lưu metadata attachment hợp lệ', async (t) => {
  let captured;
  const store = { async lookupIdempotency() { return null; }, async createTicket(command) {
    captured = command;
    return { ticket: record(command.input), replayed: false };
  } };
  const storage = { async store(bytes) { assert.equal(bytes.toString('ascii'), '%PDF-1.7'); return { key: '11111111-1111-4111-8111-111111111111', sha256: 'a'.repeat(64) }; }, async remove() {} };
  const boundary = 'test-boundary';
  const fields = Object.entries(valid).map(([name, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`).join('');
  const payload = `${fields}--${boundary}\r\nContent-Disposition: form-data; name="attachment"; filename="proof.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.7\r\n--${boundary}--\r\n`;
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store), storage });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/api/v1/tickets', headers: {
    'idempotency-key': '12345678-1234-4234-8234-123456789005', 'content-type': `multipart/form-data; boundary=${boundary}`,
  }, payload });
  assert.equal(response.statusCode, 201);
  assert.equal(captured.attachment.originalName, 'proof.pdf');
  assert.equal(captured.attachment.detectedMime, 'application/pdf');
});

test('multipart giả bị từ chối trước khi ghi ticket', async (t) => {
  let calls = 0;
  const store = { async lookupIdempotency() { return null; }, async createTicket() { calls += 1; } };
  const boundary = 'invalid-boundary';
  const payload = `--${boundary}\r\nContent-Disposition: form-data; name="attachment"; filename="proof.pdf"\r\nContent-Type: application/pdf\r\n\r\nnot-a-pdf\r\n--${boundary}--\r\n`;
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store), storage: { async store() { throw new Error('không được gọi'); }, async remove() {} } });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/api/v1/tickets', headers: {
    'idempotency-key': '12345678-1234-4234-8234-123456789006', 'content-type': `multipart/form-data; boundary=${boundary}`,
  }, payload });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, 'ATTACHMENT_VALIDATION_ERROR');
  assert.equal(calls, 0);
});

test('xóa bù file khi transaction ticket thất bại', async (t) => {
  let removed;
  const store = { async lookupIdempotency() { return null; }, async createTicket() { throw new Error('database failed'); } };
  const storage = { async store() { return { key: '22222222-2222-4222-8222-222222222222', sha256: 'b'.repeat(64) }; }, async remove(key) { removed = key; } };
  const boundary = 'rollback-boundary';
  const fields = Object.entries(valid).map(([name, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`).join('');
  const payload = `${fields}--${boundary}\r\nContent-Disposition: form-data; name="attachment"; filename="proof.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.7\r\n--${boundary}--\r\n`;
  const app = buildApp({ logger: false }, { createTicket: new CreateTicketUseCase(store), storage });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/api/v1/tickets', headers: {
    'idempotency-key': '12345678-1234-4234-8234-123456789007', 'content-type': `multipart/form-data; boundary=${boundary}`,
  }, payload });
  assert.equal(response.statusCode, 500);
  assert.equal(removed, '22222222-2222-4222-8222-222222222222');
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
