/**
 * DX-LAB Process Core (P) - Health Check Route
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'p_process',
      version: '0.1.0',
      timestamp: new Date().toISOString()
    });
  });
};
