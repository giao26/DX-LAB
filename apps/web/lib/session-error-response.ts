import { NextResponse } from 'next/server';

export function sessionErrorResponse(status: 403 | 503) {
  try {
    const origin = new URL(process.env.DX_PUBLIC_ORIGIN ?? '');
    if (!['https:', 'http:'].includes(origin.protocol)) throw new Error('Invalid public origin');
    const response = NextResponse.redirect(new URL(`/bff/session/error?status=${status}`, origin.origin));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch {
    return new NextResponse('<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dịch vụ xác thực không khả dụng</title></head><body><main><h1>Dịch vụ xác thực không khả dụng</h1><p>Cấu hình đăng nhập chưa đầy đủ. Vui lòng liên hệ quản trị viên.</p><a href="/">Về trang công khai</a></main></body></html>', {
      status: 503, headers: {
        'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store',
        'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      },
    });
  }
}
