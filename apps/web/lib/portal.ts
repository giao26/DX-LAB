import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentIdentity, getSession, SESSION_COOKIE, SessionError } from './session';

export async function requirePortal(path = '/portal', director = false, allowMissing = false) {
  let cookie: string | undefined;
  let session;
  try { cookie = (await cookies()).get(SESSION_COOKIE)?.value; session = getSession(cookie); }
  catch { redirect('/bff/session/error?status=503'); }
  if (!session) {
    if (allowMissing) return undefined;
    redirect(`/bff/session/login?returnTo=${encodeURIComponent(path)}`);
  }
  try {
    const identity = await currentIdentity(session);
    if (getSession(cookie) !== session) throw new SessionError(401);
    if (director && !identity.roles.includes('director')) throw new SessionError(403);
    return session;
  } catch (error) {
    redirect(`/bff/session/error?status=${error instanceof SessionError && error.status === 503 ? 503 : 403}`);
  }
}
