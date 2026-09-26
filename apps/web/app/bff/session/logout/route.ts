import { NextRequest, NextResponse } from 'next/server';
import { cookieOptions, endSession, SESSION_COOKIE } from '../../../../lib/session';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    endSession(request.cookies.get(SESSION_COOKIE)?.value, form.get('csrf'), request.headers.get('origin'));
    const response = NextResponse.redirect(new URL('/', process.env.DX_PUBLIC_ORIGIN), 303);
    response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Clear-Site-Data', '"cache"');
    return response;
  } catch { return new NextResponse('Yêu cầu đăng xuất không hợp lệ.', { status: 403, headers: { 'Cache-Control': 'private, no-store' } }); }
}
