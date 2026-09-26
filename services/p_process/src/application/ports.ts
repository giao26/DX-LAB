/**
 * DX-LAB Process Core (P) - Application Ports
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import { OutboxEventStatus, IdempotencyRecord, AuditLogRecord } from '../domain/types.js';
import { NotificationRecord, NotificationStatus } from '../domain/notification.js';
import type { AssignmentResult } from '../domain/assignment.js';
export type { TicketProcessingStore, ProcessingCommand } from './process-ticket.js';

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

export interface INotificationStore {
  claimPendingNotifications(limit?: number): Promise<NotificationRecord[]>;
  findByIdempotencyKey(key: string): Promise<NotificationRecord | null>;
  findByTicketId(ticketId: string): Promise<NotificationRecord | null>;
  createNotification(
    input: {
      idempotencyKey: string;
      ticketId: string;
      recipientEmail: string;
      subject: string;
      body: string;
      status?: NotificationStatus;
    },
    client?: unknown
  ): Promise<NotificationRecord>;
  updateNotificationStatus(
    id: string,
    status: NotificationStatus,
    details: {
      retryCount: number;
      lastError?: string | null;
      providerResponse?: Record<string, unknown> | null;
      sentAt?: Date | null;
    }
  ): Promise<void>;
}

export interface SendMailOptions {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendMailResult {
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  response?: string;
}

export interface IMailerPort {
  sendMail(options: SendMailOptions): Promise<SendMailResult>;
}

export interface IAssignmentStore {
  assignTicket(
    ticket: { id: string; code: string; groupId: string },
    correlationId: string,
    client?: unknown,
  ): Promise<AssignmentResult>;

  assignNextQueuedTicket(
    groupId: string,
    correlationId?: string,
    client?: unknown,
  ): Promise<AssignmentResult | null>;
}

export interface OutboxEventRecord {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateVersion: number;
  occurredAt: string;
  actorSub: string;
  correlationId: string;
  causationId: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DEAD_LETTER';
  retryCount: number;
  lastAttemptedAt?: string | null;
  errorMessage?: string | null;
}

export interface IOutboxEventStore {
  claimPendingEvents(batchSize?: number): Promise<OutboxEventRecord[]>;
  updateEventStatus(
    eventId: string,
    status: 'PENDING' | 'SENT' | 'FAILED' | 'DEAD_LETTER',
    details: {
      retryCount: number;
      errorMessage?: string | null;
      lastAttemptedAt?: Date | null;
    },
  ): Promise<void>;
}

export interface IEventRelayPort {
  relayEvent(event: OutboxEventRecord): Promise<{ success: boolean; error?: string }>;
}
