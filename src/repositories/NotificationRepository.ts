import { BaseRepository } from './base';

export class NotificationRepository extends BaseRepository {
  async findMany(recipient: string) {
    return this.db.notifications.findMany(recipient);
  }

  async createNotification(recipient: string, title: string, message: string) {
    return this.db.notifications.create({
      recipient,
      title,
      message
    });
  }

  async markRead(ids: number[]) {
    return this.db.notifications.markRead(ids);
  }
}
