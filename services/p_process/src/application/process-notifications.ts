/**
 * DX-LAB Process Core (P) - Process Notifications Use Case
 * Coordinates outbox email notification dispatch with bounded retry and idempotency.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import type { IAuditPort, IMailerPort, INotificationStore } from './ports.js';
import {
  buildConfirmationEmailIdempotencyKey,
  MAX_NOTIFICATION_RETRIES,
  NotificationRecord,
  NotificationStatus,
  sanitizeErrorMessage,
} from '../domain/notification.js';
import type { EventEnvelope } from '../domain/types.js';

export interface ProcessNotificationResult {
  success: boolean;
  status: NotificationStatus;
  error?: string;
}

export interface ProcessBatchResult {
  processed: number;
  sent: number;
  failed: number;
  deadLetter: number;
}

export class ProcessNotificationsUseCase {
  constructor(
    private readonly notificationStore: INotificationStore,
    private readonly mailer: IMailerPort,
    private readonly auditPort?: IAuditPort,
    private readonly logger?: {
      info: (...args: any[]) => void;
      error: (...args: any[]) => void;
      warn: (...args: any[]) => void;
    },
  ) {}

  async processNotification(notification: NotificationRecord): Promise<ProcessNotificationResult> {
    if (notification.status === 'SENT') {
      return { success: true, status: 'SENT' };
    }
    if (notification.status === 'DEAD_LETTER') {
      return { success: false, status: 'DEAD_LETTER', error: notification.lastError ?? 'Max retries exceeded' };
    }

    try {
      const mailResult = await this.mailer.sendMail({
        to: notification.recipientEmail,
        subject: notification.subject,
        text: notification.body,
      });

      const sentAt = new Date();
      await this.notificationStore.updateNotificationStatus(notification.id, 'SENT', {
        retryCount: notification.retryCount,
        providerResponse: {
          messageId: mailResult.messageId,
          response: mailResult.response,
        },
        sentAt,
      });

      if (this.auditPort) {
        await this.auditPort.recordAudit({
          actorSub: 'system:notification-worker',
          occurredAt: sentAt,
          action: 'notification.sent',
          aggregateType: 'ticket',
          aggregateId: notification.ticketId,
          correlationId: notification.idempotencyKey,
          causationId: notification.id,
          metadata: {
            recipient: notification.recipientEmail,
            messageId: mailResult.messageId,
          },
        });
      }

      this.logger?.info?.(
        { ticketId: notification.ticketId, notificationId: notification.id },
        'Confirmation email dispatched successfully',
      );

      return { success: true, status: 'SENT' };
    } catch (rawError) {
      const sanitized = sanitizeErrorMessage(rawError);
      const nextRetryCount = notification.retryCount + 1;
      const isDeadLetter = nextRetryCount >= (notification.maxRetries || MAX_NOTIFICATION_RETRIES);
      const newStatus: NotificationStatus = isDeadLetter ? 'DEAD_LETTER' : 'FAILED';

      await this.notificationStore.updateNotificationStatus(notification.id, newStatus, {
        retryCount: nextRetryCount,
        lastError: sanitized,
      });

      if (this.auditPort) {
        await this.auditPort.recordAudit({
          actorSub: 'system:notification-worker',
          occurredAt: new Date(),
          action: isDeadLetter ? 'notification.dead_letter' : 'notification.failed',
          aggregateType: 'ticket',
          aggregateId: notification.ticketId,
          correlationId: notification.idempotencyKey,
          causationId: notification.id,
          metadata: {
            retryCount: nextRetryCount,
            error: sanitized,
          },
        });
      }

      this.logger?.error?.(
        {
          ticketId: notification.ticketId,
          notificationId: notification.id,
          retryCount: nextRetryCount,
          status: newStatus,
        },
        `Confirmation email dispatch failed: ${sanitized}`,
      );

      return { success: false, status: newStatus, error: sanitized };
    }
  }

  async processPending(limit = 10): Promise<ProcessBatchResult> {
    const pendingList = await this.notificationStore.claimPendingNotifications(limit);
    let sent = 0;
    let failed = 0;
    let deadLetter = 0;

    for (const notification of pendingList) {
      const result = await this.processNotification(notification);
      if (result.status === 'SENT') {
        sent++;
      } else if (result.status === 'DEAD_LETTER') {
        deadLetter++;
      } else {
        failed++;
      }
    }

    return {
      processed: pendingList.length,
      sent,
      failed,
      deadLetter,
    };
  }

  async handleTicketCreatedEvent(
    event: EventEnvelope<{ ticket_id: string; ticket_code?: string; customer_id?: string }>,
  ): Promise<{ processed: boolean; ignored: boolean; reason?: string }> {
    const ticketId = event.payload.ticket_id;
    const idempotencyKey = buildConfirmationEmailIdempotencyKey(ticketId);

    const existing = await this.notificationStore.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      // Idempotent no-op on event replay
      if (existing.status === 'SENT' || existing.status === 'DEAD_LETTER') {
        return { processed: false, ignored: true, reason: `ALREADY_${existing.status}` };
      }
      // If pending or failed, process it now
      await this.processNotification(existing);
      return { processed: true, ignored: false };
    }

    return { processed: false, ignored: true, reason: 'NO_OUTBOX_RECORD' };
  }
}
