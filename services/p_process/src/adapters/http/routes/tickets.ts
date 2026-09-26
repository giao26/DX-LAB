import type { FastifyPluginAsync } from 'fastify';
import { createHash, timingSafeEqual } from 'node:crypto';
import { CreateTicketUseCase, IdempotencyConflictError, IdempotencyInProgressError } from '../../../application/create-ticket.js';
import { AuthenticationError, IdentityProviderUnavailableError, type IdentityVerifier } from '../../../application/principal.js';
import type { ReadTicketsUseCase } from '../../../application/read-tickets.js';
import type { ProcessTicketUseCase } from '../../../application/process-ticket.js';
import { TicketValidationError, type TicketRecord } from '../../../domain/ticket.js';
import type { AttachmentStorage } from '../../storage/filesystem-attachment-storage.js';

export interface TicketRouteOptions {
  createTicket: CreateTicketUseCase;
  getTicketById?: (id: string) => Promise<TicketRecord | null>;
  getPublicTicketStatus?: (id: string) => Promise<Pick<TicketRecord, 'id' | 'code' | 'status' | 'confirmationEmailStatus'> | null>;
  identityVerifier?: IdentityVerifier;
  readTickets?: ReadTicketsUseCase;
  processTicket?: ProcessTicketUseCase;
  attachmentStorage?: AttachmentStorage;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const problem = (status: number, code: string, title: string, detail: string, instance: string, errors?: unknown) =>
  ({ type: 'about:blank', title, status, code, detail, instance, ...(errors ? { errors } : {}) });
const notFound = (instance: string) => problem(404, 'TICKET_NOT_FOUND', 'Không tìm thấy tài nguyên', 'Tài nguyên không tồn tại hoặc bạn không có quyền truy cập.', instance);

export const ticketRoutes: FastifyPluginAsync<TicketRouteOptions> = async (app, options) => {
  app.post('/api/v1/tickets', async (request, reply) => {
    const rawKey = request.headers['idempotency-key'];
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    if (!key || !UUID.test(key)) return reply.status(400).type('application/problem+json').send(problem(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key không hợp lệ', 'Header Idempotency-Key bắt buộc và phải là UUID hợp lệ.', request.url));
    try {
      const result = await options.createTicket.execute(request.body, key);
      if (result.replayed) reply.header('Idempotency-Replayed', 'true');
      return reply.status(result.replayed ? 200 : 201).send(result.ticket);
    } catch (error) {
      if (error instanceof TicketValidationError) return reply.status(400).type('application/problem+json').send(problem(400, 'VALIDATION_ERROR', 'Dữ liệu chưa hợp lệ', error.message, request.url, error.fieldErrors));
      if (error instanceof IdempotencyConflictError) return reply.status(409).type('application/problem+json').send(problem(409, 'IDEMPOTENCY_CONFLICT', 'Xung đột yêu cầu', error.message, request.url));
      if (error instanceof IdempotencyInProgressError) return reply.status(409).header('Retry-After', '1').type('application/problem+json').send(problem(409, 'IDEMPOTENCY_IN_PROGRESS', 'Yêu cầu đang được xử lý', error.message, request.url));
      throw error;
    }
  });

  app.get<{ Params: { ticketId: string } }>('/api/v1/public/tickets/:ticketId/status', async (request, reply) => {
    if (!UUID.test(request.params.ticketId)) return reply.status(404).type('application/problem+json').send(notFound(request.url));
    const getter = options.getPublicTicketStatus ?? ((id: string) => options.createTicket.getPublicTicketStatus(id));
    const ticket = await getter(request.params.ticketId);
    if (!ticket) return reply.status(404).type('application/problem+json').send(notFound(request.url));
    return reply.header('Cache-Control', 'no-store').send({
      id: ticket.id,
      code: ticket.code,
      status: ticket.status,
      confirmationEmailStatus: ticket.confirmationEmailStatus,
    });
  });

  const authenticate = async (authorization: string | undefined, scope: string) => {
    if (!options.identityVerifier || !options.readTickets) throw new IdentityProviderUnavailableError('Dịch vụ xác thực chưa sẵn sàng.');
    return options.identityVerifier.verify(authorization, scope);
  };
  const denied = (error: AuthenticationError, url: string) => problem(error.statusCode, 'ACCESS_DENIED', 'Truy cập bị từ chối', error.message, url);
  const unavailable = (error: IdentityProviderUnavailableError, url: string) => problem(503, 'IDENTITY_PROVIDER_UNAVAILABLE', 'Dịch vụ xác thực tạm thời không khả dụng', error.message, url);
  const sendAuthError = (reply: any, error: unknown, url: string) => {
    if (error instanceof AuthenticationError) {
      if (error.statusCode === 401) reply.header('WWW-Authenticate', 'Bearer');
      return reply.status(error.statusCode).type('application/problem+json').send(denied(error, url));
    }
    if (error instanceof IdentityProviderUnavailableError) {
      return reply.status(503).type('application/problem+json').send(unavailable(error, url));
    }
    throw error;
  };

  const parsePageNumber = (value: string | undefined, fallback: number, maximum?: number) => {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || (maximum !== undefined && parsed > maximum)) return null;
    return parsed;
  };

  app.post<{ Params: { ticketId: string } }>('/api/v1/tickets/:ticketId/process', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const principal = await authenticate(request.headers.authorization, 'tickets:write');
      if (!UUID.test(request.params.ticketId)) return reply.status(404).send(notFound(request.url));
      if (!options.processTicket) throw new IdentityProviderUnavailableError('Dịch vụ xử lý chưa sẵn sàng.');
      const raw = request.headers['idempotency-key'];
      const result = await options.processTicket.execute(principal, request.params.ticketId, request.body, Array.isArray(raw) ? raw[0] : raw, request.id);
      if (result.replayed) reply.header('Idempotency-Replayed', 'true');
      return reply.send(result.ticket);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof IdentityProviderUnavailableError) return sendAuthError(reply, error, request.url);
      throw error;
    }
  });

  app.get<{ Querystring: { status?: string; limit?: string; offset?: string } }>('/api/v1/tickets', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const principal = await authenticate(request.headers.authorization, 'tickets:read');
      if (request.query.status !== undefined && !['WAITING', 'IN_PROGRESS', 'CLOSED'].includes(request.query.status)) return reply.status(400).type('application/problem+json').send(problem(400, 'INVALID_QUERY', 'Bộ lọc không hợp lệ', 'Trạng thái không hợp lệ.', request.url));
      const limit = parsePageNumber(request.query.limit, 20, 100);
      const offset = parsePageNumber(request.query.offset, 0);
      if (limit === null || limit === 0 || offset === null) return reply.status(400).type('application/problem+json').send(problem(400, 'INVALID_QUERY', 'Bộ lọc không hợp lệ', 'Phân trang không hợp lệ.', request.url));
      const result = await options.readTickets!.list(principal, {
        status: request.query.status,
        limit,
        offset,
      }, request.id);
      return reply.send(result);
    } catch (error) {
      return sendAuthError(reply, error, request.url);
    }
  });

  app.get<{ Params: { ticketId: string } }>('/api/v1/tickets/:ticketId', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const principal = await authenticate(request.headers.authorization, 'tickets:read');
      if (!UUID.test(request.params.ticketId)) return reply.status(404).type('application/problem+json').send(notFound(request.url));
      const ticket = await options.readTickets!.detail(principal, request.params.ticketId, request.id);
      if (!ticket) return reply.status(404).type('application/problem+json').send(notFound(request.url));
      return reply.send(ticket);
    } catch (error) {
      return sendAuthError(reply, error, request.url);
    }
  });

  app.get<{ Params: { attachmentId: string } }>('/api/v1/attachments/:attachmentId/download', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const principal = await authenticate(request.headers.authorization, 'tickets:download');
      if (!UUID.test(request.params.attachmentId)) return reply.status(404).type('application/problem+json').send(notFound(request.url));
      const attachment = await options.readTickets!.attachment(principal, request.params.attachmentId);
      if (!attachment || !options.attachmentStorage) return reply.status(404).type('application/problem+json').send(notFound(request.url));
      const content = await options.attachmentStorage.read(attachment.storageKey);
      const actualChecksum = createHash('sha256').update(content).digest();
      const expectedChecksum = Buffer.from(attachment.checksumSha256, 'hex');
      if (content.byteLength !== attachment.sizeBytes || expectedChecksum.byteLength !== actualChecksum.byteLength
        || !timingSafeEqual(actualChecksum, expectedChecksum)) {
        app.log.error({ attachmentId: attachment.id }, 'Attachment integrity verification failed');
        return reply.status(404).type('application/problem+json').send(notFound(request.url));
      }
      await options.readTickets!.auditAttachmentDownload(principal, attachment.id, request.id);
      const asciiName = attachment.displayName.replace(/["\\]/g, '').replace(/[^\x20-\x7E]/g, '_');
      return reply.header('Content-Type', attachment.detectedMime)
        .header('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(attachment.displayName)}`)
        .header('X-Content-Type-Options', 'nosniff').send(content);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof IdentityProviderUnavailableError) return sendAuthError(reply, error, request.url);
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return reply.status(404).type('application/problem+json').send(notFound(request.url));
      throw error;
    }
  });
};
