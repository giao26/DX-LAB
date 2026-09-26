import { requirePortal } from '../../../lib/portal';

export default async function ProcessPage() {
  await requirePortal('/portal/p');

  return (
    <>
      <nav aria-label="Điều hướng" className="portal-breadcrumb">
        <a href="/portal">← Quay lại Portal</a>
      </nav>

      <h1 tabIndex={-1}>P — Tiến trình</h1>
      <p className="portal-subtitle">
        Danh mục các quy trình vận hành số được phép sử dụng.
      </p>

      <section aria-labelledby="ticket-heading" className="portal-block process-card">
        <div className="process-header">
          <h2 id="ticket-heading">DX-Ticket</h2>
          <span className="badge badge-active">Đang hoạt động</span>
        </div>
        <p className="process-desc">Tiếp nhận và xử lý yêu cầu khiếu nại, tư vấn, bảo hành qua biểu mẫu công khai.</p>
        <p className="process-audience"><strong>Đối tượng sử dụng:</strong> Khách hàng (công khai), Nhân viên nội bộ</p>
        <a href="/" className="btn-primary process-cta">
          Mở biểu mẫu DX-Ticket →
        </a>
      </section>

      <section aria-labelledby="upcoming-heading" className="portal-block">
        <h2 id="upcoming-heading">Quy trình khác</h2>
        <p className="empty-text">Các quy trình khác chưa được triển khai.</p>
      </section>
    </>
  );
}
