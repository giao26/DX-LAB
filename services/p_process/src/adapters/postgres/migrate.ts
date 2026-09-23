import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type pg from 'pg';

export async function runMigrations(pool: pg.Pool, migrationsDirectory = process.env.MIGRATIONS_DIR
  ?? join(process.cwd(), 'src', 'adapters', 'postgres', 'migrations')): Promise<void> {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS dx_core;
    CREATE TABLE IF NOT EXISTS dx_core.schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
  const files = (await readdir(migrationsDirectory)).filter((name) => name.endsWith('.sql')).sort();
  for (const name of files) {
    const alreadyApplied = await pool.query(
      'SELECT 1 FROM dx_core.schema_migrations WHERE name = $1', [name],
    );
    if (alreadyApplied.rowCount) continue;
    const sql = await readFile(join(migrationsDirectory, name), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO dx_core.schema_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
