import test from 'node:test';
import assert from 'node:assert/strict';
import { FilesystemAttachmentStorage } from '../dist/adapters/storage/filesystem-attachment-storage.js';
import { PostgresTicketIntakeStore, parseGroupMapping } from '../dist/adapters/postgres/ticket-intake-store.js';

test('filesystem dọn tệp partial khi write thất bại', async () => {
  const removed = [];
  let closed = 0;
  const ops = {
    async mkdir() {},
    async open() {
      return {
        async writeFile() { throw new Error('disk full'); },
        async close() { closed += 1; },
      };
    },
    async readFile() { throw new Error('unused'); },
    async rename() { throw new Error('must not rename failed write'); },
    async rm(path) { removed.push(path); },
  };
  const storage = new FilesystemAttachmentStorage('D:\\private-test', ops);
  await assert.rejects(() => storage.save(Buffer.from('content')), /disk full/);
  assert.equal(closed, 1);
  assert.equal(removed.length, 1);
  assert.match(removed[0], /\.partial$/);
});

test('intake rollback xóa file đã save khi ghi metadata DB thất bại', async () => {
  const removed = [];
  const client = {
    async query(sql) {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rowCount: null, rows: [] };
      if (sql.includes('DELETE FROM dx_core.idempotency_keys')) return { rowCount: 0, rows: [] };
      if (sql.includes('INSERT INTO dx_core.idempotency_keys')) return { rowCount: 1, rows: [] };
      if (sql.includes('INSERT INTO dx_core.customers')) return { rowCount: 1, rows: [{ id: 'customer-1' }] };
      if (sql.includes('INSERT INTO dx_core.tickets')) return { rowCount: 1, rows: [{
        id: 'ticket-1', code: 'TCK-2026-000001', customer_id: 'customer-1', status: 'WAITING',
        provisional_type: 'Tư vấn', description: 'Mô tả hợp lệ cho test.', contact_review_required: false,
        received_at: new Date(), created_at: new Date(), updated_at: new Date(),
      }] };
      if (sql.includes('INSERT INTO dx_core.ticket_attachments')) throw new Error('metadata failed');
      throw new Error(`unexpected query: ${sql}`);
    },
    release() {},
  };
  const pool = { async connect() { return client; } };
  const attachmentStorage = {
    async save() { return '12345678-1234-4234-8234-123456789099'; },
    async remove(key) { removed.push(key); },
    async read() { throw new Error('unused'); },
  };
  const store = new PostgresTicketIntakeStore(pool, attachmentStorage, {
    'Khiếu nại': 'complaints', 'Tư vấn': 'consulting', 'Bảo hành': 'warranty',
  });
  await assert.rejects(() => store.createTicket({
    idempotencyKey: '12345678-1234-4234-8234-123456789001', requestHash: 'a'.repeat(64),
    input: {
      customerName: 'A B', customerPhone: '0912345678', customerEmail: 'a@example.com',
      provisionalType: 'Tư vấn', description: 'Mô tả hợp lệ cho test.',
      attachment: {
        displayName: 'x.pdf', sizeBytes: 4, detectedMime: 'application/pdf',
        checksumSha256: 'a'.repeat(64), content: Buffer.from('%PDF'),
      },
    },
  }), /metadata failed/);
  assert.deepEqual(removed, ['12345678-1234-4234-8234-123456789099']);
});

test('mapping nhóm sai hoặc thiếu fail-fast thay vì tạo ticket vô scope', () => {
  assert.throws(() => parseGroupMapping('{bad json'), /TICKET_TYPE_GROUP_MAPPING/);
  assert.throws(() => parseGroupMapping(JSON.stringify({ 'Tư vấn': 'consulting' })), /Khiếu nại/);
  assert.equal(parseGroupMapping(undefined)['Bảo hành'], 'warranty');
});
