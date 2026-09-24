import type pg from 'pg';
import {
  IdempotencyConflictError,
  IdempotencyInProgressError,
  type TicketIntakeResult,
  type TicketIntakeStore,
} from '../../application/create-ticket.js';
import { contactDetailsConflict, type TicketRecord } from '../../domain/ticket.js';
import {
  buildConfirmationEmail,
  buildConfirmationEmailIdempotencyKey,
} from '../../domain/notification.js';

type JsonValue = string | Record<string, unknown> | null;

function parseTicket(value: JsonValue): TicketRecord | null {
  if (!value) return null;
  return (typeof value === 'string' ? JSON.parse(value) : value) as unknown as TicketRecord;
}

export class PostgresTicketIntakeStore implements TicketIntakeStore {
  constructor(private readonly pool: pg.Pool) {}

  async lookupIdempotency(command: { idempotencyKey: string; requestHash: string }): Promise<TicketIntakeResult | null> {
    await this.pool.query(
      `DELETE FROM dx_core.idempotency_keys
       WHERE key = $1 AND target_endpoint = '/api/v1/tickets' AND expires_at <= CURRENT_TIMESTAMP`,
      [command.idempotencyKey],
    );
    const existing = await this.pool.query(
      `SELECT request_hash, response_body FROM dx_core.idempotency_keys
       WHERE key = $1 AND target_endpoint = '/api/v1/tickets'`,
      [command.idempotencyKey],
    );
    if (!existing.rowCount) return null;
    const row = existing.rows[0] as { request_hash: string; response_body: JsonValue };
    if (row.request_hash !== command.requestHash) throw new IdempotencyConflictError();
    const ticket = parseTicket(row.response_body);
    if (!ticket) throw new IdempotencyInProgressError();
    const notif = await this.pool.query(
      `SELECT status FROM dx_core.notifications WHERE ticket_id = $1::uuid ORDER BY created_at DESC LIMIT 1`,
      [ticket.id],
    );
    if (notif.rowCount) {
      ticket.confirmationEmailStatus = notif.rows[0].status;
    } else if (!ticket.confirmationEmailStatus) {
      ticket.confirmationEmailStatus = 'PENDING';
    }
    return { ticket, replayed: true };
  }

  async createTicket(command: Parameters<TicketIntakeStore['createTicket']>[0]): Promise<TicketIntakeResult> {
    const client = await this.pool.connect();
    const correlationId = command.idempotencyKey;
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM dx_core.idempotency_keys
         WHERE key = $1 AND target_endpoint = '/api/v1/tickets' AND expires_at <= CURRENT_TIMESTAMP`,
        [command.idempotencyKey],
      );
      const claimed = await client.query(
        `INSERT INTO dx_core.idempotency_keys
          (key, target_endpoint, request_hash, locked_at, expires_at)
         VALUES ($1, '/api/v1/tickets', $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '24 hours')
         ON CONFLICT (key) DO NOTHING`,
        [command.idempotencyKey, command.requestHash],
      );

      if (claimed.rowCount === 0) {
        const existing = await client.query(
          `SELECT request_hash, response_body FROM dx_core.idempotency_keys
           WHERE key = $1 FOR UPDATE`,
          [command.idempotencyKey],
        );
        const row = existing.rows[0] as { request_hash: string; response_body: JsonValue } | undefined;
        if (!row || row.request_hash !== command.requestHash) throw new IdempotencyConflictError();
        const ticket = parseTicket(row.response_body);
        if (!ticket) throw new IdempotencyInProgressError();
        await client.query('COMMIT');
        return { ticket, replayed: true };
      }

      const customerResult = await client.query(
        `INSERT INTO dx_core.customers (phone_normalized, full_name, email)
         VALUES ($1, $2, $3)
         ON CONFLICT (phone_normalized) DO NOTHING
         RETURNING id, full_name, email, contact_review_required`,
        [command.input.customerPhone, command.input.customerName, command.input.customerEmail],
      );
      let customerId: string;
      let customerName = command.input.customerName;
      let customerEmail = command.input.customerEmail;
      let reviewRequired = false;
      if (customerResult.rowCount) {
        customerId = customerResult.rows[0].id as string;
      } else {
        const existing = await client.query(
          `SELECT id, full_name, email, contact_review_required
           FROM dx_core.customers WHERE phone_normalized = $1 FOR UPDATE`,
          [command.input.customerPhone],
        );
        const customer = existing.rows[0] as {
          id: string; full_name: string; email: string; contact_review_required: boolean;
        };
        customerId = customer.id;
        customerName = customer.full_name;
        customerEmail = customer.email;
        reviewRequired = customer.contact_review_required || contactDetailsConflict(
          { customerName: customer.full_name, customerEmail: customer.email }, command.input,
        );
        if (reviewRequired && !customer.contact_review_required) {
          await client.query(
            `UPDATE dx_core.customers SET contact_review_required = TRUE, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`, [customerId],
          );
        }
      }

      const ticketResult = await client.query(
        `INSERT INTO dx_core.tickets
          (code, customer_id, description, provisional_type, contact_review_required)
         VALUES (
           'TCK-' || to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY') || '-' ||
             lpad(nextval('dx_core.ticket_code_seq')::text, 6, '0'),
           $1, $2, $3, $4
         )
         RETURNING id, code, customer_id, status, provisional_type, description,
                   contact_review_required, received_at, created_at, updated_at`,
        [customerId, command.input.description, command.input.provisionalType, reviewRequired],
      );
      const row = ticketResult.rows[0];
      const ticket: TicketRecord = {
        id: row.id,
        code: row.code,
        customerId: row.customer_id,
        customerName,
        customerPhone: command.input.customerPhone,
        customerEmail,
        provisionalType: row.provisional_type,
        description: row.description,
        status: row.status,
        contactReviewRequired: row.contact_review_required,
        confirmationEmailStatus: 'PENDING',
        receivedAt: row.received_at.toISOString(),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };

      const email = buildConfirmationEmail({
        ticketCode: ticket.code,
        receivedAt: ticket.receivedAt,
        customerName: ticket.customerName,
      });
      const notificationKey = buildConfirmationEmailIdempotencyKey(ticket.id);
      await client.query(
        `INSERT INTO dx_core.notifications
          (idempotency_key, ticket_id, recipient_email, subject, body, status)
         VALUES ($1, $2, $3, $4, $5, 'PENDING')
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [notificationKey, ticket.id, ticket.customerEmail, email.subject, email.body],
      );

