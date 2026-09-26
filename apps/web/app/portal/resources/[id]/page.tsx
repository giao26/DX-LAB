import { requirePortal } from '../../../../lib/portal';
import { fetchResourceDetail, type ResourceDetail } from '../../../../lib/resources';

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const returnTo = `/portal/resources/${id}`;
  const session = await requirePortal(returnTo);

  let doc: ResourceDetail | null = null;
  let fetchError = false;

  if (session) {
    try {
      doc = await fetchResourceDetail(session, id);
    } catch {
      fetchError = true;
    }
  }

  if (fetchError || !doc) {
    return (
      <>
        <a href="/portal/resources">← Quay lại Thư viện Resources</a>
        <h1 tabIndex={-1}>Tài liệu không khả dụng</h1>
        <div className="empty-state" role="status">
          <h2>Không tìm thấy tài liệu</h2>
          <p>
            {fetchError
              ? 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.'
              : 'Tài liệu bạn yêu cầu không tồn tại, chưa được công bố hoặc đã bị thu hồi hiệu lực.'}
          </p>
          <div className="empty-state-actions">
            <a href="/portal/resources" className="empty-state-btn btn-primary">
              Quay lại danh sách
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <a href="/portal/resources">← Quay lại Thư viện Resources</a>
      <article className="doc-detail">
        <header className="doc-detail-header">
          <div className="resource-badges">
            <span className={`badge ${doc.type === 'sop' ? 'badge-sop' : 'badge-faq'}`}>
              {doc.type.toUpperCase()}
            </span>
            <span className="badge badge-effective">
              <span className="badge-dot" aria-hidden="true"></span>
              {doc.statusLabel || 'Đang có hiệu lực'}
            </span>
            <span className="badge badge-version">v{doc.version}</span>
          </div>
          <h1 tabIndex={-1} style={{ margin: '.5rem 0 .75rem' }}>
            {doc.title}
          </h1>
          <div className="resource-meta">
            <span>
              Mã tài liệu: <strong>{doc.code}</strong>
            </span>
            <span>
              Ngày hiệu lực: <strong>{doc.effectiveDate}</strong>
            </span>
            <span>
              Người phê duyệt: <strong>{doc.approverName}</strong>
            </span>
            {doc.publishedAt && (
              <span>
                Thời điểm công bố: <strong>{doc.publishedAt.slice(0, 10)}</strong>
              </span>
            )}
          </div>
        </header>

        <section className="doc-content-box" aria-label="Nội dung toàn văn tài liệu">
          {doc.content}
        </section>

        <div style={{ marginTop: '1.5rem' }}>
          <a href="/portal/resources">← Quay lại Thư viện Resources</a>
        </div>
      </article>
    </>
  );
}
