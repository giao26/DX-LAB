/**
 * DX-LAB Process Core (P) - PostgreSQL Notification Outbox Store
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import type pg from 'pg';
import type { INotificationStore } from '../../application/ports.js';
import type { NotificationRecord, NotificationStatus } from '../../domain/notification.js';

function mapRowToNotification(row: any): NotificationRecord {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    ticketId: row.ticket_id,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    body: row.body,
    status: row.status as NotificationStatus,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    lastError: row.last_error ?? null,
    providerResponse: row.provider_response ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    sentAt: row.sent_at ? row.sent_at.toISOString() : null,
  };
}

export class PostgresNotificationStore implements INotificationStore {
  constructor(private readonly pool: pg.Pool) {}

  async claimPendingNotifications(limit = 10): Promise<NotificationRecord[]> {
    const result = await this.pool.query(
      `UPDATE dx_core.notifications
       SET status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP
       WHERE id IN (
         SELECT id FROM dx_core.notifications
         WHERE status IN ('PENDING', 'FAILED') AND retry_count < max_retries
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, idempotency_key, ticket_id, recipient_email, subject, body,
                 status, retry_count, max_retries, last_error, provider_response,
                 created_at, updated_at, sent_at`,
      [limit]
    );

    return result.rows.map(mapRowToNotification);
  }

  async findByIdempotencyKey(key: string): Promise<NotificationRecord | null> {
    const result = await this.pool.query(
      `SELECT
         id, idempotency_key, ticket_id, recipient_email, subject, body,
         status, retry_count, max_retries, last_error, provider_response,
         created_at, updated_at, sent_at
       FROM dx_core.notifications
       WHERE idempotency_key = $1`,
      [key]
    );
    if (!result.rowCount) return null;
    return mapRowToNotification(result.rows[0]);
  }

  async findByTicketId(ticketId: string): Promise<NotificationRecord | null> {
    const result = await this.pool.query(
      `SELECT
         id, idempotency_key, ticket_id, recipient_email, subject, body,
         status, retry_count, max_retries, last_error, provider_response,
         created_at, updated_at, sent_at
       FROM dx_core.notifications
       WHERE ticket_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT 1`,
      [ticketId]
    );
    if (!result.rowCount) return null;
    return mapRowToNotification(result.rows[0]);
  }

  async createNotification(
    input: {
      idempotencyKey: string;
      ticketId: string;
      recipientEmail: string;
      subject: string;
      body: string;
      status?: NotificationStatus;
    },
    client?: unknown
  ): Promise<NotificationRecord> {
    const queryRunner: { query: (q: string, params: any[]) => Promise<pg.QueryResult> } =
      (client as any) || this.pool;

    const result = await queryRunner.query(
      `INSERT INTO dx_core.notifications
         (idempotency_key, ticket_id, recipient_email, subject, body, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (idempotency_key) DO UPDATE
         SET updated_at = CURRENT_TIMESTAMP
       RETURNING id, idempotency_key, ticket_id, recipient_email, subject, body,
                 status, retry_count, max_retries, last_error, provider_response,
                 created_at, updated_at, sent_at`,
      [
        input.idempotencyKey,
        input.ticketId,
        input.recipientEmail,
        input.subject,
        input.body,
        input.status || 'PENDING',
      ]
    );

    return mapRowToNotification(result.rows[0]);
  }

  async updateNotificationStatus(
    id: string,
    status: NotificationStatus,
    details: {
      retryCount: number;
      lastError?: string | null;
      providerResponse?: Record<string, unknown> | null;
      sentAt?: Date | null;
    }
  ): Promise<void> {
    await this.pool.query(
      `UPDATE dx_core.notifications
       SET
         status = $2,
         retry_count = $3,
         last_error = $4,
         provider_response = $5,
         sent_at = $6,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1::uuid`,
      [
        id,
        status,
        details.retryCount,
        details.lastError ?? null,
        details.providerResponse ? JSON.stringify(details.providerResponse) : null,
        details.sentAt ?? null,
      ]
    );
  }
}
