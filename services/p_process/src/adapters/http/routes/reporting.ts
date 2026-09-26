/**
 * DX-LAB Process Core (P) - Reporting HTTP Routes
 * Exposes /api/v1/reporting/metrics, /api/v1/reporting/grants, and /api/v1/tickets/:ticketId/csat.
 * Protected by Keycloak OIDC with deny-by-default scope enforcement.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import type { FastifyPluginAsync } from 'fastify';
import {
  AuthenticationError,
  IdentityProviderUnavailableError,
  type IdentityVerifier,
} from '../../../application/principal.js';
import type { ReadReportingUseCase } from '../../../application/read-reporting.js';
import {
  ReportingAccessError,
  ReportingValidationError,
} from '../../../domain/reporting.js';
import { CsatError } from '../../postgres/reporting-store.js';

export interface ReportingRouteOptions {
  readReporting: ReadReportingUseCase;
  identityVerifier: IdentityVerifier;
}

const problem = (
  status: number,
  code: string,
  title: string,
  detail: string,
  instance: string,
  errors?: unknown,
) => ({
  type: 'about:blank',
  title,
  status,
  code,
  detail,
  instance,
  ...(errors ? { errors } : {}),
});

export const reportingRoutes: FastifyPluginAsync<ReportingRouteOptions> = async (app, options) => {
  const authenticate = async (authorization: string | undefined) => {
    if (!options.identityVerifier || !options.readReporting) {
      throw new IdentityProviderUnavailableError('Dịch vụ báo cáo hoặc xác thực chưa sẵn sàng.');
    }
    try {
      return await options.identityVerifier.verify(authorization, 'reporting:read');
    } catch (err) {
      if (err instanceof AuthenticationError && err.statusCode === 403 && err.message.includes('scope')) {
        return await options.identityVerifier.verify(authorization, 'tickets:read');
      }
      throw err;
    }
  };

  const handleRouteError = (reply: any, error: unknown, url: string) => {
    if (error instanceof AuthenticationError) {
      if (error.statusCode === 401) reply.header('WWW-Authenticate', 'Bearer');
      return reply
        .status(error.statusCode)
        .type('application/problem+json')
        .send(problem(error.statusCode, 'ACCESS_DENIED', 'Truy cập bị từ chối', error.message, url));
    }
    if (error instanceof ReportingAccessError) {
      if (error.statusCode === 401) reply.header('WWW-Authenticate', 'Bearer');
      return reply
        .status(error.statusCode)
        .type('application/problem+json')
        .send(problem(error.statusCode, 'ACCESS_DENIED', 'Truy cập bị từ chối', error.message, url));
    }
    if (error instanceof IdentityProviderUnavailableError) {
      return reply
        .status(503)
        .type('application/problem+json')
        .send(
          problem(
            503,
            'IDENTITY_PROVIDER_UNAVAILABLE',
            'Dịch vụ xác thực tạm thời không khả dụng',
            error.message,
            url,
          ),
        );
    }
    if (error instanceof ReportingValidationError) {
      return reply
        .status(400)
        .type('application/problem+json')
        .send(
          problem(400, 'VALIDATION_ERROR', 'Tham số không hợp lệ', error.message, url, error.fieldErrors),
        );
    }
    if (error instanceof CsatError) {
      return reply
        .status(error.statusCode)
        .type('application/problem+json')
        .send(problem(error.statusCode, error.code, 'Lỗi xử lý CSAT', error.message, url));
    }
    throw error;
  };

  // GET /api/v1/reporting/metrics
  app.get<{ Querystring: { from?: string; to?: string; group_id?: string } }>(
    '/api/v1/reporting/metrics',
    async (request, reply) => {
      reply.header('Cache-Control', 'private, no-store');
      try {
        const principal = await authenticate(request.headers.authorization);
        const result = await options.readReporting.getMetrics(
          principal,
          {
            from: request.query.from,
            to: request.query.to,
            groupId: request.query.group_id,
          },
          request.id,
        );
        return reply.send(result);
      } catch (error) {
        return handleRouteError(reply, error, request.url);
      }
    },
  );

  // POST /api/v1/reporting/grants
  app.post<{ Body?: { groups?: string[] } }>(
    '/api/v1/reporting/grants',
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      try {
        const principal = await authenticate(request.headers.authorization);
        const result = await options.readReporting.issueGrant(
          principal,
          request.body,
          request.id,
        );
        return reply.status(201).send(result);
      } catch (error) {
        return handleRouteError(reply, error, request.url);
      }
    },
  );

  // POST /api/v1/tickets/:ticketId/csat
  app.post<{ Params: { ticketId: string }; Body: unknown }>(
    '/api/v1/tickets/:ticketId/csat',
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      try {
        const result = await options.readReporting.submitCsat(
          request.params.ticketId,
          request.body,
        );
        return reply.status(201).send(result);
      } catch (error) {
        return handleRouteError(reply, error, request.url);
      }
    },
  );
};
