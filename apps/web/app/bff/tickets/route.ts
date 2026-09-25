import { NextRequest, NextResponse } from 'next/server';

const MAX_BODY_BYTES = 10 * 1024 * 1024 + 64 * 1024;

async function readLimitedBody(request: Request): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return null;
  if (!request.body) return new Uint8Array();
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
  return merged;
}

export async function POST(request: NextRequest) {
  const key = request.headers.get('idempotency-key');
  if (!key) return NextResponse.json({ detail: 'Thiếu Idempotency-Key.' }, { status: 400 });
  const upstream = process.env.P_PROCESS_BASE_URL ?? 'http://p-process:3000';
  try {
    const rawBody = await readLimitedBody(request.clone());
    if (rawBody === null) return NextResponse.json({
      type: 'about:blank', title: 'Dữ liệu quá lớn', status: 413,
      code: 'PAYLOAD_TOO_LARGE', detail: 'Nội dung yêu cầu vượt quá giới hạn cho phép.',
    }, { status: 413 });
    const contentType = request.headers.get('content-type') ?? '';
    let payload: unknown;
    if (contentType.toLowerCase().startsWith('multipart/form-data')) {
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return NextResponse.json({
          type: 'about:blank', title: 'Dữ liệu chưa hợp lệ', status: 400,
          code: 'INVALID_MULTIPART', detail: 'Không thể đọc dữ liệu biểu mẫu.',
          errors: { attachment: ['Tệp đính kèm không hợp lệ.'] },
        }, { status: 400 });
      }
      const files = form.getAll('attachment').filter((item): item is File => typeof item !== 'string' && item.size > 0);
      if (files.length > 1) return NextResponse.json({
        type: 'about:blank', title: 'Dữ liệu chưa hợp lệ', status: 400,
        code: 'TOO_MANY_ATTACHMENTS', detail: 'Chỉ được phép đính kèm một tệp.',
        errors: { attachment: ['Chỉ được phép đính kèm một tệp.'] },
      }, { status: 400 });
      payload = {
        customerName: String(form.get('customerName') ?? ''),
        customerPhone: String(form.get('customerPhone') ?? ''),
        customerEmail: String(form.get('customerEmail') ?? ''),
        provisionalType: String(form.get('provisionalType') ?? ''),
        description: String(form.get('description') ?? ''),
        ...(files[0] ? { attachment: {
          fileName: files[0].name,
          mimeType: files[0].type,
          data: Buffer.from(await files[0].arrayBuffer()).toString('base64'),
        } } : {}),
      };
    } else {
      try {
        payload = JSON.parse(new TextDecoder().decode(rawBody));
      } catch {
        return NextResponse.json({ detail: 'Nội dung JSON không hợp lệ.' }, { status: 400 });
      }
    }
    const response = await fetch(`${upstream}/api/v1/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify(payload),
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
