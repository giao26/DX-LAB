/**
 * DX-LAB Process Core (P) - PostgreSQL Reporting Store Adapter
 * Queries sanitized v_reporting_tickets_v1 view without PII and manages CSAT ratings.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import type pg from 'pg';
import type { IReportingStore, ReportingTicketRow, CsatRatingRecord } from '../../application/ports.js';

export class CsatError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CsatError';
  }
}

export class PostgresReportingStore implements IReportingStore {
  constructor(private readonly pool: pg.Pool) {}

  async queryReportingTickets(input: {
    from: Date;
    to: Date;
    groupIds: string[];
  }): Promise<ReportingTicketRow[]> {
    if (input.groupIds.length === 0) {
      return [];
    }

    const result = await this.pool.query(
      `SELECT
         id, code, status, provisional_type, group_id, assigned_sub,
         received_at, closed_at, sla_due_at, sla_overdue, processing_steps,
         csat_score, csat_created_at
       FROM dx_core.v_reporting_tickets_v1
       WHERE received_at >= $1
         AND received_at <= $2
         AND group_id = ANY($3::text[])
       ORDER BY received_at DESC`,
      [input.from, input.to, input.groupIds],
    );

    return result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      status: row.status,
      provisionalType: row.provisional_type,
      groupId: row.group_id,
      assignedSub: row.assigned_sub,
      receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : String(row.received_at),
      closedAt: row.closed_at ? (row.closed_at instanceof Date ? row.closed_at.toISOString() : String(row.closed_at)) : null,
      slaDueAt: row.sla_due_at ? (row.sla_due_at instanceof Date ? row.sla_due_at.toISOString() : String(row.sla_due_at)) : null,
      slaOverdue: Boolean(row.sla_overdue),
      processingSteps: Array.isArray(row.processing_steps)
        ? row.processing_steps
        : typeof row.processing_steps === 'string'
          ? JSON.parse(row.processing_steps)
          : [],
      csatScore: row.csat_score !== null && row.csat_score !== undefined ? Number(row.csat_score) : null,
      csatCreatedAt: row.csat_created_at
        ? (row.csat_created_at instanceof Date ? row.csat_created_at.toISOString() : String(row.csat_created_at))
        : null,
    }));
  }

  async saveCsatRating(input: {
    ticketId: string;
    score: number;
    comment?: string | null;
  }): Promise<CsatRatingRecord> {
    const ticketCheck = await this.pool.query(
      `SELECT id, status FROM dx_core.tickets WHERE id = $1::uuid`,
      [input.ticketId],
    );

    if (ticketCheck.rowCount === 0) {
      throw new CsatError(404, 'TICKET_NOT_FOUND', 'Không tìm thấy ticket để đánh giá CSAT.');
    }

    if (ticketCheck.rows[0].status !== 'CLOSED') {
      throw new CsatError(422, 'TICKET_NOT_CLOSED', 'Chỉ có thể đánh giá CSAT cho ticket đã hoàn tất.');
    }

    const existing = await this.pool.query(
      `SELECT id FROM dx_core.csat_ratings WHERE ticket_id = $1::uuid`,
      [input.ticketId],
    );

    if (existing.rowCount && existing.rowCount > 0) {
      throw new CsatError(409, 'CSAT_ALREADY_EXISTS', 'Ticket này đã được gửi phản hồi CSAT trước đó.');
    }

    try {
      const result = await this.pool.query(
        `INSERT INTO dx_core.csat_ratings (ticket_id, score, comment)
         VALUES ($1::uuid, $2, $3)
         RETURNING id, ticket_id, score, comment, created_at`,
        [input.ticketId, input.score, input.comment?.trim() || null],
      );

      const row = result.rows[0];
      return {
        id: row.id,
        ticketId: row.ticket_id,
        score: Number(row.score),
        comment: row.comment,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      };
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new CsatError(409, 'CSAT_ALREADY_EXISTS', 'Ticket này đã được gửi phản hồi CSAT trước đó.');
      }
      throw err;
    }
  }

  async getCsatRating(ticketId: string): Promise<CsatRatingRecord | null> {
    const result = await this.pool.query(
      `SELECT id, ticket_id, score, comment, created_at
       FROM dx_core.csat_ratings
       WHERE ticket_id = $1::uuid`,
      [ticketId],
    );

    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      ticketId: row.ticket_id,
      score: Number(row.score),
      comment: row.comment,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }
}
