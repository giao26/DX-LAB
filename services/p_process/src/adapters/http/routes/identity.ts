import type { FastifyPluginAsync } from 'fastify';
import type { IdentityVerifier } from '../../../application/principal.js';

export const identityRoutes: FastifyPluginAsync<{ identityVerifier: IdentityVerifier }> = async (app, options) => {
  app.get('/api/v1/identity', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const principal = await options.identityVerifier.verify(request.headers.authorization, 'portal:read');
    return { sub: principal.sub, roles: principal.roles, groups: principal.groupIds };
  });
};
