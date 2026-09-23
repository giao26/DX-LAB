/**
 * DX-LAB Process Core (P) - Drizzle Database Schema
 * Defines the initial technical schema under dx_core.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import { pgSchema, uuid, varchar, integer, timestamp, jsonb, text, index, boolean } from 'drizzle-orm/pg-core';

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
  contactReviewRequired: boolean('contact_review_required').default(false).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_tickets_customer').on(table.customerId),
  index('idx_tickets_status_received').on(table.status, table.receivedAt)
]);
