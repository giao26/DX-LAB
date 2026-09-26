/**
 * DX-LAB Web BFF - Announcements Data Fetching Client
 * Fetches scoped internal announcements from P core service.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

export interface Announcement {
  id: string;
  title: string;
  body: string;
  scope: 'company' | 'group';
  target_group: string | null;
  published_at: string;
}

export interface AnnouncementsResponse {
  data: Announcement[];
}

function getBaseUrl(): string {
  return process.env.P_PROCESS_BASE_URL ?? 'http://p-process:3000';
}

export async function fetchAnnouncements(
  accessToken: string,
  groups: string[] = []
): Promise<AnnouncementsResponse> {
  const url = new URL(`${getBaseUrl()}/api/v1/announcements`);
  if (groups.length > 0) {
    url.searchParams.set('groups', groups.join(','));
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch announcements: ${res.status}`);
    }

    return (await res.json()) as AnnouncementsResponse;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Không thể kết nối đến máy chủ dịch vụ.');
  }
}
