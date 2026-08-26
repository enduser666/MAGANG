import { BaseRepository } from './base';

export class LockRepository extends BaseRepository {
  async findMany() {
    return this.db.presenceLocks.findMany();
  }

  async findLock(tableName: string, recordId: number) {
    return this.db.presenceLocks.findLock(tableName, recordId);
  }

  async createLock(tableName: string, recordId: number, username: string, durationSeconds: number = 60) {
    const lockedUntil = new Date(Date.now() + durationSeconds * 1000).toISOString();
    return this.db.presenceLocks.create({
      tableName,
      recordId,
      username,
      lockedUntil
    });
  }

  async deleteLock(tableName: string, recordId: number) {
    return this.db.presenceLocks.delete(tableName, recordId);
  }

  async deleteExpired() {
    return this.db.presenceLocks.deleteExpired();
  }
}
