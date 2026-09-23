import type { FastifyPluginAsync } from 'fastify';
import {
  CreateTicketUseCase,
  IdempotencyConflictError,
  IdempotencyInProgressError,
} from '../../../application/create-ticket.js';
import { TicketValidationError } from '../../../domain/ticket.js';

export interface TicketRouteOptions {
  createTicket: CreateTicketUseCase;
}

function problem(status: number, code: string, title: string, detail: string, instance: string, errors?: unknown) {
  return { type: 'about:blank', title, status, code, detail, instance, ...(errors ? { errors } : {}) };
}

export const ticketRoutes: FastifyPluginAsync<TicketRouteOptions> = async (app, options) => {
  app.post('/api/v1/tickets', async (request, reply) => {
    const rawKey = request.headers['idempotency-key'];
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
      return reply.status(400).type('application/problem+json').send(problem(
        400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key không hợp lệ',
        'Header Idempotency-Key bắt buộc và phải là UUID hợp lệ.', request.url,
      ));
    }

    try {
      const result = await options.createTicket.execute(request.body, key);
      if (result.replayed) reply.header('Idempotency-Replayed', 'true');
      return reply
        .status(result.replayed ? 200 : 201)
        .send(result.ticket);
    } catch (error) {
      if (error instanceof TicketValidationError) {
        return reply.status(400).type('application/problem+json').send(problem(
          400, 'VALIDATION_ERROR', 'Dữ liệu chưa hợp lệ', error.message, request.url, error.fieldErrors,
        ));
      }
      if (error instanceof IdempotencyConflictError) {
        return reply.status(409).type('application/problem+json').send(problem(
          409, 'IDEMPOTENCY_CONFLICT', 'Xung đột yêu cầu', error.message, request.url,
        ));
      }
      if (error instanceof IdempotencyInProgressError) {
        return reply.status(409).header('Retry-After', '1').type('application/problem+json').send(problem(
          409, 'IDEMPOTENCY_IN_PROGRESS', 'Yêu cầu đang được xử lý', error.message, request.url,
        ));
      }
      throw error;
    }
  });
};
