import { ActivityRepository } from '@/repositories/ActivityRepository';
import { EventBus, BUSINESS_EVENTS } from '@/services/EventBus';

export class ActivityFeedService {
  private activityRepo: ActivityRepository;

  constructor(dbType: string = 'sandbox', dbConfig: string | null = null) {
    this.activityRepo = new ActivityRepository(dbType, dbConfig);
  }

  // Subscribes to the EventBus and logs high-level activity logs
  public static initListeners(dbType: string = 'sandbox', dbConfig: string | null = null) {
    const eventBus = EventBus.getInstance();

    // Subscribe to RECORD_CREATED
    eventBus.subscribe(BUSINESS_EVENTS.RECORD_CREATED, async (payload: any) => {
      const service = new ActivityFeedService(dbType, dbConfig);
      await service.activityRepo.createActivity({
        eventType: BUSINESS_EVENTS.RECORD_CREATED,
        actorUsername: payload.username,
        actorFullName: payload.username, // Fallback
        targetTable: payload.tableName,
        targetId: Number(payload.recordId),
        description: `Pengguna "${payload.username}" menambahkan baris data baru dengan ID ${payload.recordId} ke dalam tabel "${payload.tableName}".`
      });
    });

    // Subscribe to RECORD_UPDATED
    eventBus.subscribe(BUSINESS_EVENTS.RECORD_UPDATED, async (payload: any) => {
      const service = new ActivityFeedService(dbType, dbConfig);
      await service.activityRepo.createActivity({
        eventType: BUSINESS_EVENTS.RECORD_UPDATED,
        actorUsername: payload.username,
        actorFullName: payload.username,
        targetTable: payload.tableName,
        targetId: Number(payload.recordId),
        description: `Pengguna "${payload.username}" memperbarui data baris ID ${payload.recordId} di tabel "${payload.tableName}".`
      });
    });

    // Subscribe to RECORD_DELETED
    eventBus.subscribe(BUSINESS_EVENTS.RECORD_DELETED, async (payload: any) => {
      const service = new ActivityFeedService(dbType, dbConfig);
      await service.activityRepo.createActivity({
        eventType: BUSINESS_EVENTS.RECORD_DELETED,
        actorUsername: payload.username,
        actorFullName: payload.username,
        targetTable: payload.tableName,
        targetId: Number(payload.recordId),
        description: `Pengguna "${payload.username}" menghapus data baris ID ${payload.recordId} dari tabel "${payload.tableName}".`
      });
    });

    // Subscribe to REVIEW_COMPLETED
    eventBus.subscribe(BUSINESS_EVENTS.REVIEW_COMPLETED, async (payload: any) => {
      const service = new ActivityFeedService(dbType, dbConfig);
      const { tableName, recordId, actor, actorFullName, newState } = payload;
      
      let verb = 'mengubah status';
      if (newState === 'Approved') verb = 'menyetujui';
      else if (newState === 'Revision Requested') verb = 'meminta revisi pada';

      await service.activityRepo.createActivity({
        eventType: BUSINESS_EVENTS.REVIEW_COMPLETED,
        actorUsername: actor,
        actorFullName: actorFullName || actor,
        targetTable: tableName,
        targetId: Number(recordId),
        description: `Reviewer "${actorFullName || actor}" ${verb} pengajuan data baris ID ${recordId} di tabel "${tableName}".`
      });
    });
  }

  async listTimeline(limit = 50) {
    return this.activityRepo.findMany(limit);
  }
}

// Global registry cache to guarantee single listener registration per database configuration
const globalForActivity = global as unknown as {
  initializedActivityDbs: Set<string>;
};

if (!globalForActivity.initializedActivityDbs) {
  globalForActivity.initializedActivityDbs = new Set();
}

export function initializeActivityListenersForDb(dbType: string, dbConfig: string | null) {
  const dbKey = `${dbType}_${dbConfig || 'default'}`;
  if (!globalForActivity.initializedActivityDbs.has(dbKey)) {
    ActivityFeedService.initListeners(dbType, dbConfig);
    globalForActivity.initializedActivityDbs.add(dbKey);
  }
}
