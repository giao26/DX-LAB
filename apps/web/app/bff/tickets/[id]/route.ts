import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const params = await context.params;
  const { id } = params;
  if (!id) {
    return NextResponse.json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'Thiếu mã ticket.',
      instance: _request.url,
    }, { status: 400, headers: { 'Content-Type': 'application/problem+json' } });
  }

  const upstream = process.env.P_PROCESS_BASE_URL ?? 'http://p-process:3000';
  try {
    const response = await fetch(`${upstream}/api/v1/tickets/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    const headers = new Headers({
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    });

    return new NextResponse(await response.text(), {
      status: response.status,
      headers,
    });
  } catch {
    return NextResponse.json({
      type: 'about:blank',
      title: 'Dịch vụ tạm thời không khả dụng',
      status: 503,
      code: 'UPSTREAM_UNAVAILABLE',
      detail: 'Không thể kết nối dịch vụ tra cứu ticket.',
    }, { status: 503, headers: { 'Content-Type': 'application/problem+json' } });
  }
}
