import { BaseRepository } from './base';

export class ImportHistoryRepository extends BaseRepository {
  async findMany() {
    return this.db.importHistory.findMany();
  }

  async create(data: any) {
    return this.db.importHistory.create(data);
  }

  async clearAll() {
    return this.db.importHistory.clearAll();
  }
}
