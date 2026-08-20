import { LockRepository } from '@/repositories/LockRepository';
import { WorkflowRepository } from '@/repositories/WorkflowRepository';

export class PresenceService {
  private lockRepo: LockRepository;
  private workflowRepo: WorkflowRepository;

  constructor(dbType: string = 'sandbox', dbConfig: string | null = null) {
    this.lockRepo = new LockRepository(dbType, dbConfig);
    this.workflowRepo = new WorkflowRepository(dbType, dbConfig);
  }

  async getActiveLocks() {
    await this.lockRepo.deleteExpired();
    return this.lockRepo.findMany();
  }

  async acquireLock(tableName: string, recordId: number, username: string) {
    await this.lockRepo.deleteExpired();
    const existing = await this.lockRepo.findLock(tableName, recordId);
    
    if (existing) {
      if (existing.username.toLowerCase() !== username.toLowerCase()) {
        return {
          success: false,
          message: `Baris data ini sedang dikunci oleh pengguna: "${existing.username}"`,
          lock: existing
        };
      }
    }
    
    // Create or renew lock lease (duration: 60 seconds)
    const lock = await this.lockRepo.createLock(tableName, recordId, username, 60);
    return { success: true, lock };
  }

  async releaseLock(tableName: string, recordId: number, username: string) {
    const existing = await this.lockRepo.findLock(tableName, recordId);
    if (!existing) {
      return { success: true };
    }
    if (existing.username.toLowerCase() !== username.toLowerCase()) {
      return { success: false, message: 'Anda tidak memiliki hak untuk melepas kunci data ini.' };
    }
    await this.lockRepo.deleteLock(tableName, recordId);
    return { success: true };
  }

  async heartbeat(tableName: string, recordId: number, username: string) {
    await this.lockRepo.deleteExpired();
    const existing = await this.lockRepo.findLock(tableName, recordId);
    
    if (existing) {
      if (existing.username.toLowerCase() === username.toLowerCase()) {
        // Extend the lease by another 60 seconds
        const lock = await this.lockRepo.createLock(tableName, recordId, username, 60);
        return { success: true, lock };
      } else {
        return {
          success: false,
          message: `Kunci telah diambil alih oleh pengguna lain: "${existing.username}"`,
          lock: existing
        };
      }
    }
    
    // If no lock exists, attempt to acquire it dynamically
    const lock = await this.lockRepo.createLock(tableName, recordId, username, 60);
    return { success: true, lock };
  }

  async verifyLockForWrite(tableName: string, recordId: number, username: string): Promise<boolean> {
    await this.lockRepo.deleteExpired();
    const existing = await this.lockRepo.findLock(tableName, recordId);
    if (!existing) return true;
    return existing.username.toLowerCase() === username.toLowerCase();
  }

  async validateOptimisticVersion(tableName: string, recordId: number, submittedVersion: number) {
    const workflowInfo = await this.workflowRepo.getRecordWorkflowStatus(tableName, recordId);
    if (!workflowInfo) return { success: true }; // New records
    
    if (Number(workflowInfo.version) !== Number(submittedVersion)) {
      return {
        success: false,
        message: 'Konflik Pembaruan Data: Data ini telah diperbarui oleh pengguna lain di latar belakang. Silakan muat ulang halaman.',
        currentVersion: workflowInfo.version
      };
    }
    return { success: true, nextVersion: workflowInfo.version + 1 };
  }
}
