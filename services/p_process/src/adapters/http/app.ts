/**
 * DX-LAB Process Core (P) - Fastify Application Factory
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import Fastify, { FastifyError, FastifyInstance, FastifyServerOptions } from 'fastify';
import multipart from '@fastify/multipart';
import { healthRoutes } from './routes/health.js';
import { ticketRoutes } from './routes/tickets.js';
import type { CreateTicketUseCase } from '../../application/create-ticket.js';
import type { PrivateFilesystemStorage } from '../storage/private-filesystem-storage.js';

export interface AppDependencies {
  createTicket?: CreateTicketUseCase;
  storage?: PrivateFilesystemStorage;
}

export function buildApp(opts: FastifyServerOptions = {}, dependencies: AppDependencies = {}): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
            hostname: req.hostname,
            remoteAddress: req.ip
          };
        }
      }
    },
    ...opts
  });

  app.register(multipart, {
    limits: { files: 1, fileSize: 10 * 1024 * 1024, fields: 5, parts: 6 },
  });

  // Register routes
  app.register(healthRoutes);
  if (dependencies.createTicket) {
    app.register(ticketRoutes, { createTicket: dependencies.createTicket, storage: dependencies.storage });
  }

  // RFC 9457 Problem Details error handler
  app.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    app.log.error({
      err: error,
      name: error.name,
      code: 'code' in error ? error.code : undefined,
      statusCode: 'statusCode' in error ? error.statusCode : undefined,
    }, 'Request failed');
    const statusCode = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    return reply
      .status(statusCode)
      .type('application/problem+json')
      .send({
        type: 'about:blank',
        title: error.name || 'Internal Server Error',
        status: statusCode,
        detail: statusCode >= 500 ? 'Đã xảy ra lỗi nội bộ.' : (error.message || 'An unexpected error occurred'),
        instance: _request.url
      });
  });

  // RFC 9457 Problem Details 404 handler
  app.setNotFoundHandler((request, reply) => {
    return reply
      .status(404)
      .type('application/problem+json')
      .send({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: `Route ${request.method} ${request.url} not found`,
        instance: request.url
      });
  });

  return app;
}
