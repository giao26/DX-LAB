import { AnnouncementStore } from '../adapters/postgres/announcement-store.js';
import { toAnnouncementDTO, AnnouncementDTO } from '../domain/announcement.js';

export class ReadAnnouncementsUseCase {
  constructor(private readonly store: AnnouncementStore) {}
  
  async execute(groups: string[]): Promise<{ data: AnnouncementDTO[] }> {
    const announcements = await this.store.listByScope(groups);
    return { data: announcements.map(toAnnouncementDTO) };
  }
}
