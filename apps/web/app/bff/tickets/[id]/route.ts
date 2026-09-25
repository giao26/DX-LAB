import { NextRequest, NextResponse } from 'next/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TICKET_STATUSES = new Set(['WAITING', 'IN_PROGRESS', 'CLOSED']);
const EMAIL_STATUSES = new Set(['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER']);

function isPublicTicketStatus(value: unknown): value is {
  id: string; code: string; status: string; confirmationEmailStatus: string;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && UUID.test(row.id)
    && typeof row.code === 'string' && row.code.length > 0
    && typeof row.status === 'string' && TICKET_STATUSES.has(row.status)
    && typeof row.confirmationEmailStatus === 'string' && EMAIL_STATUSES.has(row.confirmationEmailStatus);
}

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
    const response = await fetch(`${upstream}/api/v1/public/tickets/${encodeURIComponent(id)}/status`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    const headers = new Headers({
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    });

    if (!response.ok) return new NextResponse(await response.text(), { status: response.status, headers });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (!isPublicTicketStatus(body)) {
      return NextResponse.json({
        type: 'about:blank',
        title: 'Phản hồi upstream không hợp lệ',
        status: 502,
        code: 'INVALID_UPSTREAM_RESPONSE',
        detail: 'Dịch vụ ticket trả dữ liệu không đúng hợp đồng công khai.',
      }, { status: 502, headers: { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' } });
    }
    const safe = {
      id: body.id,
      code: body.code,
      status: body.status,
      confirmationEmailStatus: body.confirmationEmailStatus,
    };
    return NextResponse.json(safe, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({
      type: 'about:blank',
      title: 'Dịch vụ tạm thời không khả dụng',
      status: 503,
      code: 'UPSTREAM_UNAVAILABLE',
      detail: 'Không thể kết nối dịch vụ tra cứu ticket.',
    }, { status: 503, headers: { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' } });
  }
}
