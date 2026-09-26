import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status') === '503' ? 503 : 403;
  const message = status === 503 ? 'Dịch vụ xác thực không khả dụng. Vui lòng thử lại.' : 'Không thể xác thực hoặc bạn không có quyền truy cập.';
  return new NextResponse(`<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Truy cập không khả dụng</title><body><main><h1 tabindex="-1" autofocus>Truy cập không khả dụng</h1><p>${message}</p><p>Liên hệ quản trị viên nếu cần hỗ trợ.</p><p><a href="/bff/session/login?returnTo=%2Fportal">Đăng nhập lại / Thử lại</a></p><a href="/">Về trang công khai</a></main></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
}
