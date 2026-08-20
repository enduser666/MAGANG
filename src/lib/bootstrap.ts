import { initializeNotifListenersForDb } from '@/services/NotificationService';
import { initializeActivityListenersForDb } from '@/services/ActivityFeedService';

const initializedDbs = new Set<string>();

export function bootstrapDbListeners(dbType: string, dbConfig: string | null) {
  const key = `${dbType}_${dbConfig || 'default'}`;
  if (!initializedDbs.has(key)) {
    initializeNotifListenersForDb(dbType, dbConfig);
    initializeActivityListenersForDb(dbType, dbConfig);
    initializedDbs.add(key);
  }
}
