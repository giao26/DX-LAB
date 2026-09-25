import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { PostgresTicketReadStore } from '../dist/adapters/postgres/ticket-read-store.js';
import { ReadTicketsUseCase } from '../dist/application/read-tickets.js';
import { FilesystemAttachmentStorage } from '../dist/adapters/storage/filesystem-attachment-storage.js';
import { buildApp } from '../dist/adapters/http/app.js';

const baseUrl = process.env.TEST_P_BASE_URL ?? 'http://127.0.0.1:3000';
const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, 'DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: databaseUrl });
const suffix = `${Date.now()}`.slice(-8);

async function post(key, payload) {
  return fetch(`${baseUrl}/api/v1/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(payload),
  });
}

try {
  const body = {
    customerName: 'Khách kiểm thử', customerPhone: `09${suffix}`,
    customerEmail: `test-${suffix}@example.com`, provisionalType: 'Tư vấn',
    description: 'Yêu cầu kiểm thử tích hợp Story 1.3.',
  };
  const firstKey = randomUUID();
  const first = await post(firstKey, body);
  assert.equal(first.status, 201);
  const ticket = await first.json();
  assert.equal(ticket.status, 'WAITING');
  assert.match(ticket.code, /^TCK-\d{4}-\d{6,}$/);

  const replay = await post(firstKey, body);
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get('idempotency-replayed'), 'true');
  const replayTicket = await replay.json();
  assert.equal(replayTicket.id, ticket.id);
  assert.ok(['PENDING', 'SENT'].includes(replayTicket.confirmationEmailStatus));
  assert.equal((await post(firstKey, { ...body, description: `${body.description} khác` })).status, 409);
  assert.equal((await post(firstKey, { customerEmail: 'sai' })).status, 409);

  const sideEffects = await pool.query(
    `SELECT
      (SELECT count(*)::int FROM dx_core.audit_logs WHERE aggregate_id = $1 AND action = 'ticket.created') AS audit_count,
      (SELECT count(*)::int FROM dx_core.outbox_events WHERE aggregate_id = $1 AND event_type = 'ticket.created.v1'
        AND status = 'PENDING' AND payload->>'ticket_id' = $1
        AND payload ?& ARRAY['ticket_code','customer_id','provisional_type','contact_review_required','created_at']) AS outbox_count,
      (SELECT count(*)::int FROM dx_core.notifications WHERE ticket_id = $1::uuid
        AND idempotency_key = 'email:ticket-created:' || $1) AS notification_count`,
    [ticket.id],
  );
  assert.deepEqual(sideEffects.rows[0], { audit_count: 1, outbox_count: 1, notification_count: 1 });

  // Story 1.4: confirmation email status in ticket and GET /api/v1/tickets/:id
  assert.ok(['PENDING', 'SENT'].includes(ticket.confirmationEmailStatus));
  const getRes = await fetch(`${baseUrl}/api/v1/public/tickets/${ticket.id}/status`);
  assert.equal(getRes.status, 200);
  const fetchedTicket = await getRes.json();
  assert.equal(fetchedTicket.id, ticket.id);
  assert.ok(['PENDING', 'SENT'].includes(fetchedTicket.confirmationEmailStatus));

  const contact = await post(randomUUID(), {
    ...body, customerName: 'Tên không được ghi đè', customerEmail: `other-${suffix}@example.com`,
  });
  assert.equal(contact.status, 201);
  const contactTicket = await contact.json();
  assert.equal(contactTicket.customerId, ticket.customerId);
  assert.equal(contactTicket.customerName, body.customerName);
  assert.equal(contactTicket.customerEmail, body.customerEmail);
  assert.equal(contactTicket.contactReviewRequired, true);
  const customer = await pool.query(
    'SELECT full_name, email, contact_review_required FROM dx_core.customers WHERE id = $1', [ticket.customerId],
  );
  assert.deepEqual(customer.rows[0], {
    full_name: body.customerName, email: body.customerEmail, contact_review_required: true,
  });

  const concurrentBody = { ...body, customerPhone: `08${suffix}` };
  const [left, right] = await Promise.all([
    post(randomUUID(), concurrentBody), post(randomUUID(), concurrentBody),
  ]);
  assert.equal(left.status, 201);
  assert.equal(right.status, 201);
  const [leftTicket, rightTicket] = await Promise.all([left.json(), right.json()]);
  assert.notEqual(leftTicket.code, rightTicket.code);
  assert.equal(leftTicket.customerId, rightTicket.customerId);

  const sameKey = randomUUID();
  const sameBody = { ...body, customerPhone: `07${suffix}` };
  const sameResponses = await Promise.all([post(sameKey, sameBody), post(sameKey, sameBody)]);
  assert.deepEqual(sameResponses.map((response) => response.status).sort(), [200, 201]);
  const sameTickets = await Promise.all(sameResponses.map((response) => response.json()));
  assert.equal(sameTickets[0].id, sameTickets[1].id);
  const sameCount = await pool.query('SELECT count(*)::int AS count FROM dx_core.tickets WHERE id = $1', [sameTickets[0].id]);
  assert.equal(sameCount.rows[0].count, 1);

  const differentKey = randomUUID();
  const differentBody = { ...body, customerPhone: `06${suffix}` };
  const differentResponses = await Promise.all([
    post(differentKey, differentBody),
    post(differentKey, { ...differentBody, description: `${differentBody.description} khác` }),
  ]);
  assert.deepEqual(differentResponses.map((response) => response.status).sort(), [201, 409]);

  const expiringKey = randomUUID();
  const expiringBody = { ...body, customerPhone: `05${suffix}` };
  assert.equal((await post(expiringKey, expiringBody)).status, 201);
  await pool.query("UPDATE dx_core.idempotency_keys SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE key = $1", [expiringKey]);
  assert.equal((await post(expiringKey, { ...expiringBody, description: `${expiringBody.description} mới` })).status, 201);

  const invalidKey = randomUUID();
  assert.equal((await post(invalidKey, { ...body, customerEmail: 'sai' })).status, 400);
  const invalidRows = await pool.query('SELECT count(*)::int AS count FROM dx_core.idempotency_keys WHERE key = $1', [invalidKey]);
  assert.equal(invalidRows.rows[0].count, 0);

  // Story 1.5: valid private attachment metadata and replay do not duplicate.
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  const attachmentBody = { ...body, customerPhone: `04${suffix}`, attachment: {
    fileName: 'bang-chung.png', mimeType: 'image/png', data: png.toString('base64'),
  } };
  const attachmentKey = randomUUID();
  const attachmentResponse = await post(attachmentKey, attachmentBody);
  assert.equal(attachmentResponse.status, 201);
  const attachmentTicket = await attachmentResponse.json();
  assert.equal(attachmentTicket.attachment.displayName, 'bang-chung.png');
  assert.equal(attachmentTicket.attachment.detectedMime, 'image/png');
  assert.equal(attachmentTicket.attachment.sizeBytes, png.length);
  assert.equal('storageKey' in attachmentTicket.attachment, false);
  const attachmentReplay = await post(attachmentKey, attachmentBody);
  assert.equal(attachmentReplay.status, 200);
  assert.equal((await attachmentReplay.json()).attachment.id, attachmentTicket.attachment.id);
  const attachmentCount = await pool.query(
    'SELECT count(*)::int AS count FROM dx_core.ticket_attachments WHERE ticket_id = $1', [attachmentTicket.id],
  );
  assert.equal(attachmentCount.rows[0].count, 1);

  const fakeMimeKey = randomUUID();
  const fakeMime = await post(fakeMimeKey, { ...body, customerPhone: `03${suffix}`, attachment: {
    fileName: 'gia.pdf', mimeType: 'application/pdf', data: png.toString('base64'),
  } });
  assert.equal(fakeMime.status, 400);
  assert.ok((await fakeMime.json()).errors.attachment);
  const fakeMimeRows = await pool.query('SELECT count(*)::int AS count FROM dx_core.idempotency_keys WHERE key = $1', [fakeMimeKey]);
  assert.equal(fakeMimeRows.rows[0].count, 0);

  // Story 1.6: intake maps the group, while responsibility scope is applied inside SQL.
  const intakeScope = await pool.query('SELECT group_id FROM dx_core.tickets WHERE id = $1', [ticket.id]);
  assert.equal(intakeScope.rows[0].group_id, 'consulting');
  await pool.query("UPDATE dx_core.tickets SET assigned_sub = 'staff-integration' WHERE id = $1", [ticket.id]);
  const readStore = new PostgresTicketReadStore(pool);
  const inGroup = await readStore.listScoped({ groupIds: ['consulting'], organizationWide: false, limit: 20, offset: 0 });
  assert.ok(inGroup.rows.some((row) => row.id === ticket.id));
  const outside = await readStore.listScoped({ groupIds: ['warranty'], organizationWide: false, limit: 20, offset: 0 });
  assert.equal(outside.rows.some((row) => row.id === ticket.id), false);
  const waitingOnly = await readStore.listScoped({ groupIds: ['consulting'], organizationWide: false, status: 'WAITING', limit: 100, offset: 0 });
  assert.ok(waitingOnly.rows.some((row) => row.id === ticket.id));
  assert.equal(waitingOnly.rows.every((row) => row.status === 'WAITING'), true);
  assert.equal(waitingOnly.total, waitingOnly.rows.length);
  const closedOnly = await readStore.listScoped({ groupIds: ['consulting'], organizationWide: false, status: 'CLOSED', limit: 100, offset: 0 });
  assert.equal(closedOnly.rows.some((row) => row.id === ticket.id), false);
  assert.equal(closedOnly.rows.every((row) => row.status === 'CLOSED'), true);
  assert.equal(closedOnly.total, closedOnly.rows.length);
  const firstPage = await readStore.listScoped({ groupIds: ['consulting'], organizationWide: false, limit: 1, offset: 0 });
  const secondPage = await readStore.listScoped({ groupIds: ['consulting'], organizationWide: false, limit: 1, offset: 1 });
  assert.equal(firstPage.total, secondPage.total);
  assert.notEqual(firstPage.rows[0].id, secondPage.rows[0].id);
  assert.ok(firstPage.rows[0].receivedAt.localeCompare(secondPage.rows[0].receivedAt) <= 0);
  assert.equal((await readStore.getScoped({ ticketId: ticket.id, sub: 'other', groupIds: ['consulting'], groupLead: false, organizationWide: false })), null);
  assert.equal((await readStore.getScoped({ ticketId: ticket.id, sub: 'staff-integration', groupIds: ['consulting'], groupLead: false, organizationWide: false })).id, ticket.id);
  assert.equal((await readStore.getScoped({ ticketId: ticket.id, sub: 'lead-integration', groupIds: ['consulting'], groupLead: true, organizationWide: false })).id, ticket.id);
  assert.equal((await readStore.getScoped({ ticketId: ticket.id, sub: 'director-integration', groupIds: [], groupLead: false, organizationWide: true })).id, ticket.id);
  await readStore.record({ actorSub: 'staff-integration', clientId: 'integration-test', action: 'ticket.read', resourceId: ticket.id, correlationId: randomUUID(), outcome: 'allowed' });
  const safeAudit = await pool.query("SELECT metadata FROM dx_core.audit_logs WHERE aggregate_id = $1 AND action = 'ticket.read' ORDER BY created_at DESC LIMIT 1", [ticket.id]);
  assert.deepEqual(safeAudit.rows[0].metadata, { client_id: 'integration-test', outcome: 'allowed' });

  // Exercise the real SQL authorization + filesystem read + HTTP download chain.
  await pool.query("UPDATE dx_core.tickets SET assigned_sub = 'staff-integration' WHERE id = $1", [attachmentTicket.id]);
  const realReadUseCase = new ReadTicketsUseCase(readStore, readStore);
  const integrationApp = buildApp({ logger: false }, {
    createTicket: { async execute() { throw new Error('unused'); } },
    identityVerifier: { async verify() {
      return { sub: 'staff-integration', clientId: 'integration-test', roles: ['employee'], groupIds: ['consulting'], scopes: ['tickets:download'] };
    } },
    readTickets: realReadUseCase,
    attachmentStorage: new FilesystemAttachmentStorage(),
  });
  const realDownload = await integrationApp.inject({
    method: 'GET', url: `/api/v1/attachments/${attachmentTicket.attachment.id}/download`,
    headers: { authorization: 'Bearer integration' },
  });
  assert.equal(realDownload.statusCode, 200);
  assert.deepEqual(realDownload.rawPayload, png);
  assert.equal(realDownload.headers['content-type'], 'image/png');
  assert.match(realDownload.headers['content-disposition'], /^attachment; filename\*=UTF-8''bang-chung\.png$/);
  await integrationApp.close();
  const downloadAudit = await pool.query(
    "SELECT metadata FROM dx_core.audit_logs WHERE aggregate_id = $1 AND action = 'attachment.download' ORDER BY created_at DESC LIMIT 1",
    [attachmentTicket.attachment.id],
  );
  assert.deepEqual(downloadAudit.rows[0].metadata, { client_id: 'integration-test', outcome: 'allowed' });

  console.log('Ticket integration matrix: PASS');
} finally {
  await pool.end();
}