      const eventPayload = {
        ticket_id: ticket.id,
        ticket_code: ticket.code,
        customer_id: ticket.customerId,
        provisional_type: ticket.provisionalType,
        contact_review_required: ticket.contactReviewRequired,
        created_at: ticket.createdAt,
      };
      await client.query(
        `INSERT INTO dx_core.audit_logs
          (actor_sub, action, aggregate_type, aggregate_id, correlation_id, causation_id, after_state, metadata)
         VALUES ('public-ticket-form', 'ticket.created', 'ticket', $1, $2, $2, $3, $4)`,
        [ticket.id, correlationId, JSON.stringify({
          status: ticket.status,
          code: ticket.code,
          customerId: ticket.customerId,
          provisionalType: ticket.provisionalType,
          contactReviewRequired: ticket.contactReviewRequired,
        }), JSON.stringify({ source: 'public-form' })],
      );
      await client.query(
        `INSERT INTO dx_core.outbox_events
          (event_type, aggregate_id, aggregate_version, actor_sub, correlation_id, causation_id, payload)
         VALUES ('ticket.created.v1', $1, 1, 'public-ticket-form', $2, $2, $3)`,
        [ticket.id, correlationId, JSON.stringify(eventPayload)],
      );
      await client.query(
        `UPDATE dx_core.idempotency_keys
         SET response_status = 201, response_headers = $2, response_body = $3
         WHERE key = $1`,
        [command.idempotencyKey, JSON.stringify({}), JSON.stringify(ticket)],
      );
      await client.query('COMMIT');
      return { ticket, replayed: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTicketById(ticketId: string): Promise<TicketRecord | null> {
    const result = await this.pool.query(
      `SELECT
         t.id,
         t.code,
         t.customer_id,
         c.full_name AS customer_name,
         c.phone_normalized AS customer_phone,
         c.email AS customer_email,
         t.provisional_type,
         t.description,
         t.status,
         t.contact_review_required,
         t.received_at,
         t.created_at,
         t.updated_at,
         n.status AS confirmation_email_status
       FROM dx_core.tickets t
       JOIN dx_core.customers c ON t.customer_id = c.id
       LEFT JOIN LATERAL (SELECT status FROM dx_core.notifications WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) n ON true
       WHERE t.id = $1::uuid`,
      [ticketId],
    );

    if (!result.rowCount) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      code: row.code,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      provisionalType: row.provisional_type,
      description: row.description,
      status: row.status,
      contactReviewRequired: row.contact_review_required,
      confirmationEmailStatus: row.confirmation_email_status || 'PENDING',
      receivedAt: row.received_at.toISOString(),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
