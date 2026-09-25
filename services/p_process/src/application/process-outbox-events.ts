/**
 * DX-LAB Process Core (P) - Process Outbox Events Use Case
 * Coordinates relaying outbox events to external systems (e.g. Odoo) with bounded retry and dead-letter.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import type {
  IAuditPort,
  IEventRelayPort,
  IOutboxEventStore,
  OutboxEventRecord,
} from './ports.js';

export const MAX_OUTBOX_RETRIES = 3;

export interface ProcessEventResult {
  success: boolean;
  status: 'SENT' | 'FAILED' | 'DEAD_LETTER';
  error?: string;
}

export interface ProcessOutboxBatchResult {
  processed: number;
  sent: number;
  failed: number;
  deadLetter: number;
}

export class ProcessOutboxEventsUseCase {
  constructor(
    private readonly outboxStore: IOutboxEventStore,
    private readonly relayPort: IEventRelayPort,
    private readonly auditPort?: IAuditPort,
    private readonly logger?: {
      info: (...args: any[]) => void;
      error: (...args: any[]) => void;
      warn: (...args: any[]) => void;
    },
    private readonly maxRetries = MAX_OUTBOX_RETRIES,
  ) {}

  async processEvent(event: OutboxEventRecord): Promise<ProcessEventResult> {
    if (event.status === 'SENT') {
      return { success: true, status: 'SENT' };
    }
    if (event.status === 'DEAD_LETTER') {
      return {
        success: false,
        status: 'DEAD_LETTER',
        error: event.errorMessage ?? 'Max retries exceeded',
      };
    }

    try {
      const relayResult = await this.relayPort.relayEvent(event);

      if (relayResult.success) {
        const attemptedAt = new Date();
        await this.outboxStore.updateEventStatus(event.eventId, 'SENT', {
          retryCount: event.retryCount,
          lastAttemptedAt: attemptedAt,
          errorMessage: null,
        });

        if (this.auditPort) {
          try {
            await this.auditPort.recordAudit({
              actorSub: 'system:outbox-relay',
              occurredAt: attemptedAt,
              action: 'outbox.event.relayed',
              aggregateType: 'outbox',
              aggregateId: event.eventId,
              correlationId: event.correlationId,
              causationId: event.eventId,
              metadata: {
                eventType: event.eventType,
                aggregateId: event.aggregateId,
              },
            });
          } catch (auditError) {
            this.logger?.error?.({ auditError }, 'Audit log recording failed after successful relay');
          }
        }

        this.logger?.info?.(
          { eventId: event.eventId, eventType: event.eventType, aggregateId: event.aggregateId },
          'Outbox event relayed successfully',
        );

        return { success: true, status: 'SENT' };
      }

      const nextRetryCount = event.retryCount + 1;
      const isDeadLetter = nextRetryCount >= this.maxRetries;
      const newStatus = isDeadLetter ? 'DEAD_LETTER' : 'FAILED';
      const errorMessage = relayResult.error ?? 'Relay failed with unspecified error';

      await this.outboxStore.updateEventStatus(event.eventId, newStatus, {
        retryCount: nextRetryCount,
        errorMessage,
        lastAttemptedAt: new Date(),
      });

      if (this.auditPort) {
        try {
          await this.auditPort.recordAudit({
            actorSub: 'system:outbox-relay',
            occurredAt: new Date(),
            action: isDeadLetter ? 'outbox.event.dead_letter' : 'outbox.event.failed',
            aggregateType: 'outbox',
            aggregateId: event.eventId,
            correlationId: event.correlationId,
            causationId: event.eventId,
            metadata: {
              retryCount: nextRetryCount,
              error: errorMessage,
              operationalAlert: isDeadLetter,
            },
          });
        } catch (auditError) {
          this.logger?.error?.({ auditError }, 'Audit log recording failed for relay failure');
        }
      }

      if (isDeadLetter) {
        this.logger?.warn?.(
          {
            eventId: event.eventId,
            eventType: event.eventType,
            aggregateId: event.aggregateId,
            retryCount: nextRetryCount,
            error: errorMessage,
          },
          'CẢNH BÁO VẬN HÀNH: Sự kiện outbox đã chuyển sang DEAD_LETTER do quá số lần thử tối đa.',
        );
      } else {
        this.logger?.error?.(
          {
            eventId: event.eventId,
            eventType: event.eventType,
            retryCount: nextRetryCount,
            error: errorMessage,
          },
          `Outbox relay attempt failed: ${errorMessage}`,
        );
      }

      return { success: false, status: newStatus, error: errorMessage };
    } catch (rawError) {
      const errorMessage = rawError instanceof Error ? rawError.message : String(rawError);
      const nextRetryCount = event.retryCount + 1;
      const isDeadLetter = nextRetryCount >= this.maxRetries;
      const newStatus = isDeadLetter ? 'DEAD_LETTER' : 'FAILED';

      await this.outboxStore.updateEventStatus(event.eventId, newStatus, {
        retryCount: nextRetryCount,
        errorMessage,
        lastAttemptedAt: new Date(),
      });

      if (this.auditPort) {
        try {
          await this.auditPort.recordAudit({
            actorSub: 'system:outbox-relay',
            occurredAt: new Date(),
            action: isDeadLetter ? 'outbox.event.dead_letter' : 'outbox.event.failed',
            aggregateType: 'outbox',
            aggregateId: event.eventId,
            correlationId: event.correlationId,
            causationId: event.eventId,
            metadata: {
              retryCount: nextRetryCount,
              error: errorMessage,
              operationalAlert: isDeadLetter,
            },
          });
        } catch (auditError) {
          this.logger?.error?.({ auditError }, 'Audit log recording failed for relay exception');
        }
      }

      if (isDeadLetter) {
        this.logger?.warn?.(
          {
            eventId: event.eventId,
            eventType: event.eventType,
            aggregateId: event.aggregateId,
            retryCount: nextRetryCount,
            error: errorMessage,
          },
          'CẢNH BÁO VẬN HÀNH: Sự kiện outbox đã chuyển sang DEAD_LETTER do ngoại lệ quá số lần thử tối đa.',
        );
      }

      return { success: false, status: newStatus, error: errorMessage };
    }
  }

  async processPending(limit = 10): Promise<ProcessOutboxBatchResult> {
    const pendingEvents = await this.outboxStore.claimPendingEvents(limit);
    let sent = 0;
    let failed = 0;
    let deadLetter = 0;

    for (const event of pendingEvents) {
      const result = await this.processEvent(event);
      if (result.status === 'SENT') {
        sent++;
      } else if (result.status === 'DEAD_LETTER') {
        deadLetter++;
      } else {
        failed++;
      }
    }

    return {
      processed: pendingEvents.length,
      sent,
      failed,
      deadLetter,
    };
  }
}

/**
 * HTTP implementation of IEventRelayPort targeting Odoo webhook
 */
export class HttpOdooEventRelay implements IEventRelayPort {
  constructor(
    private readonly webhookUrl: string = process.env.ODOO_WEBHOOK_URL || 'http://odoo:8069/dx/api/v1/events',
    private readonly serviceKey: string = process.env.INTERNAL_SERVICE_KEY || process.env.ODOO_INTERNAL_SERVICE_KEY || 'dxlab-internal-service-secret',
    private readonly timeoutMs: number = 5000,
  ) {}

  async relayEvent(event: OutboxEventRecord): Promise<{ success: boolean; error?: string }> {
    const envelope = {
      event_id: event.eventId,
      event_type: event.eventType,
      aggregate_id: event.aggregateId,
      aggregate_version: event.aggregateVersion,
      occurred_at: event.occurredAt,
      payload: event.payload,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Key': this.serviceKey,
        },
        body: JSON.stringify(envelope),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown error');
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText.slice(0, 300)}`,
        };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    } finally {
      clearTimeout(timeout);
    }
  }
}
