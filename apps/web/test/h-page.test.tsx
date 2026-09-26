import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, vi, beforeEach } from 'vitest';

vi.mock('../lib/portal', () => ({
  requirePortal: vi.fn(async () => ({
    sub: 'emp-1',
    token: 'valid-token',
    csrf: 'csrf-1',
    expires: 9999999999,
  })),
}));

vi.mock('../lib/session', () => ({
  currentIdentity: vi.fn(async () => ({
    sub: 'emp-1',
    roles: ['employee'],
    groups: ['Kỹ thuật'],
  })),
}));

vi.mock('../lib/announcements', () => ({
  fetchAnnouncements: vi.fn(),
}));

import HumanPage from '../app/portal/h/page';
import { fetchAnnouncements } from '../lib/announcements';

beforeEach(() => {
  vi.clearAllMocks();
});

test('H Page renders announcements, Resources link, and Odoo link on success', async () => {
  vi.mocked(fetchAnnouncements).mockResolvedValueOnce({
    data: [
      {
        id: '1',
        title: 'Chào mừng đến DX-OS',
        body: 'Nội dung thông báo toàn công ty',
        scope: 'company',
        target_group: null,
        published_at: '2026-09-20T08:00:00Z',
      },
      {
        id: '2',
        title: 'Lịch bảo trì Kỹ thuật',
        body: 'Bảo trì hệ thống nhóm kỹ thuật',
        scope: 'group',
        target_group: 'Kỹ thuật',
        published_at: '2026-09-22T08:00:00Z',
      },
    ],
  });

  render(await HumanPage());

  // Heading & Breadcrumb
  expect(screen.getByRole('heading', { level: 1, name: 'H — Con người' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← Quay lại Portal' })).toHaveAttribute('href', '/portal');

  // Announcements block
  expect(screen.getByText('Chào mừng đến DX-OS')).toBeInTheDocument();
  expect(screen.getByText('Lịch bảo trì Kỹ thuật')).toBeInTheDocument();

  // Resources block
  expect(screen.getByRole('heading', { level: 2, name: 'Tri thức công ty' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mở Resources' })).toHaveAttribute('href', '/portal/resources');

  // Odoo block
  expect(screen.getByRole('heading', { level: 2, name: 'Công cụ làm việc' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mở Odoo' })).toHaveAttribute('href', '/dx/tickets/workspace');
});

test('H Page shows empty state when no announcements match scope', async () => {
  vi.mocked(fetchAnnouncements).mockResolvedValueOnce({ data: [] });

  render(await HumanPage());

  expect(screen.getByText('Hiện chưa có thông báo nào.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mở Resources' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mở Odoo' })).toBeInTheDocument();
});

test('H Page isolates error when announcements fetch fails and provides retry button', async () => {
  vi.mocked(fetchAnnouncements).mockRejectedValueOnce(new Error('503 Service Unavailable'));

  render(await HumanPage());

  // Error message in announcements section
  expect(screen.getByText('Không thể tải danh sách thông báo.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();

  // Other sections remain completely accessible
  expect(screen.getByRole('heading', { level: 2, name: 'Tri thức công ty' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mở Resources' })).toHaveAttribute('href', '/portal/resources');
  expect(screen.getByRole('heading', { level: 2, name: 'Công cụ làm việc' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mở Odoo' })).toHaveAttribute('href', '/dx/tickets/workspace');
});
