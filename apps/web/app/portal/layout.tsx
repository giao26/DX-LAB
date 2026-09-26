import { requirePortal } from '../../lib/portal';
import FocusHeading from './focus-heading';
export const dynamic = 'force-dynamic';
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortal('/portal', false, true);
  return <main className="portal">{session && <header className="portal-header"><a href="/portal">DX-LAB · Portal</a><form method="post" action="/bff/session/logout"><input type="hidden" name="csrf" value={session.csrf}/><button>Đăng xuất</button></form></header>}<FocusHeading/>{children}</main>;
}
