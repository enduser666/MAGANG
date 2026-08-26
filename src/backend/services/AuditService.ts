import { AuditRepository } from '@/repositories/AuditRepository';

export class AuditService {
  private auditRepo: AuditRepository;

  constructor(dbType: string = 'sandbox', dbConfig: string | null = null) {
    this.auditRepo = new AuditRepository(dbType, dbConfig);
  }

  async listAuditLogs() {
    return this.auditRepo.findMany();
  }

  async writeLog(data: {
    action: string;
    details: string;
    user: string;
    ipAddress?: string;
    status?: string;
  }) {
    return this.auditRepo.create(data);
  }

  async clearAuditLogs() {
    return this.auditRepo.clearAll();
  }
}
