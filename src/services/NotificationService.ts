import { NotificationRepository } from '@/repositories/NotificationRepository';
import { EventBus, BUSINESS_EVENTS } from '@/services/EventBus';

export class NotificationService {
  private notifRepo: NotificationRepository;

  constructor(dbType: string = 'sandbox', dbConfig: string | null = null) {
    this.notifRepo = new NotificationRepository(dbType, dbConfig);
  }

  // Set up subscribers to listen to EventBus and generate alerts
  public static initListeners(dbType: string = 'sandbox', dbConfig: string | null = null) {
    const eventBus = EventBus.getInstance();
    
    // Subscribe to APPROVAL_REQUESTED
    eventBus.subscribe(BUSINESS_EVENTS.APPROVAL_REQUESTED, async (payload: any) => {
      const service = new NotificationService(dbType, dbConfig);
      // Notify Itjen Auditors
      await service.notifRepo.createNotification(
        'Itjen Auditor',
        'Persetujuan Baru Diajukan',
        `Pengguna "${payload.requester}" mengajukan persetujuan untuk baris data ID ${payload.recordId} di tabel "${payload.tableName}".`
      );
      // Notify Administrator
      await service.notifRepo.createNotification(
        'admin',
        'Persetujuan Baru Diajukan',
        `Persetujuan baru diajukan oleh "${payload.requester}" pada tabel "${payload.tableName}" (ID: ${payload.recordId}).`
      );
    });

    // Subscribe to REVIEW_COMPLETED
    eventBus.subscribe(BUSINESS_EVENTS.REVIEW_COMPLETED, async (payload: any) => {
      const service = new NotificationService(dbType, dbConfig);
      const { tableName, recordId, actor, newState, record } = payload;
      const recipient = record.owner_username || 'admin';
      
      let title = 'Status Data Diperbarui';
      let message = `Status data ID ${recordId} di tabel "${tableName}" diubah menjadi "${newState}" oleh "${actor}".`;

      if (newState === 'Approved') {
        title = 'Data Disetujui';
        message = `Selamat! Pengajuan data Anda (ID: ${recordId}) di tabel "${tableName}" telah disetujui oleh "${actor}".`;
      } else if (newState === 'Revision Requested') {
        title = 'Revisi Diminta';
        message = `Data Anda (ID: ${recordId}) di tabel "${tableName}" memerlukan perbaikan. Silakan baca catatan peninjau dan submit kembali.`;
      }

      await service.notifRepo.createNotification(recipient, title, message);
    });

    // Subscribe to RECORD_CREATED
    eventBus.subscribe(BUSINESS_EVENTS.RECORD_CREATED, async (payload: any) => {
      const service = new NotificationService(dbType, dbConfig);
      // Notify admin
      await service.notifRepo.createNotification(
        'admin',
        'Data Baru Ditambahkan',
        `Pengguna "${payload.username}" memasukkan baris data baru ke tabel "${payload.tableName}" (ID: ${payload.recordId}).`
      );
    });
  }

  async listUserNotifications(recipient: string) {
    const specific = await this.notifRepo.findMany(recipient);
    // Also include role-based alerts for "Itjen Auditor" if role matches
    let roleAlerts: any[] = [];
    if (recipient.toLowerCase().includes('auditor') || recipient.toLowerCase().includes('itjen')) {
      roleAlerts = await this.notifRepo.findMany('Itjen Auditor');
    }
    
    const combined = [...specific, ...roleAlerts].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return combined;
  }

  async markRead(ids: number[]) {
    return this.notifRepo.markRead(ids);
  }
}

// Global registry cache to guarantee single listener registration per database configuration
const globalForNotifs = global as unknown as {
  initializedNotifDbs: Set<string>;
};

if (!globalForNotifs.initializedNotifDbs) {
  globalForNotifs.initializedNotifDbs = new Set();
}

export function initializeNotifListenersForDb(dbType: string, dbConfig: string | null) {
  const dbKey = `${dbType}_${dbConfig || 'default'}`;
  if (!globalForNotifs.initializedNotifDbs.has(dbKey)) {
    NotificationService.initListeners(dbType, dbConfig);
    globalForNotifs.initializedNotifDbs.add(dbKey);
  }
}
