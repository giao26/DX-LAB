import { redirect } from 'next/navigation';
import { requirePortal } from '../../../lib/portal';
import { AnnouncementsRequestError, fetchAnnouncements } from '../../../lib/announcements';
import AnnouncementsBlock from './AnnouncementsBlock';

export default async function HumanPage() {
  const session = (await requirePortal('/portal/h'))!;
  let initialData = null;
  let initialError = false;

  try {
    initialData = (await fetchAnnouncements(session.token)).data;
  } catch (error) {
    if (error instanceof AnnouncementsRequestError && error.status === 401) {
      redirect('/bff/session/login?returnTo=%2Fportal%2Fh');
    }
    if (error instanceof AnnouncementsRequestError && error.status === 403) {
      redirect('/bff/session/error?status=403');
    }
    initialError = true;
  }

  return (
    <>
      <nav aria-label="Điều hướng" className="portal-breadcrumb">
        <a href="/portal">← Quay lại Portal</a>
      </nav>
      <h1 tabIndex={-1}>H — Con người</h1>
      <p className="portal-subtitle">Không gian nhân sự, thông báo nội bộ và tri thức công ty.</p>

      <AnnouncementsBlock initialData={initialData} initialError={initialError} />

      <section aria-labelledby="resources-heading" className="portal-block">
        <h2 id="resources-heading">Tri thức công ty</h2>
        <p>Tra cứu các quy trình chuẩn (SOP) và câu hỏi thường gặp (FAQ) đang có hiệu lực.</p>
        <a href="/portal/resources" className="portal-cta-link">Mở Resources</a>
      </section>

      <section aria-labelledby="odoo-heading" className="portal-block">
        <h2 id="odoo-heading">Công cụ làm việc</h2>
        <p>Odoo kiểm tra tài khoản và quyền riêng tại đích để xử lý ticket và quy trình.</p>
        <a href="/dx/tickets/workspace" className="portal-cta-link">Mở Odoo</a>
      </section>
    </>
  );
}
