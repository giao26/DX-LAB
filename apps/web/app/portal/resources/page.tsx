import { requirePortal } from '../../../lib/portal';
export default async function ResourcesPage() {
  await requirePortal('/portal/resources');
  return <><a href="/portal">← Quay lại Portal</a><h1 tabIndex={-1}>Resources — Tri thức công ty</h1><p>Thư viện SOP/FAQ chưa được triển khai. Chưa có tài liệu để tra cứu.</p></>;
}
