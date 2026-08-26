import { BaseRepository } from './base';

export class ActivityRepository extends BaseRepository {
  async findMany(limit: number = 50) {
    return this.db.activityFeed.findMany(limit);
  }

  async createActivity(data: {
    eventType: string;
    actorUsername: string;
    actorFullName: string;
    targetTable: string;
    targetId: number;
    description: string;
  }) {
    return this.db.activityFeed.create(data);
  }
}
