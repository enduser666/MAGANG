import { BaseRepository } from './base';

export class ApprovalRepository extends BaseRepository {
  async findMany() {
    return this.db.approvals.findMany();
  }

  async findRequest(tableName: string, recordId: number) {
    return this.db.approvals.findRequest(tableName, recordId);
  }

  async findRequestById(id: number) {
    return this.db.approvals.findRequestById(id);
  }

  async createRequest(tableName: string, recordId: number, requester: string, comments?: string) {
    return this.db.approvals.create({
      tableName,
      recordId,
      requester,
      status: 'PENDING',
      comments
    });
  }

  async updateRequest(id: number, status: 'APPROVED' | 'REJECTED', reviewer: string, comments?: string) {
    return this.db.approvals.update(id, {
      status,
      reviewer,
      comments
    });
  }

  async appendRecordApprovalHistory(tableName: string, recordId: number, entry: {
    user: string;
    action: string;
    comments?: string;
    timestamp: string;
  }) {
    // Get existing record details
    const records = await this.db.findRecords(tableName, {
      where: { id: recordId }
    });
    if (records.data.length === 0) return;
    const r = records.data[0];
    
    let history: any[] = [];
    if (r.approval_history) {
      history = typeof r.approval_history === 'string' ? JSON.parse(r.approval_history) : r.approval_history;
    }
    
    history.push(entry);
    
    return this.db.updateRecord(tableName, recordId, {
      approval_history: JSON.stringify(history)
    });
  }
}
