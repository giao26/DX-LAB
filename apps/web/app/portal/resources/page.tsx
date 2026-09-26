import { requirePortal } from '../../../lib/portal';
import { fetchResources, type ResourceListResponse } from '../../../lib/resources';

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string | string[]; search?: string | string[]; q?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const extractParam = (p: string | string[] | undefined): string =>
    typeof p === 'string' ? p : Array.isArray(p) && p.length > 0 && typeof p[0] === 'string' ? p[0] : '';
  const rawType = extractParam(params?.type);
  const currentType = rawType === 'sop' || rawType === 'faq' ? rawType : '';
  const search = (extractParam(params?.search) || extractParam(params?.q)).trim();

  const queryParts: string[] = [];
  if (currentType) queryParts.push(`type=${encodeURIComponent(currentType)}`);
  if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
  const queryString = queryParts.length ? `?${queryParts.join('&')}` : '';
  const returnTo = `/portal/resources${queryString}`;

  const session = await requirePortal(returnTo);

  let resources: ResourceListResponse = { items: [], total: 0 };
  let fetchError = false;

  if (session) {
    try {
      resources = await fetchResources(session, {
        type: currentType,
        search,
      });
    } catch {
      fetchError = true;
    }
  }

  const buildFilterHref = (t?: string) => {
    const parts: string[] = [];
    if (t) parts.push(`type=${t}`);
    if (search) parts.push(`search=${encodeURIComponent(search)}`);
    return `/portal/resources${parts.length ? `?${parts.join('&')}` : ''}`;
  };

  return (
    <>
      <a href="/portal">← Quay lại Portal</a>
      <h1 tabIndex={-1}>Resources — Tri thức công ty</h1>
      <p>Tra cứu các quy trình chuẩn (SOP) và câu hỏi thường gặp (FAQ) đang có hiệu lực thi hành.</p>

      {fetchError && (
        <div className="summary error" role="alert">
          <h2>Dịch vụ tạm thời không khả dụng</h2>
          <p>Không thể kết nối đến máy chủ lưu trữ tài liệu SOP/FAQ. Vui lòng thử lại sau.</p>
          <a href={returnTo} className="empty-state-btn btn-primary" style={{ display: 'inline-flex', marginTop: '.75rem' }}>
            Thử lại
          </a>
        </div>
      )}

      <div className="resource-controls">
        <form method="get" action="/portal/resources" className="resource-search-form" role="search">
          {currentType && <input type="hidden" name="type" value={currentType} />}
          <div className="resource-search-input-wrap">
            <label
              htmlFor="resource-search-input"
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              Tìm kiếm tài liệu
            </label>
            <input
              id="resource-search-input"
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Tìm theo tiêu đề, mã số hoặc nội dung..."
              aria-label="Tìm kiếm tài liệu"
            />
          </div>
          <button type="submit" className="resource-search-btn">
            Tìm kiếm
          </button>
        </form>

        <nav aria-label="Bộ lọc loại tài liệu" className="resource-filter-group">
          <a
            href={buildFilterHref()}
            className={`resource-filter-btn ${!currentType ? 'active' : ''}`}
            aria-current={!currentType ? 'page' : undefined}
          >
            Tất cả
          </a>
          <a
            href={buildFilterHref('sop')}
            className={`resource-filter-btn ${currentType === 'sop' ? 'active' : ''}`}
            aria-current={currentType === 'sop' ? 'page' : undefined}
          >
            SOP (Quy trình)
          </a>
          <a
            href={buildFilterHref('faq')}
            className={`resource-filter-btn ${currentType === 'faq' ? 'active' : ''}`}
            aria-current={currentType === 'faq' ? 'page' : undefined}
          >
            FAQ (Hỏi đáp)
          </a>
        </nav>
      </div>

      {!fetchError && resources.items.length === 0 && (
        <div className="empty-state" role="status">
          <h2>Không tìm thấy tài liệu phù hợp</h2>
          <p>
            {search || currentType
              ? 'Không có tài liệu nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.'
              : 'Hiện tại chưa có tài liệu nào được công bố.'}
          </p>
          <div className="empty-state-actions">
            {(search || currentType) && (
              <a href="/portal/resources" className="empty-state-btn btn-secondary">
                Xóa bộ lọc
              </a>
            )}
            <a href="/portal" className="empty-state-btn btn-primary">
              Quay lại Portal
            </a>
          </div>
        </div>
      )}

      {!fetchError && resources.items.length > 0 && (
        <>
          <div className="resource-count" aria-live="polite">
            Hiển thị {resources.items.length} tài liệu
            {resources.total > resources.items.length ? ` (tổng số ${resources.total})` : ''}
          </div>
          <ul className="resource-list" aria-label="Danh sách tài liệu">
            {resources.items.map((item) => (
              <li key={item.id} className="resource-card">
                <div className="resource-badges">
                  <span className={`badge ${item.type === 'sop' ? 'badge-sop' : 'badge-faq'}`}>
                    {item.type.toUpperCase()}
                  </span>
                  <span className="badge badge-effective">
                    <span className="badge-dot" aria-hidden="true"></span>
                    {item.statusLabel || 'Đang có hiệu lực'}
                  </span>
                  <span className="badge badge-version">v{item.version}</span>
                </div>
                <h2 className="resource-card-title">
                  <a href={`/portal/resources/${item.id}`}>{item.title}</a>
                </h2>
                <div style={{ fontSize: '.9rem', color: '#475467', marginBottom: '.35rem' }}>
                  Mã tài liệu: <strong>{item.code}</strong>
                </div>
                <p className="resource-card-summary">{item.summary}</p>
                <div className="resource-meta">
                  <span>
                    Ngày hiệu lực: <strong>{item.effectiveDate}</strong>
                  </span>
                  <span>
                    Người duyệt: <strong>{item.approverName}</strong>
                  </span>
                  {item.publishedAt && (
                    <span>
                      Công bố: <strong>{item.publishedAt.slice(0, 10)}</strong>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
