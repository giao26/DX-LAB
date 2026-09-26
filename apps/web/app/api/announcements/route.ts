import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, SESSION_COOKIE, currentIdentity } from '../../../lib/session';
import { fetchAnnouncements } from '../../../lib/announcements';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE)?.value;
    const session = getSession(cookie);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identity = await currentIdentity(session);
    const groups = identity?.groups || [];

    const data = await fetchAnnouncements(session.token, groups);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}
