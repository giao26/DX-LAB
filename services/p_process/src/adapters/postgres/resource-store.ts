/**
 * DX-LAB Process Core (P) - Postgres Resource Store Adapter
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import type pg from 'pg';
import type { ResourceRecord, ResourceType } from '../../domain/resource.js';

export interface ListResourcesOptions {
  type?: ResourceType;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface IResourceStore {
  listPublished(options?: ListResourcesOptions): Promise<{ items: ResourceRecord[]; total: number }>;
  getPublishedById(idOrCode: string): Promise<ResourceRecord | null>;
  searchAiResources(query: string, limit?: number): Promise<ResourceRecord[]>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDateField(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(val).slice(0, 10);
}

function mapResourceRow(row: Record<string, any>): ResourceRecord {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    title: row.title,
    status: row.status,
    version: row.version,
    effectiveDate: formatDateField(row.effective_date),
    approverName: row.approver_name,
    publishedAt: row.published_at,
    summary: row.summary || '',
    content: row.content || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresResourceStore implements IResourceStore {
  constructor(private readonly pool: pg.Pool) {}

  async listPublished(options: ListResourcesOptions = {}): Promise<{ items: ResourceRecord[]; total: number }> {
    const conditions: string[] = ["status = 'published'", "effective_date <= CURRENT_DATE"];
    const params: any[] = [];
    let paramIndex = 1;

    if (options.type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(options.type);
    }

    if (options.search && options.search.trim()) {
      const searchTerm = `%${options.search.trim()}%`;
      conditions.push(`(title ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR summary ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`);
      params.push(searchTerm);
      paramIndex++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) AS total FROM dx_core.resources ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const limit = options.limit !== undefined ? Math.max(1, Math.min(100, options.limit)) : 20;
    const offset = options.offset !== undefined ? Math.max(0, options.offset) : 0;

    const listQuery = `
      SELECT id, code, type, title, status, version, effective_date, approver_name, published_at, summary, content, created_at, updated_at
        FROM dx_core.resources
        ${whereClause}
       ORDER BY effective_date DESC, code ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    const listParams = [...params, limit, offset];
    const listResult = await this.pool.query(listQuery, listParams);

    return {
      items: listResult.rows.map(mapResourceRow),
      total,
    };
  }

  async getPublishedById(idOrCode: string): Promise<ResourceRecord | null> {
    const isUuid = UUID_REGEX.test(idOrCode);
    const query = isUuid
      ? `SELECT id, code, type, title, status, version, effective_date, approver_name, published_at, summary, content, created_at, updated_at
           FROM dx_core.resources
          WHERE id = $1
            AND status = 'published'
            AND effective_date <= CURRENT_DATE
          LIMIT 1`
      : `SELECT id, code, type, title, status, version, effective_date, approver_name, published_at, summary, content, created_at, updated_at
           FROM dx_core.resources
          WHERE code = $1
            AND status = 'published'
            AND effective_date <= CURRENT_DATE
          LIMIT 1`;

    const result = await this.pool.query(query, [idOrCode]);
    if (!result.rows.length) return null;
    return mapResourceRow(result.rows[0]);
  }

  async searchAiResources(query: string, limit = 5): Promise<ResourceRecord[]> {
    const trimmed = query.trim();
    const conditions = ["status = 'published'", "effective_date <= CURRENT_DATE"];
    const params: any[] = [];

    if (trimmed) {
      conditions.push(`(title ILIKE $1 OR code ILIKE $1 OR summary ILIKE $1 OR content ILIKE $1)`);
      params.push(`%${trimmed}%`);
    }

    const safeLimit = Math.max(1, Math.min(20, limit));
    params.push(safeLimit);

    const sql = `
      SELECT id, code, type, title, status, version, effective_date, approver_name, published_at, summary, content, created_at, updated_at
        FROM dx_core.resources
       WHERE ${conditions.join(' AND ')}
       ORDER BY effective_date DESC, code ASC
       LIMIT $${params.length}
    `;

    const result = await this.pool.query(sql, params);
    return result.rows.map(mapResourceRow);
  }
}
