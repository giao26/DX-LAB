/**
 * DX-LAB Process Core (P) - Notification Domain
 * Defines notification status, confirmation email templates, idempotency keys, and log sanitization.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

export type NotificationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'DEAD_LETTER';

export const MAX_NOTIFICATION_RETRIES = 3;

export interface NotificationRecord {
  id: string;
  idempotencyKey: string;
  ticketId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: NotificationStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string | null;
  providerResponse?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  sentAt?: string | null;
}

export interface NotificationCreateInput {
  ticketId: string;
  ticketCode: string;
  customerEmail: string;
  customerName?: string;
  receivedAt: string;
}

/**
 * Builds the unique idempotency key for ticket creation confirmation email.
 * Ensures strict exactly-once intent creation and zero duplicates on replay.
 */
export function buildConfirmationEmailIdempotencyKey(ticketId: string): string {
  return `email:ticket-created:${ticketId}`;
}

export interface ConfirmationEmailTemplate {
  subject: string;
  body: string;
}

/**
 * Generates the standardized confirmation email content.
 * Must include: ticket code, received timestamp, and explicit statement that request is in "Chờ xử lý" status.
 */
export function buildConfirmationEmail(params: {
  ticketCode: string;
  receivedAt: string;
  customerName?: string;
}): ConfirmationEmailTemplate {
  const subject = `[DX-LAB] Xác nhận tiếp nhận yêu cầu hỗ trợ #${params.ticketCode}`;
  const greeting = params.customerName ? `Xin chào ${params.customerName},` : 'Xin chào Quý khách,';
  const body = [
    greeting,
    '',
    'Hệ thống DX-LAB đã tiếp nhận yêu cầu hỗ trợ của Quý khách.',
    `Mã ticket: ${params.ticketCode}`,
    `Thời điểm tiếp nhận: ${params.receivedAt}`,
    `Trạng thái hiện tại: Chờ xử lý`,
    '',
    'Yêu cầu của bạn đang ở trạng thái "Chờ xử lý" và sẽ được nhân viên chuyên trách phản hồi theo cam kết dịch vụ (SLA).',
    '',
    'Trân trọng,',
    'Bộ phận Hỗ trợ Khách hàng DX-LAB',
  ].join('\n');

  return { subject, body };
}

/**
 * Sanitizes technical error messages to prevent leakage of credentials, tokens, PII, or customer descriptions.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';
  let message = typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error));

  // Redact passwords and credentials
  message = message.replace(/(password|passwd|pass|pwd|secret|auth)[=:\s]+[^\s,;&]+/gi, '$1=[REDACTED]');
  message = message.replace(/(AUTH\s+(PLAIN|LOGIN)\s+)[A-Za-z0-9+/=]+/gi, '$1[REDACTED]');
  message = message.replace(/\b(bearer\s+)[A-Za-z0-9._~+/-]+/gi, '$1[REDACTED]');
  message = message.replace(/\bsk-[A-Za-z0-9_-]{16,}\b/gi, '[REDACTED_KEY]');
  message = message.replace(/data:[^;]+;base64,[A-Za-z0-9+/=]+/gi, '[REDACTED_ATTACHMENT]');

  // Redact customer descriptions or arbitrary quoted input text if reflected in error
  message = message.replace(/description[=:\s]+".*?"/gi, 'description="[REDACTED]"');

  if (message.length > 500) {
    message = message.slice(0, 500) + '...';
  }
  return message;
}

/**
 * Sanitizes log or audit payload metadata, removing passwords, customer descriptions, and tokens.
 */
export function sanitizeLogData<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = new Set([
    'password', 'passwd', 'pass', 'pwd', 'secret', 'token', 'auth',
    'description', 'attachment', 'content', 'apikey', 'api_key', 'credentials'
  ]);

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeLogData(value as Record<string, unknown>);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeErrorMessage(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
