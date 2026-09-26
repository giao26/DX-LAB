'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AnnouncementsBlock({ initialData, initialError }: Props) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[] | null>(initialData);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  async function retry() {
    setLoading(true);
    setStatusMessage('Đang thử lại…');
    try {
      const response = await fetch('/api/announcements');
      if (response.status === 401) {
        router.push('/bff/session/login?returnTo=%2Fportal%2Fh');
        return;
      }
      if (response.status === 403) {
        router.push('/bff/session/error?status=403');
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json() as { data: AnnouncementItem[] };
      setAnnouncements(data.data);
      setError(false);
      setStatusMessage(`Đã tải ${data.data.length} thông báo.`);
      headingRef.current?.focus();
    } catch {
      setError(true);
      setStatusMessage('Không thể tải thông báo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="announcements-heading" className="portal-block announcements-block">
      <h2 id="announcements-heading" ref={headingRef} tabIndex={-1}>Thông báo</h2>
      <p className="sr-only" role="status" aria-live="polite">{statusMessage}</p>
      {error ? (
        <div className="error-block">
          <p className="error-text" role="alert">Không thể tải thông báo.</p>
          {loading && <p>Đang thử lại…</p>}
          <button onClick={retry} disabled={loading} className="btn-primary retry-btn" type="button">
            {loading ? 'Đang thử lại…' : 'Thử lại'}
          </button>
        </div>
      ) : !announcements || announcements.length === 0 ? (
        <div>
          <p className="empty-text">Hiện chưa có thông báo nào.</p>
          <a href="/portal">Quay lại Portal</a>
        </div>
      ) : (
        <div className="announcements-list">
          {announcements.map((announcement) => (
            <article key={announcement.id} className={`announcement-card scope-${announcement.scope}`}>
              <div className="announcement-header">
                <h3>{announcement.title}</h3>
                <time className="announcement-date" dateTime={announcement.published_at}>
                  {formatDate(announcement.published_at)}
                </time>
              </div>
              <p className="announcement-body">{announcement.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
