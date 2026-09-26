import { requirePortal } from '../../../lib/portal';
export default async function HumanPage() {
  await requirePortal('/portal/h');
  return <><a href="/portal">← Quay lại Portal</a><h1 tabIndex={-1}>H — Con người</h1><section className="portal-block"><h2>Tri thức công ty</h2><p>Tra cứu các quy trình chuẩn (SOP) và câu hỏi thường gặp (FAQ) đang có hiệu lực.</p><a href="/portal/resources">Mở Resources</a></section><section className="portal-block"><h2>Công cụ làm việc</h2><p>Odoo kiểm tra tài khoản và quyền riêng tại đích.</p><a href="/dx/tickets/workspace">Mở Odoo</a></section><section className="portal-block"><h2>Thông báo</h2><p>Thông báo công ty và nhóm chưa được triển khai.</p></section></>;
}
