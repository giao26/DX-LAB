/**
 * DX-LAB Process Core (P) - PostgreSQL Adapter & Database Client
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const { Pool } = pg;

export interface DatabaseConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  maxConnections?: number;
}

export function createDatabasePool(config?: DatabaseConfig): pg.Pool {
  return new Pool({
    host: config?.host || process.env.POSTGRES_HOST || 'localhost',
    port: config?.port || Number(process.env.POSTGRES_PORT) || 5432,
    user: config?.user || process.env.POSTGRES_USER || 'dxlab_admin',
    password: config?.password || process.env.POSTGRES_PASSWORD || '',
    database: config?.database || process.env.POSTGRES_DB || 'dxlab_db',
    max: config?.maxConnections || 10
  });
}

export function createDrizzleClient(pool: pg.Pool) {
  return drizzle(pool, { schema });
}
