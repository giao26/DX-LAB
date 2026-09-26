import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, SESSION_COOKIE } from '../../../lib/session';
import { AnnouncementsRequestError, fetchAnnouncements } from '../../../lib/announcements';

export async function GET() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  const session = getSession(cookie);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  try {
    const data = await fetchAnnouncements(session.token);
    if (getSession(cookie) !== session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (getSession(cookie) !== session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    const status = error instanceof AnnouncementsRequestError ? error.status : 503;
    return NextResponse.json(
      { error: status === 503 ? 'Không thể tải thông báo' : 'Phiên truy cập không còn hợp lệ' },
      { status, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
