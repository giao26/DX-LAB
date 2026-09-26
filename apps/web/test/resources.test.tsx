import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('../lib/portal', () => ({
  requirePortal: vi.fn(async () => ({ sub: 'user-1', token: 'mock-token', csrf: 'mock-csrf', expires: 9999999999 })),
}));

vi.mock('../lib/resources', () => ({
  fetchResources: vi.fn(),
  fetchResourceDetail: vi.fn(),
}));

import ResourcesPage from '../app/portal/resources/page';
import ResourceDetailPage from '../app/portal/resources/[id]/page';
import { requirePortal } from '../lib/portal';
import { fetchResources, fetchResourceDetail } from '../lib/resources';

const mockResources = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    code: 'SOP-TKT-001',
    type: 'sop' as const,
    title: 'Quy trình tiếp nhận và phân công ticket',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    status: 'published',
    statusLabel: 'Đang có hiệu lực',
    approverName: 'Ban Giám đốc',
    publishedAt: '2026-01-01T08:00:00Z',
    summary: 'Quy định các bước tiếp nhận và phân công ticket.',
  },
  {
    id: '60000000-0000-4000-8000-000000000003',
    code: 'FAQ-GEN-001',
    type: 'faq' as const,
    title: 'Hướng dẫn dành cho nhân viên mới và câu hỏi thường gặp',
    version: '1.0.0',
    effectiveDate: '2026-02-01',
    status: 'published',
    statusLabel: 'Đang có hiệu lực',
    approverName: 'Phòng Nhân sự',
    publishedAt: '2026-02-01T08:30:00Z',
    summary: 'Giải đáp các thắc mắc phổ biến.',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

test('ResourcesPage renders document list with title, search input, filters and cards', async () => {
  vi.mocked(fetchResources).mockResolvedValue({
    items: mockResources,
    total: 2,
  });

  const jsx = await ResourcesPage({});
  render(jsx);

  expect(requirePortal).toHaveBeenCalledWith('/portal/resources');
  expect(screen.getByRole('heading', { level: 1, name: 'Resources — Tri thức công ty' })).toBeVisible();
  expect(screen.getByRole('searchbox', { name: 'Tìm kiếm tài liệu' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Tất cả' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'SOP (Quy trình)' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'FAQ (Hỏi đáp)' })).toBeVisible();

  expect(screen.getByText('Quy trình tiếp nhận và phân công ticket')).toBeVisible();
  expect(screen.getByText('SOP-TKT-001')).toBeVisible();
  expect(screen.getByText('Hướng dẫn dành cho nhân viên mới và câu hỏi thường gặp')).toBeVisible();
  expect(screen.getByText('FAQ-GEN-001')).toBeVisible();
  expect(screen.getAllByText('Đang có hiệu lực').length).toBeGreaterThanOrEqual(2);
});

test('ResourcesPage passes type filter to fetchResources and sets active filter tab', async () => {
  vi.mocked(fetchResources).mockResolvedValue({
    items: [mockResources[0]],
    total: 1,
  });

  const jsx = await ResourcesPage({
    searchParams: Promise.resolve({ type: 'sop' }),
  });
  render(jsx);

  expect(requirePortal).toHaveBeenCalledWith('/portal/resources?type=sop');
  expect(fetchResources).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ type: 'sop', search: '' }),
  );
  expect(screen.getByRole('link', { name: 'SOP (Quy trình)' })).toHaveAttribute('aria-current', 'page');
});

test('ResourcesPage passes search query to fetchResources and populates searchbox', async () => {
  vi.mocked(fetchResources).mockResolvedValue({
    items: [mockResources[0]],
    total: 1,
  });

  const jsx = await ResourcesPage({
    searchParams: Promise.resolve({ search: 'ticket' }),
  });
  render(jsx);

  expect(requirePortal).toHaveBeenCalledWith('/portal/resources?search=ticket');
  expect(fetchResources).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ type: '', search: 'ticket' }),
  );
  expect(screen.getByRole('searchbox', { name: 'Tìm kiếm tài liệu' })).toHaveValue('ticket');
});

test('ResourcesPage displays empty state when no documents match', async () => {
  vi.mocked(fetchResources).mockResolvedValue({
    items: [],
    total: 0,
  });

  const jsx = await ResourcesPage({
    searchParams: Promise.resolve({ search: 'khongtontai' }),
  });
  render(jsx);

  expect(screen.getByRole('heading', { level: 2, name: 'Không tìm thấy tài liệu phù hợp' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Xóa bộ lọc' })).toHaveAttribute('href', '/portal/resources');
  expect(screen.getByRole('link', { name: 'Quay lại Portal' })).toHaveAttribute('href', '/portal');
});

test('ResourcesPage displays error notification when backend is unavailable', async () => {
  vi.mocked(fetchResources).mockRejectedValue(new Error('Backend down'));

  const jsx = await ResourcesPage({});
  render(jsx);

  expect(screen.getByRole('heading', { level: 2, name: 'Dịch vụ tạm thời không khả dụng' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Thử lại' })).toBeVisible();
});

test('ResourceDetailPage renders full document details when found', async () => {
  vi.mocked(fetchResourceDetail).mockResolvedValue({
    ...mockResources[0],
    content: 'Chi tiết các bước thực hiện theo chuẩn ISO...',
  });

  const jsx = await ResourceDetailPage({
    params: Promise.resolve({ id: '60000000-0000-4000-8000-000000000001' }),
  });
  render(jsx);

  expect(requirePortal).toHaveBeenCalledWith('/portal/resources/60000000-0000-4000-8000-000000000001');
  expect(screen.getByRole('heading', { level: 1, name: 'Quy trình tiếp nhận và phân công ticket' })).toBeVisible();
  expect(screen.getByText('SOP-TKT-001')).toBeVisible();
  expect(screen.getByText('v1.0.0')).toBeVisible();
  expect(screen.getByText('Chi tiết các bước thực hiện theo chuẩn ISO...')).toBeVisible();
  expect(screen.getAllByRole('link', { name: '← Quay lại Thư viện Resources' }).length).toBeGreaterThanOrEqual(1);
});

test('ResourceDetailPage safely rejects draft or missing ID without leaking metadata', async () => {
  vi.mocked(fetchResourceDetail).mockResolvedValue(null);

  const jsx = await ResourceDetailPage({
    params: Promise.resolve({ id: 'draft-id-123' }),
  });
  render(jsx);

  expect(screen.getByRole('heading', { level: 1, name: 'Tài liệu không khả dụng' })).toBeVisible();
  expect(screen.getByText('Tài liệu bạn yêu cầu không tồn tại, chưa được công bố hoặc đã bị thu hồi hiệu lực.')).toBeVisible();
  expect(screen.queryByText('draft-id-123')).toBeNull();
  expect(screen.getByRole('link', { name: 'Quay lại danh sách' })).toHaveAttribute('href', '/portal/resources');
});
