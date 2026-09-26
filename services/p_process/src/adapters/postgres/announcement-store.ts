import type { Pool } from 'pg';
import type { Announcement } from '../../domain/announcement.js';

export interface AnnouncementStore {
  listByScope(groups: string[]): Promise<Announcement[]>;
}

function mapRow(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body || '',
    scope: row.scope,
    target_group: row.target_group || null,
    published_at: new Date(row.published_at).toISOString(),
  };
}

export class PostgresAnnouncementStore implements AnnouncementStore {
  constructor(private readonly pool: Pool) {}

  async listByScope(groups: string[]): Promise<Announcement[]> {
    let query: string;
    let params: string[];

    if (groups.length > 0) {
      query = `
        SELECT * FROM dx_core.announcements
        WHERE published_at <= NOW()
          AND (expires_at IS NULL OR expires_at > NOW())
          AND (scope = 'company' OR (scope = 'group' AND target_group = ANY($1)))
        ORDER BY published_at DESC, id DESC
      `;
      params = [groups as any];
    } else {
      query = `
        SELECT * FROM dx_core.announcements
        WHERE published_at <= NOW()
          AND (expires_at IS NULL OR expires_at > NOW())
          AND scope = 'company'
        ORDER BY published_at DESC, id DESC
      `;
      params = [];
    }

    const result = await this.pool.query(query, params);
    return result.rows.map(mapRow);
  }
}
