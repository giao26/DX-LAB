import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAnnouncementStore } from '../dist/adapters/postgres/announcement-store.js';

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, 'DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  const seedCount = await pool.query("SELECT count(*)::int AS count FROM dx_core.announcements WHERE id::text LIKE '70000000-0000-4000-8000-%'");
  assert.equal(seedCount.rows[0].count, 3, 'migration reruns must not duplicate seed announcements');

  await assert.rejects(
    pool.query("INSERT INTO dx_core.announcements (title, scope, target_group) VALUES ('Sai company', 'company', 'Kỹ thuật')"),
    error => error.code === '23514',
  );
  await assert.rejects(
    pool.query("INSERT INTO dx_core.announcements (title, scope, target_group) VALUES ('Sai group', 'group', NULL)"),
    error => error.code === '23514',
  );
  await assert.rejects(
    pool.query("INSERT INTO dx_core.announcements (title, scope) VALUES ('   ', 'company')"),
    error => error.code === '23514',
  );
  await assert.rejects(
    pool.query("INSERT INTO dx_core.announcements (title, scope, published_at, expires_at) VALUES ('Invalid window', 'company', NOW(), NOW())"),
    error => error.code === '23514',
  );

  await pool.query(`INSERT INTO dx_core.announcements
    (id, title, scope, target_group, published_at, expires_at) VALUES
    ('70000000-0000-4000-8000-000000000010', 'Thông báo tương lai', 'company', NULL, NOW() + INTERVAL '1 day', NULL),
    ('70000000-0000-4000-8000-000000000011', 'Thông báo hết hạn', 'company', NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
    ('70000000-0000-4000-8000-000000000012', 'Kỹ thuật mới nhất', 'group', 'Kỹ thuật', NOW() - INTERVAL '1 hour', NULL),
    ('70000000-0000-4000-8000-000000000013', 'Cùng giờ thấp', 'group', 'Kỹ thuật', NOW() - INTERVAL '30 minutes', NULL),
    ('70000000-0000-4000-8000-000000000014', 'Cùng giờ cao', 'group', 'Kỹ thuật', NOW() - INTERVAL '30 minutes', NULL)
    ON CONFLICT (id) DO NOTHING`);

  const store = new PostgresAnnouncementStore(pool);
  const companyOnly = await store.listByScope([]);
  assert.ok(companyOnly.every(item => item.scope === 'company'));
  assert.ok(companyOnly.every(item => item.title !== 'Thông báo tương lai' && item.title !== 'Thông báo hết hạn'));

  const technical = await store.listByScope(['Kỹ thuật']);
  assert.ok(technical.some(item => item.target_group === 'Kỹ thuật'));
  assert.equal(technical.some(item => item.target_group === 'Nhân sự'), false);
  assert.deepEqual(
    technical.filter(item => item.title.startsWith('Cùng giờ')).map(item => item.id),
    ['70000000-0000-4000-8000-000000000014', '70000000-0000-4000-8000-000000000013'],
  );

  const hr = await store.listByScope(['Nhân sự']);
  assert.ok(hr.some(item => item.target_group === 'Nhân sự'));
  assert.equal(hr.some(item => item.target_group === 'Kỹ thuật'), false);
  console.log('Announcement PostgreSQL integration matrix: PASS');
} finally {
  await pool.end();
}
