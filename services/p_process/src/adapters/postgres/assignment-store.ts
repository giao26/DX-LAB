/**
 * DX-LAB Process Core (P) - PostgreSQL Fair Ticket Assignment Store
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import type pg from 'pg';
import type {
  IAssignmentStore,
  IOutboxEventStore,
  OutboxEventRecord,
} from '../../application/ports.js';
import {
  type AssignmentResult,
  buildTicketAssignedPayload,
} from '../../domain/assignment.js';

interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<pg.QueryResult>;
}

export class PostgresAssignmentStore implements IAssignmentStore, IOutboxEventStore {
  constructor(private readonly pool: pg.Pool) {}

  async assignTicket(
    ticket: { id: string; code: string; groupId: string },
    correlationId: string,
    client?: unknown,
  ): Promise<AssignmentResult> {
    const isExternalClient = Boolean(client);
    const dbClient = (client as Queryable) ?? (await this.pool.connect());

    try {
      if (!isExternalClient) {
        await (dbClient as pg.PoolClient).query('BEGIN');
      }

      // Fair assignment query with row locking:
      // Priority: lowest official_assignment_count, least recently assigned (NULLS FIRST), ascending invariant sub.
      // SKIP LOCKED prevents concurrent double-assignment without blocking transactions.
      const candidateResult = await dbClient.query(
        `SELECT sub FROM dx_core.staff_roster s
         WHERE s.group_id = $1 AND s.is_active = TRUE
           AND NOT EXISTS (
             SELECT 1 FROM dx_core.tickets t
             WHERE t.assigned_sub = s.sub AND t.status IN ('WAITING', 'IN_PROGRESS')
           )
         ORDER BY s.official_assignment_count ASC, s.last_assigned_at ASC NULLS FIRST, s.sub ASC
         FOR UPDATE SKIP LOCKED LIMIT 1`,
        [ticket.groupId],
      );

      if (!candidateResult.rowCount) {
        if (!isExternalClient) {
          await (dbClient as pg.PoolClient).query('COMMIT');
        }
        return {
          assigned: false,
          assignedSub: null,
          ticketId: ticket.id,
          ticketCode: ticket.code,
          groupId: ticket.groupId,
        };
      }

      const assignedSub = candidateResult.rows[0].sub as string;

      // Increment assignment count and update last_assigned_at timestamp
      await dbClient.query(
        `UPDATE dx_core.staff_roster
         SET official_assignment_count = official_assignment_count + 1,
             last_assigned_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE sub = $1`,
        [assignedSub],
      );

      // Assign ticket
      const assignedTicket = await dbClient.query(
        `UPDATE dx_core.tickets
         SET assigned_sub = $1,
             version = version + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2::uuid RETURNING version`,
        [assignedSub, ticket.id],
      );

      const eventPayload = buildTicketAssignedPayload({
        ticketId: ticket.id,
        ticketCode: ticket.code,
        assignedSub,
        groupId: ticket.groupId,
      });

      // Write transactional outbox event
      await dbClient.query(
        `INSERT INTO dx_core.outbox_events
          (event_type, aggregate_id, aggregate_version, actor_sub, correlation_id, causation_id, payload, status)
         VALUES ('TICKET_ASSIGNED', $1, $5, 'system-assignment', $2, $3, $4, 'PENDING')`,
        [ticket.id, correlationId, ticket.id, JSON.stringify(eventPayload), assignedTicket.rows[0]?.version ?? 2],
      );

      // Write immutable audit log
      await dbClient.query(
        `INSERT INTO dx_core.audit_logs
          (actor_sub, action, aggregate_type, aggregate_id, correlation_id, causation_id, after_state, metadata)
         VALUES ('system-assignment', 'ticket.assigned', 'ticket', $1, $2, $3, $4, $5)`,
        [
          ticket.id,
          correlationId,
          ticket.id,
          JSON.stringify({ ticketId: ticket.id, assignedSub, groupId: ticket.groupId }),
          JSON.stringify({ source: 'fair-assignment', assignedSub }),
        ],
      );

      if (!isExternalClient) {
        await (dbClient as pg.PoolClient).query('COMMIT');
      }

      return {
        assigned: true,
        assignedSub,
        ticketId: ticket.id,
        ticketCode: ticket.code,
        groupId: ticket.groupId,
      };
    } catch (error) {
      if (!isExternalClient) {
        try {
          await (dbClient as pg.PoolClient).query('ROLLBACK');
        } catch {
          // Preserve primary error
        }
      }
      throw error;
    } finally {
      if (!isExternalClient) {
        (dbClient as pg.PoolClient).release?.();
      }
    }
  }

  async assignNextQueuedTicket(
    groupId: string,
    correlationId = 'system:queue-dispatch',
    client?: unknown,
  ): Promise<AssignmentResult | null> {
    const isExternalClient = Boolean(client);
    const dbClient = (client as Queryable) ?? (await this.pool.connect());

    try {
      if (!isExternalClient) {
        await (dbClient as pg.PoolClient).query('BEGIN');
      }

      // Lock earliest waiting ticket in FIFO order
      const ticketResult = await dbClient.query(
        `SELECT id, code, group_id
         FROM dx_core.tickets
         WHERE group_id = $1 AND assigned_sub IS NULL AND status = 'WAITING'
         ORDER BY received_at ASC, id ASC
         FOR UPDATE SKIP LOCKED LIMIT 1`,
        [groupId],
      );

      if (!ticketResult.rowCount) {
        if (!isExternalClient) {
          await (dbClient as pg.PoolClient).query('COMMIT');
        }
        return null;
      }

      const row = ticketResult.rows[0];
      const ticket = {
        id: row.id as string,
        code: row.code as string,
        groupId: row.group_id as string,
      };

      const result = await this.assignTicket(ticket, correlationId, dbClient);

      if (!isExternalClient) {
        await (dbClient as pg.PoolClient).query('COMMIT');
      }

      return result;
    } catch (error) {
      if (!isExternalClient) {
        try {
          await (dbClient as pg.PoolClient).query('ROLLBACK');
        } catch {
          // Preserve primary error
        }
      }
      throw error;
    } finally {
      if (!isExternalClient) {
        (dbClient as pg.PoolClient).release?.();
      }
    }
  }

  async claimPendingEvents(batchSize = 10): Promise<OutboxEventRecord[]> {
    const result = await this.pool.query(
      `UPDATE dx_core.outbox_events
       SET status = 'PROCESSING',
           last_attempted_at = CURRENT_TIMESTAMP
       WHERE event_id IN (
         SELECT event_id FROM dx_core.outbox_events
         WHERE event_type IN ('TICKET_ASSIGNED', 'ticket.processing.v1')
           AND status IN ('PENDING', 'FAILED')
           AND retry_count < 3
           AND (last_attempted_at IS NULL OR last_attempted_at <= CURRENT_TIMESTAMP - (INTERVAL '1 second' * POWER(2, retry_count)))
         ORDER BY occurred_at ASC, created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING event_id, event_type, aggregate_id, aggregate_version, occurred_at,
                 actor_sub, correlation_id, causation_id, payload, status, retry_count,
                 last_attempted_at, error_message`,
      [batchSize],
    );

    return result.rows.map((row) => ({
      eventId: row.event_id,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      aggregateVersion: row.aggregate_version,
      occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at),
      actorSub: row.actor_sub,
      correlationId: row.correlation_id,
      causationId: row.causation_id,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      status: row.status,
      retryCount: row.retry_count,
      lastAttemptedAt: row.last_attempted_at instanceof Date ? row.last_attempted_at.toISOString() : (row.last_attempted_at ?? null),
      errorMessage: row.error_message,
    }));
  }

  async updateEventStatus(
    eventId: string,
    status: 'PENDING' | 'SENT' | 'FAILED' | 'DEAD_LETTER',
    details: {
      retryCount: number;
      errorMessage?: string | null;
      lastAttemptedAt?: Date | null;
    },
  ): Promise<void> {
    await this.pool.query(
      `UPDATE dx_core.outbox_events
       SET status = $2,
           retry_count = $3,
           error_message = $4,
           last_attempted_at = COALESCE($5::timestamptz, CURRENT_TIMESTAMP)
       WHERE event_id = $1::uuid`,
      [
        eventId,
        status,
        details.retryCount,
        details.errorMessage ?? null,
        details.lastAttemptedAt ?? null,
      ],
    );
  }
}
