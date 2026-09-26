import { buildApp } from './adapters/http/app.js';
import { createDatabasePool } from './adapters/postgres/db.js';
import { PostgresTicketIntakeStore } from './adapters/postgres/ticket-intake-store.js';
import { PostgresNotificationStore } from './adapters/postgres/notification-store.js';
import { SmtpMailer } from './adapters/notification/smtp-mailer.js';
import { CreateTicketUseCase } from './application/create-ticket.js';
import { ProcessNotificationsUseCase } from './application/process-notifications.js';
import { runMigrations } from './adapters/postgres/migrate.js';
import type { IAuditPort } from './application/ports.js';
import { sanitizeLogData } from './domain/notification.js';
import { PostgresTicketReadStore } from './adapters/postgres/ticket-read-store.js';
import { ReadTicketsUseCase } from './application/read-tickets.js';
import { OidcIdentityVerifier } from './adapters/http/oidc-identity-verifier.js';
import { FilesystemAttachmentStorage } from './adapters/storage/filesystem-attachment-storage.js';

import { PostgresAssignmentStore } from './adapters/postgres/assignment-store.js';
import { PostgresTicketProcessingStore, backfillTicketProcessing } from './adapters/postgres/ticket-processing-store.js';
import { ProcessTicketUseCase } from './application/process-ticket.js';
import { ProcessOutboxEventsUseCase, HttpOdooEventRelay } from './application/process-outbox-events.js';

import { PostgresResourceStore } from './adapters/postgres/resource-store.js';
import { ReadResourcesUseCase } from './application/read-resources.js';

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

const pool = createDatabasePool();
const attachmentStorage = new FilesystemAttachmentStorage();
const assignmentStore = new PostgresAssignmentStore(pool);
const ticketStore = new PostgresTicketIntakeStore(pool, attachmentStorage, undefined, assignmentStore);
const ticketReadStore = new PostgresTicketReadStore(pool);
const readTickets = new ReadTicketsUseCase(ticketReadStore, ticketReadStore);
const resourceStore = new PostgresResourceStore(pool);
const readResources = new ReadResourcesUseCase(resourceStore);
const notificationStore = new PostgresNotificationStore(pool);
const mailer = new SmtpMailer();
const createTicket = new CreateTicketUseCase(ticketStore);

let workerInterval: NodeJS.Timeout | null = null;

const server = buildApp({}, {
  createTicket,
  getPublicTicketStatus: (id) => ticketStore.getPublicTicketStatus(id),
  identityVerifier: new OidcIdentityVerifier(),
  readTickets,
  processTicket: new ProcessTicketUseCase(new PostgresTicketProcessingStore(pool)),
  readResources,
  attachmentStorage,
});

const auditPort: IAuditPort = {
  async recordAudit(entry) {
    const sanitizedMetadata = entry.metadata ? sanitizeLogData(entry.metadata) : null;
    await pool.query(
      `INSERT INTO dx_core.audit_logs
         (actor_sub, occurred_at, action, aggregate_type, aggregate_id, correlation_id, causation_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.actorSub,
        entry.occurredAt,
        entry.action,
        entry.aggregateType,
        entry.aggregateId,
        entry.correlationId,
        entry.causationId,
        sanitizedMetadata ? JSON.stringify(sanitizedMetadata) : null,
      ],
    );
  },
};

const processNotifications = new ProcessNotificationsUseCase(
  notificationStore,
  mailer,
  auditPort,
  server.log,
);

const odooRelay = new HttpOdooEventRelay();
const processOutbox = new ProcessOutboxEventsUseCase(
  assignmentStore,
  odooRelay,
  auditPort,
  server.log,
);

server.addHook('onClose', async () => {
  if (workerInterval) clearInterval(workerInterval);
  await pool.end();
});

async function start() {
  try {
    await runMigrations(pool);
    await backfillTicketProcessing(pool);
    await server.listen({ port, host });
    server.log.info(`P Process core server listening on http://${host}:${port}`);

    // Start background outbox notification and event relay workers with in-flight execution guard
    let isProcessing = false;
    workerInterval = setInterval(async () => {
      if (isProcessing) return;
      isProcessing = true;
      try {
        await processNotifications.processPending(10);
        await processOutbox.processPending(10);

        // Periodically check and dispatch waiting FIFO queue tickets when capacity is available
        for (const groupId of ['complaints', 'consulting', 'warranty']) {
          await assignmentStore.assignNextQueuedTicket(groupId).catch((err) => {
            server.log.error({ err, groupId }, 'Error dispatching queued tickets');
          });
        }
      } catch (err) {
        server.log.error({ err }, 'Worker polling error');
      } finally {
        isProcessing = false;
      }
    }, 2000);
    workerInterval.unref();
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
for (const signal of signals) {
  process.on(signal, async () => {
    server.log.info(`Received ${signal}, closing server gracefully...`);
    try {
      if (workerInterval) clearInterval(workerInterval);
      await server.close();
      process.exit(0);
    } catch (err) {
      server.log.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  });
}

start();
