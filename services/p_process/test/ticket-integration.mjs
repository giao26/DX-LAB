import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

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
  const getRes = await fetch(`${baseUrl}/api/v1/tickets/${ticket.id}`);
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

  console.log('Ticket integration matrix: PASS');
} finally {
  await pool.end();
}
