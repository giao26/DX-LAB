// @vitest-environment node
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
      headers: { 'Idempotency-Key': '12345678-1234-4234-8234-123456789003', 'Content-Length': '11000000' },
      body: '{}',
    });
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('chuyển một tệp multipart thành payload nội bộ có base64', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'TCK-2026-000010' }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', upstream);
    const boundary = 'dxlab-boundary-one';
    const pdf = '%PDF-1.4\n%%EOF';
    const body = [
      ['customerName', 'Nguyễn Văn A'], ['customerPhone', '0912345678'],
      ['customerEmail', 'a@example.com'], ['provisionalType', 'Bảo hành'],
      ['description', 'Thiết bị cần kiểm tra.'],
    ].map(([name, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`).join('')
      + `--${boundary}\r\nContent-Disposition: form-data; name="attachment"; filename="tai-lieu.pdf"\r\nContent-Type: application/pdf\r\n\r\n${pdf}\r\n--${boundary}--\r\n`;
    const request = new NextRequest('http://localhost/bff/tickets', {
      method: 'POST', headers: {
        'Idempotency-Key': '12345678-1234-4234-8234-123456789010',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      }, body,
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const forwarded = JSON.parse(upstream.mock.calls[0][1].body as string);
    expect(forwarded.attachment.fileName).toBe('tai-lieu.pdf');
    expect(forwarded.attachment.mimeType).toBe('application/pdf');
    expect(Buffer.from(forwarded.attachment.data, 'base64').toString()).toBe(pdf);
  });

  it('từ chối multipart có nhiều hơn một tệp trước khi gọi P', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const boundary = 'dxlab-boundary-two';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="attachment"; filename="a.pdf"\r\nContent-Type: application/pdf\r\n\r\na\r\n`
      + `--${boundary}\r\nContent-Disposition: form-data; name="attachment"; filename="b.pdf"\r\nContent-Type: application/pdf\r\n\r\nb\r\n--${boundary}--\r\n`;
    const request = new NextRequest('http://localhost/bff/tickets', {
      method: 'POST', headers: {
        'Idempotency-Key': '12345678-1234-4234-8234-123456789011',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      }, body,
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect((await response.json()).errors.attachment[0]).toMatch(/một tệp/);
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe('GET /bff/tickets/[id]', () => {
  it('chuyển tiếp yêu cầu tra cứu ticket tới P và trả trạng thái email', async () => {
    const { GET } = await import('../app/bff/tickets/[id]/route');
    const mockTicket = {
      id: 'a33e617f-9374-4df6-8a91-3caf987f0068',
      code: 'TCK-2026-000001',
      status: 'WAITING',
      confirmationEmailStatus: 'SENT',
      customerEmail: 'private@example.com',
      attachment: { id: 'secret' },
    };
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify(mockTicket), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', upstream);

    const request = new NextRequest('http://localhost/bff/tickets/a33e617f-9374-4df6-8a91-3caf987f0068');
    const response = await GET(request, { params: Promise.resolve({ id: 'a33e617f-9374-4df6-8a91-3caf987f0068' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.code).toBe('TCK-2026-000001');
    expect(data.confirmationEmailStatus).toBe('SENT');
    expect(data.customerEmail).toBeUndefined();
    expect(data.attachment).toBeUndefined();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(upstream.mock.calls[0][0]).toContain('/api/v1/public/tickets/a33e617f-9374-4df6-8a91-3caf987f0068/status');
  });

  it('từ chối payload upstream sai shape thay vì chuyển tiếp PII hoặc undefined', async () => {
    const { GET } = await import('../app/bff/tickets/[id]/route');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'a33e617f-9374-4df6-8a91-3caf987f0068', code: 'TCK-1', status: 'WAITING',
      confirmationEmailStatus: 'SENT', customerEmail: 'private@example.com',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const request = new NextRequest('http://localhost/bff/tickets/a33e617f-9374-4df6-8a91-3caf987f0068');
    const response = await GET(request, { params: Promise.resolve({ id: 'a33e617f-9374-4df6-8a91-3caf987f0068' }) });
    expect(response.status).toBe(200);
    expect((await response.json()).customerEmail).toBeUndefined();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'not-a-uuid', code: 'TCK-1', status: 'UNKNOWN', confirmationEmailStatus: 'truthy',
    }), { status: 200 })));
    const invalid = await GET(request, { params: Promise.resolve({ id: 'a33e617f-9374-4df6-8a91-3caf987f0068' }) });
    expect(invalid.status).toBe(502);
    expect((await invalid.json()).code).toBe('INVALID_UPSTREAM_RESPONSE');
  });

  it('chấp nhận trạng thái email PROCESSING trong contract công khai', async () => {
    const { GET } = await import('../app/bff/tickets/[id]/route');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'a33e617f-9374-4df6-8a91-3caf987f0068', code: 'TCK-1', status: 'WAITING', confirmationEmailStatus: 'PROCESSING',
    }), { status: 200 })));
    const request = new NextRequest('http://localhost/bff/tickets/a33e617f-9374-4df6-8a91-3caf987f0068');
    const response = await GET(request, { params: Promise.resolve({ id: 'a33e617f-9374-4df6-8a91-3caf987f0068' }) });
    expect(response.status).toBe(200);
    expect((await response.json()).confirmationEmailStatus).toBe('PROCESSING');
  });
});

