import { NextRequest, NextResponse } from 'next/server';
import { cookieOptions, LOGIN_COOKIE, startLogin } from '../../../../lib/session';
import { sessionErrorResponse } from '../../../../lib/session-error-response';

export async function GET(request: NextRequest) {
  try {
    const login = await startLogin(request.nextUrl.searchParams.get('returnTo'));
    const response = NextResponse.redirect(login.url);
    response.headers.set('Cache-Control', 'private, no-store');
    response.cookies.set(LOGIN_COOKIE, login.cookie, { ...cookieOptions, maxAge: 300 });
    return response;
  } catch { return sessionErrorResponse(503); }
}
