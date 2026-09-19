/**
 * DX-LAB Process Core (P) - Domain Types & Invariants
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

/**
 * Universal ticket lifecycle status according to AD-20:
 * WAITING -> IN_PROGRESS -> CLOSED
 */
export type TicketLifecycleStatus = 'WAITING' | 'IN_PROGRESS' | 'CLOSED';

/**
 * Outbox Event status according to AD-3 and transactional outbox pattern
 */
export type OutboxEventStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'DEAD_LETTER';

/**
 * Standard integration event envelope interface according to AD-21
 */
export interface EventEnvelope<T = Record<string, unknown>> {
  event_id: string;
  event_type: string;
  aggregate_id: string;
  aggregate_version: number;
  occurred_at: string;
  actor_sub: string;
  correlation_id: string;
  causation_id: string;
  payload: T;
}

/**
 * Idempotency record interface according to AD-3
 */
export interface IdempotencyRecord {
  key: string;
  targetEndpoint: string;
  requestHash?: string;
  responseStatus?: number;
  responseHeaders?: Record<string, unknown>;
  responseBody?: unknown;
  lockedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Immutable audit log record according to AD-12
 */
export interface AuditLogRecord {
  id?: string;
  actorSub: string;
  occurredAt: Date;
  action: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  causationId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}
