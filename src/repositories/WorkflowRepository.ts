import { BaseRepository } from './base';

export class WorkflowRepository extends BaseRepository {
  async getRecordWorkflowStatus(tableName: string, recordId: number) {
    const records = await this.db.findRecords(tableName, {
      where: { id: recordId }
    });
    if (records.data.length === 0) return null;
    const r = records.data[0];
    return {
      status: r.workflow_status || 'Draft',
      version: Number(r.record_version || 1),
      owner: r.owner_username || 'admin',
      lockedBy: r.locked_by || null,
      lockedUntil: r.locked_until || null,
      approvalStatus: r.approval_status || 'DRAFT',
      approvalHistory: r.approval_history ? (typeof r.approval_history === 'string' ? JSON.parse(r.approval_history) : r.approval_history) : []
    };
  }

  async updateWorkflowStatus(tableName: string, recordId: number, status: string, approvalStatus?: string) {
    const updateData: any = { workflow_status: status };
    if (approvalStatus) {
      updateData.approval_status = approvalStatus;
    }
    return this.db.updateRecord(tableName, recordId, updateData);
  }

  async updateVersion(tableName: string, recordId: number, newVersion: number) {
    return this.db.updateRecord(tableName, recordId, {
      record_version: newVersion
    });
  }
}
