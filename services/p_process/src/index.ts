/**
 * DX-LAB Process Core (P) - Server Entrypoint
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import { buildApp } from './adapters/http/app.js';
import { createDatabasePool } from './adapters/postgres/db.js';
import { PostgresTicketIntakeStore } from './adapters/postgres/ticket-intake-store.js';
import { CreateTicketUseCase } from './application/create-ticket.js';
import { runMigrations } from './adapters/postgres/migrate.js';
import { PrivateFilesystemStorage } from './adapters/storage/private-filesystem-storage.js';

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

const pool = createDatabasePool();
const createTicket = new CreateTicketUseCase(new PostgresTicketIntakeStore(pool));
const server = buildApp({}, { createTicket, storage: new PrivateFilesystemStorage() });
server.addHook('onClose', async () => pool.end());

async function start() {
  try {
    await runMigrations(pool);
    await server.listen({ port, host });
    server.log.info(`P Process core server listening on http://${host}:${port}`);
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
      await server.close();
      process.exit(0);
    } catch (err) {
      server.log.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  });
}

start();
