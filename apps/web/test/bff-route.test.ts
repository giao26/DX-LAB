import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../app/bff/tickets/route';

describe('POST /bff/tickets', () => {
  it('chuyển tiếp đủ payload, UUID và header replay từ P', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'TCK-2026-000001' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Replayed': 'true' },
    }));
    vi.stubGlobal('fetch', upstream);
    const payload = { customerName: 'A', customerPhone: '0912345678', customerEmail: 'a@example.com', provisionalType: 'Tư vấn', description: 'Nội dung hợp lệ.' };
    const request = new NextRequest('http://localhost/bff/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': '12345678-1234-4234-8234-123456789001' },
      body: JSON.stringify(payload),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('idempotency-replayed')).toBe('true');
    expect(upstream).toHaveBeenCalledOnce();
    const init = upstream.mock.calls[0][1] as RequestInit;
    expect(init.headers).toEqual(expect.objectContaining({ 'Idempotency-Key': '12345678-1234-4234-8234-123456789001' }));
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('giữ lỗi theo trường từ P', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'VALIDATION_ERROR', errors: { customerEmail: ['Email không đúng định dạng.'] },
    }), { status: 400, headers: { 'Content-Type': 'application/problem+json' } })));
    const request = new NextRequest('http://localhost/bff/tickets', {
      method: 'POST', headers: { 'Idempotency-Key': '12345678-1234-4234-8234-123456789002' }, body: '{}',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect((await response.json()).errors.customerEmail).toHaveLength(1);
  });

  it('chặn body vượt giới hạn trước khi gọi P', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const request = new NextRequest('http://localhost/bff/tickets', {
      method: 'POST',
      headers: { 'Idempotency-Key': '12345678-1234-4234-8234-123456789003', 'Content-Length': '40000' },
      body: '{}',
    });
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });
});
