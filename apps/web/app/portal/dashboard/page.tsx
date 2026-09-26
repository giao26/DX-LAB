import { requirePortal } from '../../../lib/portal';
export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ section?: string }> }) {
  const section = (await searchParams)?.section;
  await requirePortal(section === 'd' || section === 'i' ? `/portal/dashboard?section=${section}#${section}` : '/portal/dashboard', true);
  return <><a href="/portal">← Quay lại Portal</a><h1 tabIndex={-1}>Dashboard Giám đốc</h1><section id="d" tabIndex={-1} className="portal-block"><h2>D — Dữ liệu</h2><p>Báo cáo và KPI chưa được triển khai.</p></section><section id="i" tabIndex={-1} className="portal-block"><h2>I — Trí tuệ</h2><p>Hỗ trợ quyết định và AI chưa được triển khai.</p></section></>;
}
