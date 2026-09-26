import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

vi.mock('../lib/portal', () => ({ requirePortal: vi.fn(async () => ({ token: 'valid-token' })) }));

import ProcessPage from '../app/portal/p/page';
import { requirePortal } from '../lib/portal';

test('P hiển thị danh mục DX-Ticket và thông báo quy trình sắp ra mắt', async () => {
  render(await ProcessPage());
  expect(requirePortal).toHaveBeenCalledWith('/portal/p');
  const heading = screen.getByRole('heading', { level: 1, name: 'P — Tiến trình' });
  expect(heading).toHaveAttribute('tabIndex', '-1');
  expect(screen.getByRole('link', { name: '← Quay lại Portal' })).toHaveAttribute('href', '/portal');
  expect(screen.getByRole('heading', { level: 2, name: 'DX-Ticket' })).toBeInTheDocument();
  expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
  expect(screen.getByText(/Đối tượng sử dụng:/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Mở biểu mẫu DX-Ticket/ })).toHaveAttribute('href', '/');
  expect(screen.getByText('Các quy trình khác sẽ sớm ra mắt.')).toBeInTheDocument();
});
