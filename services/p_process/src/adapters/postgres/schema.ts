/**
 * DX-LAB Process Core (P) - Drizzle Database Schema
 * Defines the initial technical schema under dx_core.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import { pgSchema, uuid, varchar, integer, timestamp, jsonb, text, index, boolean, date, unique } from 'drizzle-orm/pg-core';

export const dxCoreSchema = pgSchema('dx_core');

/**
 * Immutable Audit Logs Table (AD-12)
 */
export const auditLogs = dxCoreSchema.table('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorSub: varchar('actor_sub', { length: 255 }).notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),
  aggregateId: varchar('aggregate_id', { length: 255 }).notNull(),
  correlationId: varchar('correlation_id', { length: 255 }).notNull(),
  causationId: varchar('causation_id', { length: 255 }).notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_audit_logs_occurred_at').on(table.occurredAt),
  index('idx_audit_logs_aggregate').on(table.aggregateType, table.aggregateId)
]);

/**
 * Transactional Outbox Events Table (AD-3, AD-21)
 */
export const outboxEvents = dxCoreSchema.table('outbox_events', {
  eventId: uuid('event_id').defaultRandom().primaryKey(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  aggregateId: varchar('aggregate_id', { length: 255 }).notNull(),
  aggregateVersion: integer('aggregate_version').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  actorSub: varchar('actor_sub', { length: 255 }).notNull(),
  correlationId: varchar('correlation_id', { length: 255 }).notNull(),
  causationId: varchar('causation_id', { length: 255 }).notNull(),
  payload: jsonb('payload').notNull(),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  lastAttemptedAt: timestamp('last_attempted_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_outbox_events_status').on(table.status, table.createdAt),
  index('idx_outbox_events_aggregate').on(table.aggregateId, table.aggregateVersion)
]);

/**
 * Idempotency Keys Table (AD-3)
 */
export const idempotencyKeys = dxCoreSchema.table('idempotency_keys', {
  key: varchar('key', { length: 255 }).primaryKey(),
  targetEndpoint: varchar('target_endpoint', { length: 255 }).notNull(),
  requestHash: varchar('request_hash', { length: 64 }),
  responseStatus: integer('response_status'),
  responseHeaders: jsonb('response_headers'),
  responseBody: jsonb('response_body'),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
}, (table) => [
  index('idx_idempotency_keys_expires_at').on(table.expiresAt)
]);

export const customers = dxCoreSchema.table('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  phoneNormalized: varchar('phone_normalized', { length: 20 }).notNull().unique(),
  fullName: varchar('full_name', { length: 120 }).notNull(),
  email: varchar('email', { length: 254 }).notNull(),
  contactReviewRequired: boolean('contact_review_required').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const tickets = dxCoreSchema.table('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  description: text('description').notNull(),
  status: varchar('status', { length: 20 }).default('WAITING').notNull(),
  provisionalType: varchar('provisional_type', { length: 30 }).notNull(),
  groupId: varchar('group_id', { length: 100 }),
  assignedSub: varchar('assigned_sub', { length: 255 }),
  version: integer('version').default(1).notNull(),
  workflowSnapshot: jsonb('workflow_snapshot'),
  calendarSnapshot: jsonb('calendar_snapshot'),
  processingSteps: jsonb('processing_steps').default([]).notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  processingResult: text('processing_result'),
  slaDueAt: timestamp('sla_due_at', { withTimezone: true }),
  slaOverdue: boolean('sla_overdue').default(false).notNull(),
  contactReviewRequired: boolean('contact_review_required').default(false).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_tickets_customer').on(table.customerId),
  index('idx_tickets_status_received').on(table.status, table.receivedAt)
]);

export const notifications = dxCoreSchema.table('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id),
  recipientEmail: varchar('recipient_email', { length: 254 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  body: text('body').notNull(),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  lastError: text('last_error'),
  providerResponse: jsonb('provider_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true })
}, (table) => [
  index('idx_notifications_ticket_id').on(table.ticketId),
  index('idx_notifications_status').on(table.status, table.createdAt)
]);

export const ticketAttachments = dxCoreSchema.table('ticket_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id').notNull().unique().references(() => tickets.id, { onDelete: 'cascade' }),
  storageKey: uuid('storage_key').notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  detectedMime: varchar('detected_mime', { length: 100 }).notNull(),
  checksumSha256: varchar('checksum_sha256', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_ticket_attachments_ticket_id').on(table.ticketId),
]);

export const staffRoster = dxCoreSchema.table('staff_roster', {
  sub: varchar('sub', { length: 255 }).primaryKey(),
  groupId: varchar('group_id', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  officialAssignmentCount: integer('official_assignment_count').default(0).notNull(),
  lastAssignedAt: timestamp('last_assigned_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_staff_roster_group_active').on(
    table.groupId,
    table.isActive,
    table.officialAssignmentCount,
    table.lastAssignedAt,
    table.sub,
  ),
]);

export const resources = dxCoreSchema.table('resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  version: varchar('version', { length: 20 }).default('1.0.0').notNull(),
  effectiveDate: date('effective_date').defaultNow().notNull(),
  approverName: varchar('approver_name', { length: 120 }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  summary: text('summary').default('').notNull(),
  content: text('content').default('').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_resources_status_effective').on(table.status, table.effectiveDate),
  index('idx_resources_type_status').on(table.type, table.status),
  unique('uq_resources_code_version').on(table.code, table.version),
]);


export const announcements = dxCoreSchema.table('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  body: text('body').default('').notNull(),
  scope: varchar('scope', { length: 20 }).notNull(),
  targetGroup: varchar('target_group', { length: 100 }),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_announcements_scope').on(table.scope),
  index('idx_announcements_target_group').on(table.targetGroup),
]);
