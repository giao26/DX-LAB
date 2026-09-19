/**
 * DX-LAB Process Core (P) - Fastify Application Factory
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import Fastify, { FastifyError, FastifyInstance, FastifyServerOptions } from 'fastify';
import { healthRoutes } from './routes/health.js';

export function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
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

  // Register routes
  app.register(healthRoutes);

  // RFC 9457 Problem Details error handler
  app.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    app.log.error(error);
    const statusCode = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    return reply
      .status(statusCode)
      .type('application/problem+json')
      .send({
        type: 'about:blank',
        title: error.name || 'Internal Server Error',
        status: statusCode,
        detail: error.message || 'An unexpected error occurred',
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
