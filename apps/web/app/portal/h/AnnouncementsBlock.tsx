'use client';

import { useState } from 'react';

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  scope: 'company' | 'group';
  target_group: string | null;
  published_at: string;
}

interface Props {
  initialData: AnnouncementItem[] | null;
  initialError: boolean;
  groups: string[];
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

export default function AnnouncementsBlock({ initialData, initialError, groups }: Props) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[] | null>(initialData);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function retry() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAnnouncements(data.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <section aria-labelledby="announcements-heading" className="portal-block announcements-block error-block">
        <h2 id="announcements-heading">Thông báo</h2>
        <p className="error-text">Không thể tải danh sách thông báo.</p>
        <button onClick={retry} disabled={loading} className="btn-primary retry-btn" type="button">
          {loading ? 'Đang thử lại...' : 'Thử lại'}
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="announcements-heading" className="portal-block announcements-block">
      <h2 id="announcements-heading">Thông báo</h2>
      {!announcements || announcements.length === 0 ? (
        <p className="empty-text">Hiện chưa có thông báo nào.</p>
      ) : (
        <div className="announcements-list">
          {announcements.map((a) => (
            <article key={a.id} className={`announcement-card scope-${a.scope}`}>
              <div className="announcement-header">
                <h3>{a.title}</h3>
                <span className="announcement-date">{formatDate(a.published_at)}</span>
              </div>
              <p className="announcement-body">{a.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
