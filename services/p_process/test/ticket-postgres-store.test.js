import test from 'node:test';
import assert from 'node:assert/strict';
import { PostgresTicketIntakeStore } from '../dist/adapters/postgres/ticket-intake-store.js';

test('attachment cleanup still runs when ROLLBACK itself fails', async () => {
  const original = new Error('attachment metadata insert failed');
  let released = false;
  const client = {
    async query(sql) {
      if (sql === 'ROLLBACK') throw new Error('connection lost during rollback');
      if (sql.includes('INSERT INTO dx_core.idempotency_keys')) return { rowCount: 1, rows: [] };
      if (sql.includes('INSERT INTO dx_core.customers')) {
        return { rowCount: 1, rows: [{ id: 'customer-1' }] };
      }
      if (sql.includes('INSERT INTO dx_core.tickets')) {
        const now = new Date('2026-09-25T00:00:00.000Z');
        return { rowCount: 1, rows: [{
          id: 'ticket-1', code: 'TCK-2026-000001', customer_id: 'customer-1', status: 'WAITING',
          provisional_type: 'Tư vấn', description: 'Một mô tả đủ dài cho kiểm thử.',
          contact_review_required: false, received_at: now, created_at: now, updated_at: now,
        }] };
      }
      if (sql.includes('INSERT INTO dx_core.ticket_attachments')) throw original;
      return { rowCount: 0, rows: [] };
    },
    release() { released = true; },
  };
  const removed = [];
  const storage = {
    async save() { return 'opaque-storage-key'; },
    async remove(key) { removed.push(key); },
    async read() { throw new Error('unused'); },
  };
  const pool = { async connect() { return client; } };
  const store = new PostgresTicketIntakeStore(pool, storage, { 'Tư vấn': 'consulting' });
  const content = Buffer.from('%PDF-1.4\n%%EOF');
  await assert.rejects(() => store.createTicket({
    idempotencyKey: '12345678-1234-4234-8234-123456789001', requestHash: 'hash',
    input: {
      customerName: 'Khách', customerPhone: '0912345678', customerEmail: 'a@example.test',
      provisionalType: 'Tư vấn', description: 'Một mô tả đủ dài cho kiểm thử.',
      attachment: {
        displayName: 'bang-chung.pdf', sizeBytes: content.length, detectedMime: 'application/pdf',
        checksumSha256: 'checksum', content,
      },
    },
  }), (error) => error === original);
  assert.deepEqual(removed, ['opaque-storage-key']);
  assert.equal(released, true);
});
