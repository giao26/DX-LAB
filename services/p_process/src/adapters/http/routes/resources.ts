/**
 * DX-LAB Process Core (P) - Resources HTTP Routes
 * Exposes endpoints for SOP/FAQ knowledge lookup and AI retrieval.
 * Protected by Keycloak OIDC with portal:read scope.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import type { FastifyPluginAsync } from 'fastify';
import { AuthenticationError, IdentityProviderUnavailableError, type IdentityVerifier } from '../../../application/principal.js';
import type { ReadResourcesUseCase } from '../../../application/read-resources.js';
import { ResourceNotFoundError, ResourceValidationError } from '../../../domain/resource.js';

export interface ResourcesRouteOptions {
  readResources: ReadResourcesUseCase;
  identityVerifier: IdentityVerifier;
}

const problem = (status: number, code: string, title: string, detail: string, instance: string, errors?: unknown) => ({
  type: 'about:blank',
  title,
  status,
  code,
  detail,
  instance,
  ...(errors ? { errors } : {}),
});

export const resourcesRoutes: FastifyPluginAsync<ResourcesRouteOptions> = async (app, options) => {
  const authenticate = async (authorization: string | undefined) => {
    if (!options.identityVerifier || !options.readResources) {
      throw new IdentityProviderUnavailableError('Dịch vụ tri thức hoặc xác thực chưa sẵn sàng.');
    }
    return options.identityVerifier.verify(authorization, 'portal:read');
  };

  const handleRouteError = (reply: any, error: unknown, url: string) => {
    if (error instanceof AuthenticationError) {
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
        .send(problem(503, 'IDENTITY_PROVIDER_UNAVAILABLE', 'Dịch vụ xác thực tạm thời không khả dụng', error.message, url));
    }
    if (error instanceof ResourceNotFoundError) {
      return reply
        .status(404)
        .type('application/problem+json')
        .send(problem(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy tài nguyên', error.message, url));
    }
    if (error instanceof ResourceValidationError) {
      return reply
        .status(400)
        .type('application/problem+json')
        .send(problem(400, 'VALIDATION_ERROR', 'Tham số không hợp lệ', error.message, url, error.fieldErrors));
    }
    throw error;
  };

  const parseString = (val: unknown): string | undefined => {
    if (typeof val === 'string') return val;
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') return val[0];
    return undefined;
  };

  const parseNumber = (val: unknown, fallback: number, min: number, max: number): number | null => {
    const str = parseString(val);
    if (str === undefined) return fallback;
    if (!/^\d+$/.test(str)) return null;
    const n = Number(str);
    if (!Number.isSafeInteger(n) || n < min || n > max) return null;
    return n;
  };

  // AI retrieval endpoint (declared before /:id)
  app.get<{ Querystring: { query?: string | string[]; limit?: string | string[] } }>('/api/v1/resources/ai/retrieve', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const principal = await authenticate(request.headers.authorization);
      const query = parseString(request.query.query);
      if (!query || !query.trim()) {
        return reply
          .status(400)
          .type('application/problem+json')
          .send(problem(400, 'VALIDATION_ERROR', 'Tham số không hợp lệ', 'Tham số query bắt buộc và không được để trống.', request.url));
      }
      const limit = parseNumber(request.query.limit, 5, 1, 20);
      if (limit === null) {
        return reply
          .status(400)
          .type('application/problem+json')
          .send(problem(400, 'VALIDATION_ERROR', 'Tham số không hợp lệ', 'Tham số limit không hợp lệ (1-20).', request.url));
      }
      const result = await options.readResources.retrieveForAi(principal, query, limit);
      return reply.send(result);
    } catch (error) {
      return handleRouteError(reply, error, request.url);
    }
  });

  // List resources with filtering and search
  app.get<{ Querystring: { type?: string | string[]; search?: string | string[]; limit?: string | string[]; offset?: string | string[] } }>('/api/v1/resources', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const principal = await authenticate(request.headers.authorization);
      const type = parseString(request.query.type);
      const search = parseString(request.query.search);

      const limit = parseNumber(request.query.limit, 20, 1, 100);
      const offset = parseNumber(request.query.offset, 0, 0, 10000);
      if (limit === null || offset === null) {
        return reply
          .status(400)
          .type('application/problem+json')
          .send(problem(400, 'VALIDATION_ERROR', 'Tham số không hợp lệ', 'Phân trang limit hoặc offset không hợp lệ.', request.url));
      }

      const result = await options.readResources.list(principal, {
        type,
        search,
        limit,
        offset,
      });
      return reply.send(result);
    } catch (error) {
      return handleRouteError(reply, error, request.url);
    }
  });

  // Resource detail by ID or code
  app.get<{ Params: { id: string } }>('/api/v1/resources/:id', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const principal = await authenticate(request.headers.authorization);
      const result = await options.readResources.detail(principal, request.params.id);
      return reply.send(result);
    } catch (error) {
      return handleRouteError(reply, error, request.url);
    }
  });
};
