/**
 * DX-LAB Process Core (P) - Read Reporting Use Case
 * Coordinates operational metrics calculation, scope checks, HMAC grant issuance, and CSAT submission.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import type { IReportingStore, CsatRatingRecord } from './ports.js';
import type { IAuditPort } from './ports.js';
import type { Principal } from './principal.js';
import {
  calculateReportingMetrics,
  createReportingGrant,
  resolveReportingScope,
  ReportingValidationError,
  type ReportingGrantResponse,
  type ReportingMetricsResponse,
} from '../domain/reporting.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ReadReportingUseCase {
  private readonly secret: string;

  constructor(
    private readonly store: IReportingStore,
    private readonly auditPort?: IAuditPort,
    secret?: string,
  ) {
    this.secret = secret || process.env.REPORTING_HMAC_SECRET || 'dxlab-reporting-hmac-secret-default-key-32';
  }

  async getMetrics(
    principal: Principal,
    query: { from?: string; to?: string; groupId?: string },
    correlationId: string,
  ): Promise<ReportingMetricsResponse> {
    const scope = resolveReportingScope(principal, query.groupId);

    let fromDate: Date;
    if (query.from) {
      fromDate = new Date(query.from);
      if (Number.isNaN(fromDate.getTime())) {
        throw new ReportingValidationError('Mốc thời gian bắt đầu (from) không đúng định dạng ISO.');
      }
    } else {
      const now = new Date();
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    }

    let toDate: Date;
    if (query.to) {
      toDate = new Date(query.to);
      if (Number.isNaN(toDate.getTime())) {
        throw new ReportingValidationError('Mốc thời gian kết thúc (to) không đúng định dạng ISO.');
      }
    } else {
      toDate = new Date();
    }

    if (fromDate.getTime() > toDate.getTime()) {
      throw new ReportingValidationError('Mốc thời gian bắt đầu (from) không được sau mốc thời gian kết thúc (to).');
    }

    const tickets = await this.store.queryReportingTickets({
      from: fromDate,
      to: toDate,
      groupIds: scope.groups,
    });

    const metrics = calculateReportingMetrics({
      tickets,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      scope,
    });

    if (this.auditPort) {
      await this.auditPort.recordAudit({
        actorSub: principal.sub,
        occurredAt: new Date(),
        action: 'reporting.metrics.view',
        aggregateType: 'reporting',
        aggregateId: correlationId,
        correlationId,
        causationId: correlationId,
        metadata: {
          roles: principal.roles,
          groups: scope.groups,
          period: { from: fromDate.toISOString(), to: toDate.toISOString() },
        },
      });
    }

    return metrics;
  }

  async issueGrant(
    principal: Principal,
    input: { groups?: string[] } | undefined,
    correlationId: string,
  ): Promise<ReportingGrantResponse> {
    const grant = createReportingGrant(principal, input?.groups, this.secret);

    if (this.auditPort) {
      await this.auditPort.recordAudit({
        actorSub: principal.sub,
        occurredAt: new Date(),
        action: 'reporting.grant.issue',
        aggregateType: 'reporting',
        aggregateId: correlationId,
        correlationId,
        causationId: correlationId,
        metadata: {
          roles: principal.roles,
          allowed_groups: grant.allowed_groups,
          expires_at: grant.expires_at,
        },
      });
    }

    return grant;
  }

  async submitCsat(
    ticketId: string,
    input: unknown,
  ): Promise<CsatRatingRecord> {
    if (!ticketId || !UUID_REGEX.test(ticketId)) {
      throw new ReportingValidationError('Mã định danh ticket không hợp lệ (phải là UUID).');
    }

    if (!input || typeof input !== 'object') {
      throw new ReportingValidationError('Dữ liệu đánh giá CSAT không hợp lệ.');
    }

    const { score, comment } = input as { score?: unknown; comment?: unknown };

    if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
      throw new ReportingValidationError('Điểm đánh giá CSAT phải là số nguyên từ 1 đến 5 sao.');
    }

    if (comment !== undefined && comment !== null && typeof comment !== 'string') {
      throw new ReportingValidationError('Nhận xét phải là chuỗi văn bản.');
    }

    if (typeof comment === 'string' && comment.length > 2000) {
      throw new ReportingValidationError('Nhận xét không được vượt quá 2000 ký tự.');
    }

    const record = await this.store.saveCsatRating({
      ticketId,
      score,
      comment: typeof comment === 'string' ? comment : undefined,
    });

    if (this.auditPort) {
      await this.auditPort.recordAudit({
        actorSub: 'customer',
        occurredAt: new Date(),
        action: 'reporting:csat_submitted',
        aggregateType: 'ticket',
        aggregateId: ticketId,
        correlationId: ticketId,
        causationId: ticketId,
        metadata: {
          score,
          hasComment: Boolean(comment),
        },
      });
    }

    return record;
  }
}
