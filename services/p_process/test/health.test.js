/**
 * Fastify /health Endpoint Test
 * Uses Node.js native test runner (node:test) and Fastify injection
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../dist/adapters/http/app.js';

test('GET /health returns 200 and service metadata', async (t) => {
  const app = buildApp({ logger: false });
  t.after(() => app.close());

  const response = await app.inject({
    method: 'GET',
    url: '/health'
  });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'p_process');
  assert.equal(body.version, '0.1.0');
  assert.ok(body.timestamp);
});

test('GET /unknown-route returns 404 RFC 9457 Problem Details', async (t) => {
  const app = buildApp({ logger: false });
  t.after(() => app.close());

  const response = await app.inject({
    method: 'GET',
    url: '/non-existent-route'
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.headers['content-type'], 'application/problem+json; charset=utf-8');
  const body = JSON.parse(response.body);
  assert.equal(body.title, 'Not Found');
  assert.equal(body.status, 404);
  assert.equal(body.instance, '/non-existent-route');
});
