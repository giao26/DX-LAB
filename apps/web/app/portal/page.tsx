import { requirePortal } from '../../lib/portal';
export const tiles = [
  ['H', 'Con người', 'Không gian nhân sự, tri thức và công cụ làm việc.', '/portal/h'],
  ['P', 'Tiến trình', 'Chọn quy trình và gửi yêu cầu DX-Ticket.', '/portal/p'],
  ['D', 'Dữ liệu', 'Không gian báo cáo trên Dashboard dành cho Giám đốc.', '/portal/dashboard?section=d#d'],
  ['I', 'Trí tuệ', 'Không gian hỗ trợ quyết định trên cùng Dashboard dành cho Giám đốc.', '/portal/dashboard?section=i#i'],
] as const;
export default async function PortalPage() {
  await requirePortal();
  return <><h1 tabIndex={-1}>Không gian làm việc</h1><p>Chọn khu vực H → P → D → I để bắt đầu.</p><nav className="portal-tiles" aria-label="Không gian H P D I">{tiles.map(([letter, title, description, href]) => <a className="portal-tile" href={href} key={letter}><span className="portal-letter" aria-hidden="true">{letter}</span><h2>{title}</h2><p>{description}</p></a>)}</nav></>;
}
