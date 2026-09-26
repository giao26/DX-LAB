import { requirePortal } from '../../../lib/portal';
import AnnouncementsBlock from './AnnouncementsBlock';
import { currentIdentity } from '../../../lib/session';
import { fetchAnnouncements } from '../../../lib/announcements';

export default async function HumanPage() {
  const session = await requirePortal('/portal/h');
  let groups: string[] = [];
  let initialData = null;
  let initialError = false;

  if (session?.token) {
    try {
      const identity = await currentIdentity(session);
      groups = identity?.groups || [];
      const data = await fetchAnnouncements(session.token, groups);
      initialData = data.data;
    } catch {
      initialError = true;
    }
  }

  return (
    <>
      <nav aria-label="Điều hướng" className="portal-breadcrumb">
        <a href="/portal">← Quay lại Portal</a>
      </nav>

      <h1 tabIndex={-1}>H — Con người</h1>
      <p className="portal-subtitle">
        Không gian nhân sự, thông báo nội bộ và tri thức công ty.
      </p>

      <AnnouncementsBlock initialData={initialData} initialError={initialError} groups={groups} />

      <section aria-labelledby="resources-heading" className="portal-block">
        <h2 id="resources-heading">Tri thức công ty</h2>
        <p>Tra cứu các quy trình chuẩn (SOP) và câu hỏi thường gặp (FAQ) đang có hiệu lực.</p>
        <a href="/portal/resources" className="portal-cta-link">
          Mở Resources
        </a>
      </section>

      <section aria-labelledby="odoo-heading" className="portal-block">
        <h2 id="odoo-heading">Công cụ làm việc</h2>
        <p>Odoo kiểm tra tài khoản và quyền riêng tại đích để xử lý ticket và quy trình.</p>
        <a href="/dx/tickets/workspace" className="portal-cta-link">
          Mở Odoo
        </a>
      </section>
    </>
  );
}
