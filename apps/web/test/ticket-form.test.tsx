import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TicketForm } from '../app/ticket-form';

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'Nguyễn Văn A' } });
  fireEvent.change(screen.getByLabelText(/Số điện thoại/), { target: { value: '0912345678' } });
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'a@example.com' } });
  fireEvent.change(screen.getByLabelText(/Bạn cần hỗ trợ/), { target: { value: 'Bảo hành' } });
  fireEvent.change(screen.getByLabelText(/Nội dung chi tiết/), { target: { value: 'Thiết bị cần được kiểm tra bảo hành.' } });
}

describe('TicketForm', () => {
  it('chặn dữ liệu sai tại UI, giữ giá trị và focus tóm tắt', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<TicketForm />);
    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'sai' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));
    const summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Email/)).toHaveValue('sai');
  });

  it('giữ dữ liệu và focus tóm tắt khi API trả lỗi theo trường', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ errors: { customerEmail: ['Email không đúng định dạng.'] } }),
    }));
    render(<TicketForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));
    const summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(screen.getByLabelText(/Họ và tên/)).toHaveValue('Nguyễn Văn A');
    expect(screen.getAllByText('Email không đúng định dạng.')).toHaveLength(2);
  });

  it('focus xác nhận và hiện mã ticket khi thành công', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'TCK-2026-000001',
        status: 'WAITING',
        confirmationEmailStatus: 'PENDING',
        receivedAt: '2026-09-23T00:00:00Z',
      }),
    }));
    render(<TicketForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));
    const status = await screen.findByRole('status');
    await waitFor(() => expect(status).toHaveFocus());
    expect(screen.getByText('TCK-2026-000001')).toBeInTheDocument();
    expect(screen.getByText(/Đang gửi email xác nhận/)).toBeInTheDocument();
  });

  it('hiển thị văn bản trạng thái khi email đã được gửi thành công', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'TCK-2026-000002',
        status: 'WAITING',
        confirmationEmailStatus: 'SENT',
        receivedAt: '2026-09-23T00:00:00Z',
      }),
    }));
    render(<TicketForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));
    const status = await screen.findByRole('status');
    await waitFor(() => expect(status).toHaveFocus());
    expect(screen.getByText('TCK-2026-000002')).toBeInTheDocument();
    expect(screen.getByText('Trạng thái email: Đã gửi email xác nhận')).toBeInTheDocument();
  });

  it('chuyển trạng thái email từ PENDING sang SENT khi thăm dò thành công', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/bff/tickets') {
        return {
          ok: true,
          json: async () => ({
            id: 'uuid-1',
            code: 'TCK-2026-000003',
            status: 'WAITING',
            confirmationEmailStatus: 'PENDING',
            receivedAt: '2026-09-23T00:00:00Z',
          }),
        };
      }
      if (url === '/bff/tickets/uuid-1') {
        return {
          ok: true,
          json: async () => ({
            id: 'uuid-1',
            code: 'TCK-2026-000003',
            status: 'WAITING',
            confirmationEmailStatus: 'SENT',
          }),
        };
      }
      throw new Error(`Unexpected url ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TicketForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    const status = await screen.findByRole('status');
    await waitFor(() => expect(status).toHaveFocus());
    expect(screen.getByText('TCK-2026-000003')).toBeInTheDocument();
    expect(screen.getByText(/Đang gửi email xác nhận/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Trạng thái email: Đã gửi email xác nhận')).toBeInTheDocument();
    }, { timeout: 4000 });
  });
});
