/** Server-side client for scoped announcements owned by Process Core. */
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

export class AnnouncementsRequestError extends Error {
  constructor(public readonly status: number) {
    super(`Không thể tải thông báo (${status}).`);
  }
}

function getBaseUrl(): string {
  return process.env.P_PROCESS_BASE_URL ?? 'http://p-process:3000';
}

export async function fetchAnnouncements(accessToken: string): Promise<AnnouncementsResponse> {
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}/api/v1/announcements`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new AnnouncementsRequestError(503);
  }

  if (!response.ok) {
    const status = [401, 403, 503].includes(response.status) ? response.status : 503;
    throw new AnnouncementsRequestError(status);
  }

  return (await response.json()) as AnnouncementsResponse;
}
