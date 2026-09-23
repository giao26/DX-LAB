import { NextRequest, NextResponse } from 'next/server';

const MAX_BODY_BYTES = 32 * 1024;

async function readLimitedBody(request: NextRequest): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(merged);
}

export async function POST(request: NextRequest) {
  const key = request.headers.get('idempotency-key');
  if (!key) return NextResponse.json({ detail: 'Thiếu Idempotency-Key.' }, { status: 400 });
  const upstream = process.env.P_PROCESS_BASE_URL ?? 'http://p-process:3000';
  try {
    const body = await readLimitedBody(request);
    if (body === null) return NextResponse.json({
      type: 'about:blank', title: 'Dữ liệu quá lớn', status: 413,
      code: 'PAYLOAD_TOO_LARGE', detail: 'Nội dung yêu cầu vượt quá giới hạn cho phép.',
    }, { status: 413 });
    const response = await fetch(`${upstream}/api/v1/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const headers = new Headers({ 'Content-Type': response.headers.get('content-type') ?? 'application/json' });
    for (const name of ['location', 'idempotency-replayed', 'retry-after']) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new NextResponse(await response.text(), {
      status: response.status,
      headers,
    });
  } catch {
    return NextResponse.json({
      type: 'about:blank', title: 'Dịch vụ tạm thời không khả dụng', status: 503,
      code: 'UPSTREAM_UNAVAILABLE', detail: 'Không thể kết nối dịch vụ tiếp nhận ticket.',
    }, { status: 503 });
  }
}
