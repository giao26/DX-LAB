/**
 * DX-LAB Process Core (P) - Reporting Domain Model & KPI Calculations (v1.0)
 * Implements standardized metric calculations, grant tokens, and access boundaries.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { InternalRole, Principal } from '../application/principal.js';
import { hasOrganizationWideAccess, isGroupLead } from '../application/principal.js';

export const REPORTING_DEFINITION_VERSION = 'v1.0';
export const ALL_SYSTEM_GROUPS = ['complaints', 'consulting', 'warranty'] as const;

export class ReportingAccessError extends Error {
  constructor(
    public readonly statusCode: 401 | 403 = 403,
    message = 'Truy cập bị từ chối do không đủ quyền.',
  ) {
    super(message);
    this.name = 'ReportingAccessError';
  }
}

export class ReportingValidationError extends Error {
  readonly statusCode = 400;

  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ReportingValidationError';
  }
}

export interface MetricValue {
  value: number;
  unit: string;
  denominator: number | null;
}

export interface CsatMetric {
  rate_percent: number | null;
  response_count: number;
  average_score: number | null;
  unanswered_count: number;
}

export interface StepDurationMetric {
  step_id: string;
  label: string;
  avg_duration_minutes: number;
}

export interface ReportingMetricsResponse {
  definition_version: 'v1.0';
  period: {
    from: string;
    to: string;
  };
  scope: {
    role: string;
    groups: string[];
  };
  kpis: {
    new_tickets: MetricValue;
    backlog_tickets: MetricValue;
    closed_tickets: MetricValue;
    within_sla_tickets: MetricValue;
    overdue_sla_tickets: MetricValue;
    csat: CsatMetric;
  };
  step_durations: StepDurationMetric[];
  ticket_ids: string[];
}

export interface ReportingGrantPayload {
  sub: string;
  roles: InternalRole[];
  allowed_groups: string[];
  issued_at: string;
  expires_at: string;
}

export interface ReportingGrantResponse {
  grant_token: string;
  sub: string;
  roles: InternalRole[];
  allowed_groups: string[];
  expires_at: string;
  signature: string;
}

export interface ReportingTicketInput {
  id: string;
  code: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'CLOSED';
  provisionalType: string;
  groupId: string;
  receivedAt: string;
  closedAt: string | null;
  slaOverdue: boolean;
  processingSteps?: Array<{
    id: string;
    label: string;
    startedAt: string;
    endedAt: string | null;
  }>;
  csatScore?: number | null;
}

export function canAccessReporting(roles: InternalRole[]): boolean {
  return roles.some((role) => role === 'group_lead' || role === 'department_head' || role === 'director');
}

export function resolveReportingScope(
  principal: Principal,
  requestedGroupId?: string,
): { role: string; groups: string[] } {
  if (!canAccessReporting(principal.roles)) {
    throw new ReportingAccessError(403, 'Vai trò không có quyền xem báo cáo điều hành.');
  }

  if (requestedGroupId !== undefined) {
    if (typeof requestedGroupId !== 'string' || !(ALL_SYSTEM_GROUPS as readonly string[]).includes(requestedGroupId)) {
      throw new ReportingAccessError(403, 'Bị từ chối truy cập do vượt phạm vi cho phép.');
    }
  }

  if (hasOrganizationWideAccess(principal)) {
    const role = principal.roles.includes('director') ? 'director' : 'department_head';
    if (requestedGroupId) {
      return { role, groups: [requestedGroupId] };
    }
    return { role, groups: [...ALL_SYSTEM_GROUPS] };
  }

  if (isGroupLead(principal)) {
    if (!principal.groupIds || principal.groupIds.length === 0) {
      throw new ReportingAccessError(403, 'Trưởng nhóm chưa được phân công nhóm quản lý.');
    }
    if (requestedGroupId) {
      if (!principal.groupIds.includes(requestedGroupId)) {
        throw new ReportingAccessError(403, 'Bị từ chối truy cập do vượt phạm vi cho phép.');
      }
      return { role: 'group_lead', groups: [requestedGroupId] };
    }
    const validAssigned = principal.groupIds.filter((g) => (ALL_SYSTEM_GROUPS as readonly string[]).includes(g));
    if (validAssigned.length === 0) {
      throw new ReportingAccessError(403, 'Trưởng nhóm chưa được phân công nhóm hợp lệ.');
    }
    return { role: 'group_lead', groups: validAssigned };
  }

  throw new ReportingAccessError(403, 'Vai trò không có quyền xem báo cáo điều hành.');
}

export function calculateCsat(
  ratings: Array<{ score: number | null | undefined }>,
  closedCount: number,
): CsatMetric {
  const valid = ratings.filter(
    (r): r is { score: number } =>
      r.score !== null &&
      r.score !== undefined &&
      Number.isInteger(r.score) &&
      r.score >= 1 &&
      r.score <= 5,
  );

  const response_count = valid.length;
  const unanswered_count = Math.max(0, closedCount - response_count);

  if (response_count === 0) {
    return {
      rate_percent: null,
      response_count: 0,
      average_score: null,
      unanswered_count,
    };
  }

  const favorableCount = valid.filter((r) => r.score >= 4).length;
  const rate_percent = Number(((favorableCount / response_count) * 100).toFixed(1));

  const sum = valid.reduce((acc, r) => acc + r.score, 0);
  const average_score = Number((sum / response_count).toFixed(2));

  return {
    rate_percent,
    response_count,
    average_score,
    unanswered_count,
  };
}

export function calculateStepDurations(
  stepsList: Array<Array<{ id: string; label: string; startedAt: string; endedAt: string | null }>>,
): StepDurationMetric[] {
  const stepMap = new Map<string, { label: string; totalMinutes: number; count: number }>();

  for (const steps of stepsList) {
    for (const step of steps) {
      if (step.startedAt && step.endedAt) {
        const start = Date.parse(step.startedAt);
        const end = Date.parse(step.endedAt);
        if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
          const durationMinutes = (end - start) / 60000;
          const current = stepMap.get(step.id);
          if (current) {
            current.totalMinutes += durationMinutes;
            current.count += 1;
          } else {
            stepMap.set(step.id, {
              label: step.label,
              totalMinutes: durationMinutes,
              count: 1,
            });
          }
        }
      }
    }
  }

  const results: StepDurationMetric[] = [];
  const sortedIds = Array.from(stepMap.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const step_id of sortedIds) {
    const entry = stepMap.get(step_id)!;
    const avg_duration_minutes = Number((entry.totalMinutes / entry.count).toFixed(1));
    results.push({
      step_id,
      label: entry.label,
      avg_duration_minutes,
    });
  }

  return results;
}

export function calculateReportingMetrics(input: {
  tickets: ReportingTicketInput[];
  period: { from: string; to: string };
  scope: { role: string; groups: string[] };
}): ReportingMetricsResponse {
  const totalTickets = input.tickets.length;
  const closedTickets = input.tickets.filter((t) => t.status === 'CLOSED');
  const backlogTickets = input.tickets.filter((t) => t.status !== 'CLOSED');

  const withinSlaTickets = closedTickets.filter((t) => !t.slaOverdue);
  const overdueSlaTickets = closedTickets.filter((t) => t.slaOverdue);

  const denominator = closedTickets.length > 0 ? closedTickets.length : null;

  const csatRatings = closedTickets.map((t) => ({ score: t.csatScore }));
  const csat = calculateCsat(csatRatings, closedTickets.length);

  const stepDurations = calculateStepDurations(
    input.tickets.map((t) => t.processingSteps || []),
  );

  return {
    definition_version: REPORTING_DEFINITION_VERSION,
    period: {
      from: input.period.from,
      to: input.period.to,
    },
    scope: {
      role: input.scope.role,
      groups: input.scope.groups,
    },
    kpis: {
      new_tickets: {
        value: totalTickets,
        unit: 'ticket',
        denominator: null,
      },
      backlog_tickets: {
        value: backlogTickets.length,
        unit: 'ticket',
        denominator: null,
      },
      closed_tickets: {
        value: closedTickets.length,
        unit: 'ticket',
        denominator: null,
      },
      within_sla_tickets: {
        value: withinSlaTickets.length,
        unit: 'ticket',
        denominator,
      },
      overdue_sla_tickets: {
        value: overdueSlaTickets.length,
        unit: 'ticket',
        denominator,
      },
      csat,
    },
    step_durations: stepDurations,
    ticket_ids: input.tickets.map((t) => t.id),
  };
}

export function createReportingGrant(
  principal: Principal,
  requestedGroups: string[] | undefined,
  secret: string,
  ttlSeconds = 300,
): ReportingGrantResponse {
  if (!canAccessReporting(principal.roles)) {
    throw new ReportingAccessError(403, 'Vai trò không có quyền xem báo cáo điều hành.');
  }

  if (requestedGroups !== undefined) {
    if (!Array.isArray(requestedGroups) || requestedGroups.some((g) => typeof g !== 'string' || !(ALL_SYSTEM_GROUPS as readonly string[]).includes(g))) {
      throw new ReportingAccessError(403, 'Bị từ chối do nhóm yêu cầu vượt quá phạm vi được phép.');
    }
  }

  let allowed_groups: string[];

  if (hasOrganizationWideAccess(principal)) {
    if (requestedGroups && requestedGroups.length > 0) {
      allowed_groups = Array.from(new Set(requestedGroups));
    } else {
      allowed_groups = [...ALL_SYSTEM_GROUPS];
    }
  } else if (isGroupLead(principal)) {
    if (!principal.groupIds || principal.groupIds.length === 0) {
      throw new ReportingAccessError(403, 'Trưởng nhóm chưa được phân công nhóm quản lý.');
    }
    if (requestedGroups && requestedGroups.length > 0) {
      for (const g of requestedGroups) {
        if (!principal.groupIds.includes(g)) {
          throw new ReportingAccessError(403, 'Bị từ chối do nhóm yêu cầu vượt quá phạm vi được phép.');
        }
      }
      allowed_groups = Array.from(new Set(requestedGroups));
    } else {
      const validAssigned = principal.groupIds.filter((g) => (ALL_SYSTEM_GROUPS as readonly string[]).includes(g));
      if (validAssigned.length === 0) {
        throw new ReportingAccessError(403, 'Trưởng nhóm chưa được phân công nhóm hợp lệ.');
      }
      allowed_groups = validAssigned;
    }
  } else {
    throw new ReportingAccessError(403, 'Vai trò không có quyền xem báo cáo điều hành.');
  }

  const issued_at = new Date().toISOString();
  const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const payload: ReportingGrantPayload = {
    sub: principal.sub,
    roles: principal.roles,
    allowed_groups,
    issued_at,
    expires_at,
  };

  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(payloadEncoded).digest('hex');
  const grant_token = `${payloadEncoded}.${signature}`;

  return {
    grant_token,
    sub: principal.sub,
    roles: principal.roles,
    allowed_groups,
    expires_at,
    signature,
  };
}

export function verifyReportingGrant(
  grantToken: string,
  secret: string,
): ReportingGrantPayload {
  const parts = grantToken.split('.');
  if (parts.length !== 2) {
    throw new ReportingAccessError(401, 'Grant token không hợp lệ.');
  }

  const [payloadEncoded, signature] = parts;
  const expectedSignature = createHmac('sha256', secret).update(payloadEncoded).digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expectedSignature, 'hex');

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new ReportingAccessError(401, 'Chữ ký grant token không hợp lệ.');
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8')) as ReportingGrantPayload;
    const exp = Date.parse(payload.expires_at);
    if (Number.isNaN(exp) || exp < Date.now()) {
      throw new ReportingAccessError(401, 'Grant token đã hết hạn hoặc không hợp lệ.');
    }
    return payload;
  } catch (err) {
    if (err instanceof ReportingAccessError) throw err;
    throw new ReportingAccessError(401, 'Dữ liệu grant token không hợp lệ.');
  }
}
