import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

vi.mock('../lib/portal', () => ({
  requirePortal: vi.fn(async () => ({
    sub: 'emp-1',
    token: 'valid-token',
    csrf: 'csrf-1',
    expires: 9999999999,
  })),
}));

import ProcessPage from '../app/portal/p/page';
import { requirePortal } from '../lib/portal';

test('P Page renders process catalog with DX-Ticket and upcoming processes', async () => {
  render(await ProcessPage());

  expect(requirePortal).toHaveBeenCalledWith('/portal/p');

  // Heading & Breadcrumb
  const heading = screen.getByRole('heading', { level: 1, name: 'P — Tiến trình' });
  expect(heading).toBeInTheDocument();
  expect(heading).toHaveAttribute('tabIndex', '-1');
  expect(screen.getByRole('link', { name: '← Quay lại Portal' })).toHaveAttribute('href', '/portal');

  // DX-Ticket Process Card
  expect(screen.getByRole('heading', { level: 2, name: 'DX-Ticket' })).toBeInTheDocument();
  expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
  expect(screen.getByText(/Tiếp nhận và xử lý yêu cầu/i)).toBeInTheDocument();
  expect(screen.getByText(/Đối tượng sử dụng:/i)).toBeInTheDocument();

  // CTA button opens public form at '/'
  const cta = screen.getByRole('link', { name: /Mở biểu mẫu DX-Ticket/i });
  expect(cta).toHaveAttribute('href', '/');

  // Upcoming processes section
  expect(screen.getByRole('heading', { level: 2, name: 'Quy trình khác' })).toBeInTheDocument();
  expect(screen.getByText('Các quy trình khác chưa được triển khai.')).toBeInTheDocument();
});
