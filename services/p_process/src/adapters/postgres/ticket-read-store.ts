import type pg from 'pg';
import type { ReadAuditPort, ScopedTicketRow, TicketListRow, TicketReadStore } from '../../application/read-tickets.js';

const SELECT_LIST = `
  SELECT t.id, t.code, t.provisional_type, t.status, t.group_id,
         t.assigned_sub, t.received_at, t.updated_at
    FROM dx_core.tickets t`;

const SELECT_TICKET = `
  SELECT t.id, t.code, t.provisional_type, t.status, t.description, t.group_id,
         t.assigned_sub, t.received_at, t.updated_at,
         c.full_name AS customer_name, c.phone_normalized AS customer_phone, c.email AS customer_email,
         a.id AS attachment_id, a.storage_key, a.display_name, a.size_bytes,
         a.detected_mime, a.checksum_sha256, a.created_at AS attachment_created_at
    FROM dx_core.tickets t
    JOIN dx_core.customers c ON c.id = t.customer_id
    LEFT JOIN dx_core.ticket_attachments a ON a.ticket_id = t.id`;

function mapRow(row: Record<string, any>): ScopedTicketRow {
  return {
    id: row.id,
    code: row.code,
    provisionalType: row.provisional_type,
    status: row.status,
    description: row.description,
    groupId: row.group_id,
    assignedSub: row.assigned_sub,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    receivedAt: row.received_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    ...(row.attachment_id ? { attachment: {
      id: row.attachment_id,
      storageKey: row.storage_key,
      displayName: row.display_name,
      sizeBytes: Number(row.size_bytes),
      detectedMime: row.detected_mime,
      checksumSha256: row.checksum_sha256,
      createdAt: row.attachment_created_at.toISOString(),
    } } : {}),
  };
}

function mapListRow(row: Record<string, any>): TicketListRow {
  return {
    id: row.id,
    code: row.code,
    provisionalType: row.provisional_type,
    status: row.status,
    groupId: row.group_id,
    assignedSub: row.assigned_sub,
    receivedAt: row.received_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PostgresTicketReadStore implements TicketReadStore, ReadAuditPort {
  constructor(private readonly pool: pg.Pool) {}

  async listScoped(input: Parameters<TicketReadStore['listScoped']>[0]) {
    if (!input.organizationWide && input.groupIds.length === 0) return { rows: [], total: 0 };
    const values: unknown[] = [input.groupIds, input.organizationWide];
    let statusClause = '';
    if (input.status) {
      values.push(input.status);
      statusClause = ` AND t.status = $${values.length}`;
    }
    const countValues = [...values];
    values.push(input.limit, input.offset);
    const result = await this.pool.query(
      `${SELECT_LIST}
       WHERE t.group_id IS NOT NULL
         AND ($2::boolean OR t.group_id = ANY($1::text[]))${statusClause}
       ORDER BY t.received_at ASC, t.id ASC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    const count = await this.pool.query(
      `SELECT count(*)::int AS total FROM dx_core.tickets t
       WHERE t.group_id IS NOT NULL
         AND ($2::boolean OR t.group_id = ANY($1::text[]))${statusClause}`,
      countValues,
    );
    return { rows: result.rows.map(mapListRow), total: count.rows[0].total as number };
  }

  async getScoped(input: Parameters<TicketReadStore['getScoped']>[0]) {
    if (!input.organizationWide && input.groupIds.length === 0) return null;
    const result = await this.pool.query(
      `${SELECT_TICKET}
       WHERE t.id = $1::uuid
         AND t.group_id IS NOT NULL
         AND ($5::boolean OR (
           t.group_id = ANY($3::text[])
           AND (t.assigned_sub = $2 OR $4::boolean)
         ))`,
      [input.ticketId, input.sub, input.groupIds, input.groupLead, input.organizationWide],
    );
    return result.rowCount ? mapRow(result.rows[0]) : null;
  }

  async getAttachmentScoped(input: Parameters<TicketReadStore['getAttachmentScoped']>[0]) {
    const result = await this.pool.query(
      `${SELECT_TICKET}
       WHERE a.id = $1::uuid
         AND t.group_id IS NOT NULL
         AND ($4::boolean OR (t.assigned_sub = $2 AND t.group_id = ANY($3::text[])))`,
      [input.attachmentId, input.sub, input.groupIds, input.organizationWide],
    );
    return result.rowCount ? mapRow(result.rows[0]) : null;
  }

  async record(input: Parameters<ReadAuditPort['record']>[0]): Promise<void> {
    await this.pool.query(
      `INSERT INTO dx_core.audit_logs
        (actor_sub, action, aggregate_type, aggregate_id, correlation_id, causation_id, metadata)
       VALUES ($1, $2, 'ticket-access', $3, $4, $4, $5)`,
      [input.actorSub, input.action, input.resourceId, input.correlationId,
        JSON.stringify({ client_id: input.clientId, outcome: input.outcome })],
    );
  }
}
