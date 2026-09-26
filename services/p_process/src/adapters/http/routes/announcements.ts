/**
 * DX-LAB Process Core (P) - Announcements HTTP Routes
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import type { FastifyPluginAsync } from 'fastify';
import type { ReadAnnouncementsUseCase } from '../../../application/read-announcements.js';
import {
  type IdentityVerifier,
  AuthenticationError,
  IdentityProviderUnavailableError,
} from '../../../application/principal.js';

export interface AnnouncementsRouteOptions {
  identityVerifier: IdentityVerifier;
  readAnnouncements: ReadAnnouncementsUseCase;
}

const problem = (status: number, code: string, title: string, detail: string, instance: string) => ({
  type: 'about:blank',
  title,
  status,
  code,
  detail,
  instance,
});

export const announcementsRoutes: FastifyPluginAsync<AnnouncementsRouteOptions> = async (app, options) => {
  const authenticate = async (authorization: string | undefined) => {
    if (!options.identityVerifier || !options.readAnnouncements) {
      throw new IdentityProviderUnavailableError('Dịch vụ thông báo hoặc xác thực chưa sẵn sàng.');
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
    throw error;
  };

  app.get<{ Querystring: { groups?: string | string[] } }>('/api/v1/announcements', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    try {
      const principal = await authenticate(request.headers.authorization);

      const rawGroups = request.query.groups;
      const groupsParam = Array.isArray(rawGroups) ? rawGroups[0] : rawGroups;
      let requestedGroups: string[] = [];
      if (typeof groupsParam === 'string' && groupsParam.trim()) {
        requestedGroups = groupsParam.split(',').map((g) => g.trim()).filter(Boolean);
      }

      // Filter requested groups against principal.groupIds, or use principal.groupIds directly
      const permittedGroups = requestedGroups.length > 0
        ? requestedGroups.filter((g) => principal.groupIds.includes(g))
        : principal.groupIds;

      const result = await options.readAnnouncements.execute(permittedGroups);
      return reply.send(result);
    } catch (error) {
      return handleRouteError(reply, error, request.url);
    }
  });
};
