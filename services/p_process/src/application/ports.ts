/**
 * DX-LAB Process Core (P) - Application Ports
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import { OutboxEventStatus, IdempotencyRecord, AuditLogRecord } from '../domain/types.js';

export interface IOutboxPort {
  publishEvent<T>(
    eventType: string,
    aggregateId: string,
    aggregateVersion: number,
    payload: T,
    actorSub: string,
    correlationId: string,
    causationId: string
  ): Promise<string>;
  fetchPendingEvents(batchSize: number): Promise<Array<{ id: string; eventType: string; payload: unknown }>>;
  updateEventStatus(eventId: string, status: OutboxEventStatus, errorMessage?: string): Promise<void>;
}

export interface IAuditPort {
  recordAudit(entry: AuditLogRecord): Promise<void>;
}

export interface IIdempotencyPort {
  getRecord(key: string): Promise<IdempotencyRecord | null>;
  lockKey(key: string, targetEndpoint: string, requestHash: string, ttlSeconds: number): Promise<boolean>;
  saveResponse(
    key: string,
    status: number,
    headers: Record<string, unknown>,
    body: unknown
  ): Promise<void>;
}
