/**
 * DX-LAB Process Core (P) - Server Entrypoint
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import { buildApp } from './adapters/http/app.js';

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

const server = buildApp();

async function start() {
  try {
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
