import { BaseRepository } from './base';

export class AuditRepository extends BaseRepository {
  async findMany() {
    return this.db.auditLogs.findMany();
  }

  async create(data: {
    action: string;
    details: string;
    user: string;
    ipAddress?: string;
    status?: string;
  }) {
    return this.db.auditLogs.create(data);
  }

  async clearAll() {
    return this.db.auditLogs.clearAll();
  }
}
