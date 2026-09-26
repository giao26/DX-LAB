import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }),
}));

vi.mock('../lib/portal', () => ({
  requirePortal: vi.fn(async () => ({ sub: 'emp-1', token: 'valid-token', csrf: 'csrf-1', expires: 9999999999 })),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
  redirect: navigation.redirect,
}));
vi.mock('../lib/announcements', () => ({
  AnnouncementsRequestError: class AnnouncementsRequestError extends Error {
    constructor(public readonly status: number) { super(String(status)); }
  },
  fetchAnnouncements: vi.fn(),
}));

import HumanPage from '../app/portal/h/page';
import AnnouncementsBlock from '../app/portal/h/AnnouncementsBlock';
import { AnnouncementsRequestError, fetchAnnouncements } from '../lib/announcements';

beforeEach(() => vi.clearAllMocks());

test('H hiển thị ba khối, thông báo và ngày theo giờ Việt Nam', async () => {
  vi.mocked(fetchAnnouncements).mockResolvedValueOnce({ data: [
    { id: '1', title: 'Thông báo công ty', body: 'Nội dung chung', scope: 'company', target_group: null, published_at: '2026-09-20T18:00:00Z' },
    { id: '2', title: 'Lịch bảo trì Kỹ thuật', body: 'Nội dung nhóm', scope: 'group', target_group: 'Kỹ thuật', published_at: '2026-09-22T08:00:00Z' },
  ] });
  render(await HumanPage());
  expect(screen.getByRole('heading', { level: 1, name: 'H — Con người' })).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
  expect(screen.getByText('Thông báo công ty')).toBeInTheDocument();
  expect(screen.getByText('Lịch bảo trì Kỹ thuật')).toBeInTheDocument();
  expect(screen.getByText('21/09/2026')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mở Resources' })).toHaveAttribute('href', '/portal/resources');
  expect(screen.getByRole('link', { name: 'Mở Odoo' })).toHaveAttribute('href', '/dx/tickets/workspace');
});

test('H hiển thị trạng thái trống với đường quay lại Portal', async () => {
  vi.mocked(fetchAnnouncements).mockResolvedValueOnce({ data: [] });
  render(await HumanPage());
  expect(screen.getByText('Hiện chưa có thông báo nào.')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /Quay lại Portal/ })).not.toHaveLength(0);
});

test('lỗi dịch vụ thông báo được cô lập khỏi Resources và Odoo', async () => {
  vi.mocked(fetchAnnouncements).mockRejectedValueOnce(new AnnouncementsRequestError(503));
  render(await HumanPage());
  expect(screen.getByRole('alert')).toHaveTextContent('Không thể tải thông báo.');
  expect(screen.getByRole('link', { name: 'Mở Resources' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mở Odoo' })).toBeInTheDocument();
});

test('retry công bố loading và hoàn tất rồi chuyển focus tới heading', async () => {
  let resolveFetch!: (value: Response) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve; })));
  render(<AnnouncementsBlock initialData={null} initialError />);
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Đang thử lại…');
  resolveFetch(new Response(JSON.stringify({ data: [
    { id: '1', title: 'Đã tải', body: 'OK', scope: 'company', target_group: null, published_at: '2026-09-20T08:00:00Z' },
  ] }), { status: 200 }));
  await waitFor(() => expect(screen.getByText('Đã tải')).toBeInTheDocument());
  expect(screen.getByRole('status')).toHaveTextContent('Đã tải 1 thông báo.');
  expect(screen.getByRole('heading', { level: 2, name: 'Thông báo' })).toHaveFocus();
});

test.each([
  [401, '/bff/session/login?returnTo=%2Fportal%2Fh'],
  [403, '/bff/session/error?status=403'],
])('retry chuyển status %i sang luồng xác thực', async (status, destination) => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status })));
  render(<AnnouncementsBlock initialData={null} initialError />);
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(destination));
});

test.each([
  [401, '/bff/session/login?returnTo=%2Fportal%2Fh'],
  [403, '/bff/session/error?status=403'],
])('SSR H chuyển status %i sang luồng xác thực', async (status, destination) => {
  vi.mocked(fetchAnnouncements).mockRejectedValueOnce(new AnnouncementsRequestError(status));
  await expect(HumanPage()).rejects.toThrow(`NEXT_REDIRECT:${destination}`);
});
