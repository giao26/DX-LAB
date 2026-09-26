import { requirePortal } from '../../../lib/portal';
export default async function ProcessPage() {
  await requirePortal('/portal/p');
  return <><a href="/portal">← Quay lại Portal</a><h1 tabIndex={-1}>P — Tiến trình</h1><section className="portal-block"><h2>DX-Ticket</h2><p>Gửi yêu cầu khiếu nại, tư vấn hoặc bảo hành qua biểu mẫu công khai.</p><a href="/">Mở biểu mẫu DX-Ticket</a></section><p>Các quy trình khác chưa được triển khai.</p></>;
}
