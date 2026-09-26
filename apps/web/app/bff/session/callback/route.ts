import { NextRequest, NextResponse } from 'next/server';
import { cookieOptions, finishLogin, LOGIN_COOKIE, SESSION_COOKIE, SessionError } from '../../../../lib/session';

export async function GET(request: NextRequest) {
  let response: NextResponse;
  try {
    const session = await finishLogin(request.cookies.get(LOGIN_COOKIE)?.value, request.nextUrl.searchParams);
    response = NextResponse.redirect(new URL(session.returnTo, process.env.DX_PUBLIC_ORIGIN));
    response.cookies.set(SESSION_COOKIE, session.cookie, { ...cookieOptions, maxAge: session.maxAge });
  } catch (error) {
    response = NextResponse.redirect(new URL(`/bff/session/error?status=${error instanceof SessionError && error.status === 503 ? 503 : 403}`, request.url));
  }
  response.cookies.set(LOGIN_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
