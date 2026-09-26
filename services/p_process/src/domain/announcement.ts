export type AnnouncementScope = 'company' | 'group';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  scope: AnnouncementScope;
  target_group: string | null;
  published_at: string;
}

export interface AnnouncementDTO {
  id: string;
  title: string;
  body: string;
  scope: AnnouncementScope;
  target_group: string | null;
  published_at: string;
}

export function toAnnouncementDTO(a: Announcement): AnnouncementDTO {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    scope: a.scope,
    target_group: a.target_group,
    published_at: a.published_at,
  };
}
